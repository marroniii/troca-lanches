/**
 * Script para verificar e analisar as RLS policies no Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function getPolicies() {
  try {
    // Query direto ao pg_policies
    const { data, error } = await supabase.rpc('get_policies', {});
    
    if (error && error.code !== 'PGRST102') {
      console.log('Tentando alternativa de consulta...\n');
    }

    // Alternativa: listar policies por tabela
    const tables = ['usuarios', 'lanches', 'propostas', 'interessados', 'trocas', 'mensagens'];
    const allPolicies = {};

    for (const table of tables) {
      try {
        // Tenta fazer uma query para ver se há policies (vai falhar se houver RLS restritiva)
        const { data, error, status } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        allPolicies[table] = {
          hasRLS: status === 406 ? 'checked' : 'unknown',
          accessible: !error,
          error: error?.message
        };
      } catch (e) {
        allPolicies[table] = {
          hasRLS: 'unknown',
          accessible: false,
          error: e.message
        };
      }
    }

    return allPolicies;
  } catch (e) {
    console.error('Erro:', e.message);
    return null;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           ANÁLISE DE RLS POLICIES - SUPABASE               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('📋 Testando acessibilidade das tabelas...\n');

  const policies = await getPolicies();

  if (!policies) {
    console.log('❌ Erro ao obter informações de policies\n');
    return;
  }

  // Mostrar status de cada tabela
  for (const [table, info] of Object.entries(policies)) {
    const accessible = info.accessible ? '✅' : '🔒';
    console.log(`${accessible} ${table.padEnd(15)} - ${info.accessible ? 'Acessível' : 'Bloqueada/RLS Ativa'}`);
    if (info.error) {
      console.log(`   └─ ${info.error}`);
    }
  }

  console.log('\n\n📊 RECOMENDAÇÕES DE RLS:\n');

  console.log('🟢 TABELAS PÚBLICAS (sem restrição):');
  console.log('   - lanches (listar tudo, criar/editar/deletar apenas do dono)');
  console.log('   - propostas (listar tudo, editar apenas do dono)');
  console.log('   - trocas (listar tudo, criar quando matched)');
  console.log('   - interessados (ver apenas da proposta relevante)');

  console.log('\n🔴 TABELAS PRIVADAS (precisa estar autenticado):');
  console.log('   - usuarios (ver apenas próprio perfil)');
  console.log('   - mensagens (ver apenas as suas mensagens)');

  console.log('\n\n💡 STATUS ATUAL:');
  const allAccessible = Object.values(policies).every(p => p.accessible);
  
  if (allAccessible) {
    console.log('⚠️  Todas as tabelas estão PÚBLICAS/SEM RLS');
    console.log('   Isso é OK para desenvolvimento, mas PERIGOSO para produção!');
    console.log('\n   Para aplicar RLS, execute:');
    console.log('   → node apply-rls-policies.js\n');
  } else {
    console.log('✅ RLS policies estão ativas em algumas tabelas');
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
