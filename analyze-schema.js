/**
 * Script detalhado para analisar estrutura das tabelas no Supabase
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTableStructure(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      return null;
    }

    // Pega as colunas
    const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
    return columns;
  } catch (e) {
    return null;
  }
}

async function getTableCount(tableName) {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    return error ? 0 : (count || 0);
  } catch (e) {
    return 0;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         ANÁLISE DETALHADA DO SCHEMA - SUPABASE             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Tabelas do schema LEGADO
  console.log('🔴 SCHEMA LEGADO (obsoleto):');
  const legacyTables = ['users', 'propostas', 'lanches', 'trocas', 'audit_logs'];
  for (const table of legacyTables) {
    const columns = await analyzeTableStructure(table);
    const count = await getTableCount(table);
    if (columns) {
      console.log(`   ✓ ${table} (${count} registros)`);
      console.log(`     Colunas: ${columns.join(', ')}`);
    }
  }

  console.log('\n🟢 SCHEMA CORRETO (atual):');
  const correctTables = ['usuarios', 'propostas', 'interessados', 'lanches', 'trocas', 'mensagens'];
  for (const table of correctTables) {
    const columns = await analyzeTableStructure(table);
    const count = await getTableCount(table);
    if (columns) {
      console.log(`   ✓ ${table} (${count} registros)`);
      console.log(`     Colunas: ${columns.join(', ')}`);
    }
  }

  console.log('\n\n📊 DIAGNÓSTICO:');
  
  const legacyCount = await getTableCount('users');
  const correctCount = await getTableCount('usuarios');
  
  if (legacyCount > 0 && correctCount > 0) {
    console.log('⚠️  CONFLITO: Ambos os schemas estão presentes!');
    console.log(`   - Schema legado (users): ${legacyCount} registros`);
    console.log(`   - Schema correto (usuarios): ${correctCount} registros`);
    console.log('\n💡 Opções:');
    console.log('   1. Se dados em "users" não importam: rodar schema correto (apaga "users")');
    console.log('      node apply-correct-schema.js');
    console.log('   2. Fazer backup manual via Supabase antes de apagar');
  } else if (correctCount > 0) {
    console.log('✅ Schema correto detectado e funcionando');
    console.log(`   - usuarios: ${correctCount} registros`);
    if (legacyCount === 0) {
      console.log('   - Nenhum schema legado');
    }
  } else if (legacyCount > 0) {
    console.log('🔴 Apenas schema legado detectado');
    console.log(`   - users: ${legacyCount} registros`);
    console.log('   ⚠️  Isso pode causar problemas! Considere migrar para o schema correto');
  } else {
    console.log('❌ Nenhum dado encontrado nos schemas');
    console.log('   Execute: node apply-correct-schema.js');
  }

  console.log('\n');
}

main().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
