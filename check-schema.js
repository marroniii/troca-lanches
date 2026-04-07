/**
 * Script para verificar qual schema está rodando no Supabase
 * e aplicar o correto se necessário
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Faltam variáveis de ambiente (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_ANON_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Verificando schema no Supabase...\n');

  try {
    // Tentar verificar tabelas usando uma query simples
    // As tabelas-chave que tentamos acessar
    const testTables = ['usuarios', 'users', 'lanches', 'propostas', 'interessados', 'trocas', 'mensagens'];
    const foundTables = [];

    for (const tableName of testTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          foundTables.push(tableName);
        }
      } catch (e) {
        // Tabela não existe, continua
      }
    }

    if (foundTables.length === 0) {
      console.log('📊 Nenhuma tabela conhecida encontrada\n');
      return [];
    }

    console.log('📊 Tabelas encontradas no schema public:');
    foundTables.sort().forEach(t => console.log(`  - ${t}`));
    console.log();

    return foundTables;
  } catch (err) {
    console.error('❌ Erro:', err.message);
    return null;
  }
}

async function identifySchema(tableNames) {
  if (!tableNames || tableNames.length === 0) {
    console.log('⚠️  Schema vazio - nenhuma tabela encontrada\n');
    return 'empty';
  }

  // Schema legado: users, propostas, lanches, trocas (sem interessados)
  const legacyTables = ['users', 'propostas', 'lanches', 'trocas'];
  const isLegacy = legacyTables.every(t => tableNames.includes(t)) && !tableNames.includes('usuarios');

  // Schema novo: usuarios, propostas, lanches, trocas, interessados, mensagens
  const newTables = ['usuarios', 'propostas', 'lanches', 'trocas', 'interessados', 'mensagens'];
  const isNew = newTables.every(t => tableNames.includes(t));

  if (isLegacy) {
    console.log('🔴 Schema LEGADO detectado (tables: users, propostas, lanches, trocas)');
    console.log('   ⚠️  Este schema está DESATUALIZADO e não corresponde ao código atual!\n');
    return 'legacy';
  }

  if (isNew) {
    console.log('🟢 Schema CORRETO detectado (tables: usuarios, propostas, interessados, lanches, trocas, mensagens)');
    console.log('   ✅ Backend pode rodar normalmente!\n');
    return 'correct';
  }

  console.log('🟡 Schema DESCONHECIDO - não corresponde aos padrões esperados\n');
  return 'unknown';
}

async function applyCorrectSchema() {
  console.log('\n📝 Aplicando o schema correto...\n');

  try {
    const sqlPath = path.join(__dirname, 'scripts', 'schema-troca-lanches-backend.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Dividir por blocos (;) e executar cada um
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📋 Executando ${statements.length} statements SQL...\n`);

    // Usar a API do Supabase para executar SQL raw
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      // Tentar alternativa: executar via rpc (se disponível)
      console.log('⚠️  Método RPC não disponível. Tentando via fetch direto...\n');
      
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    console.log('✅ Schema aplicado com sucesso!\n');
    return true;
  } catch (err) {
    console.error('❌ Erro ao aplicar schema:', err.message);
    console.log('\n💡 Alternativa: Execute manualmente no Supabase SQL Editor:');
    console.log('   1. Acesse: https://app.supabase.com/');
    console.log('   2. Menu: SQL Editor → New Query');
    console.log('   3. Cole conteúdo de: scripts/schema-troca-lanches-backend.sql');
    console.log('   4. Clique: RUN\n');
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         VERIFICADOR DE SCHEMA - SUPABASE TROCA LANCHES     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const tableNames = await checkSchema();
  const schemaType = await identifySchema(tableNames);

  if (schemaType === 'correct') {
    console.log('✅ Tudo pronto! Execute com: npm run dev\n');
    process.exit(0);
  }

  if (schemaType === 'empty') {
    console.log('❓ Precisa criar o schema?\n');
    const apply = process.argv.includes('--apply');
    if (apply) {
      await applyCorrectSchema();
    } else {
      console.log('💡 Execute com flag --apply para criar o schema:');
      console.log('   node check-schema.js --apply\n');
    }
    process.exit(0);
  }

  if (schemaType === 'legacy') {
    console.log('❓ Deseja substituir o schema legado pelo correto?\n');
    const apply = process.argv.includes('--apply');
    if (apply) {
      console.log('⚠️  AVISO: Isso vai APAGAR as tabelas legadas e criar as novas!\n');
      const confirmed = process.argv.includes('--confirm');
      if (!confirmed) {
        console.log('💡 Execute com flag --confirm para confirmar:');
        console.log('   node check-schema.js --apply --confirm\n');
        process.exit(0);
      }
      await applyCorrectSchema();
    } else {
      console.log('💡 Execute com flags para aplicar:');
      console.log('   node check-schema.js --apply --confirm\n');
    }
    process.exit(0);
  }

  console.log('❓ Schema desconhecido - verifique manualmente.\n');
  process.exit(1);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
