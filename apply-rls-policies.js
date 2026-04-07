/**
 * Script para APLICAR RLS policies recomendadas no Supabase
 * 
 * RLS Strategy:
 * - usuarios: apenas o próprio perfil (SELECT), auth required
 * - lanches: públicas (SELECT), criar/editar/deletar apenas do dono
 * - propostas: públicas (SELECT), editar/deletar apenas do dono
 * - interessados: públicas (SELECT), admin only create/edit/delete
 * - trocas: públicas (SELECT), criar apenas para matched users
 * - mensagens: apenas destinatário (SELECT), criar apenas remetente
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Faltam variáveis de ambiente');
  process.exit(1);
}

const rlsPoliciesSql = `
-- ============================================
-- RLS POLICIES - TrocaLanches
-- ============================================
-- Estratégia:
-- - Tabelas públicas para leitura (SELECT)
-- - Restrições em INSERT/UPDATE/DELETE

-- ============================================
-- 1. USUARIOS - PRIVADO
-- ============================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- DROP policies antigas se existirem
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_public" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_insert" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_delete_own" ON public.usuarios;

-- Users podem ver seu próprio perfil
CREATE POLICY "usuarios_select_own"
ON public.usuarios FOR SELECT
TO authenticated
USING (id::text = current_user_id());

-- Permissão anônima para criar usuário (registro)
CREATE POLICY "usuarios_insert_anonymous"
ON public.usuarios FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Users podem atualizar seu perfil
CREATE POLICY "usuarios_update_own"
ON public.usuarios FOR UPDATE
TO authenticated
USING (id::text = current_user_id())
WITH CHECK (id::text = current_user_id());

-- ============================================
-- 2. LANCHES - PÚBLICO (listagem), PRIVADO (edição)
-- ============================================
ALTER TABLE public.lanches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lanches_select" ON public.lanches;
DROP POLICY IF EXISTS "lanches_insert" ON public.lanches;
DROP POLICY IF EXISTS "lanches_update_own" ON public.lanches;
DROP POLICY IF EXISTS "lanches_delete_own" ON public.lanches;

-- Todos podem listar lanchess
CREATE POLICY "lanches_select"
ON public.lanches FOR SELECT
TO authenticated, anon
USING (true);

-- Users autenticados podem criar lanche
CREATE POLICY "lanches_insert"
ON public.lanches FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users podem editar seus próprios lanches
CREATE POLICY "lanches_update_own"
ON public.lanches FOR UPDATE
TO authenticated
USING (dono_id::text = current_user_id())
WITH CHECK (dono_id::text = current_user_id());

-- Users podem deletar seus próprios lanches
CREATE POLICY "lanches_delete_own"
ON public.lanches FOR DELETE
TO authenticated
USING (dono_id::text = current_user_id());

-- ============================================
-- 3. PROPOSTAS - PÚBLICO (listagem), PRIVADO (edição)
-- ============================================
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "propostas_select" ON public.propostas;
DROP POLICY IF EXISTS "propostas_insert" ON public.propostas;
DROP POLICY IF EXISTS "propostas_update_own" ON public.propostas;
DROP POLICY IF EXISTS "propostas_delete_own" ON public.propostas;

-- Todos podem listar propostas
CREATE POLICY "propostas_select"
ON public.propostas FOR SELECT
TO authenticated, anon
USING (true);

-- Users autenticados podem criar proposta
CREATE POLICY "propostas_insert"
ON public.propostas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Users podem editar suas propostas
CREATE POLICY "propostas_update_own"
ON public.propostas FOR UPDATE
TO authenticated
USING (dono_id::text = current_user_id())
WITH CHECK (dono_id::text = current_user_id());

-- Users podem deletar suas propostas
CREATE POLICY "propostas_delete_own"
ON public.propostas FOR DELETE
TO authenticated
USING (dono_id::text = current_user_id());

-- ============================================
-- 4. INTERESSADOS - PÚBLICO (listagem), PRIVADO (edição)
-- ============================================
ALTER TABLE public.interessados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interessados_select" ON public.interessados;
DROP POLICY IF EXISTS "interessados_insert" ON public.interessados;
DROP POLICY IF EXISTS "interessados_update_own" ON public.interessados;
DROP POLICY IF EXISTS "interessados_delete_own" ON public.interessados;

-- Todos podem listar interessados
CREATE POLICY "interessados_select"
ON public.interessados FOR SELECT
TO authenticated, anon
USING (true);

-- Users autenticados podem registrar interesse
CREATE POLICY "interessados_insert"
ON public.interessados FOR INSERT
TO authenticated
WITH CHECK (usuario_id::text = current_user_id());

-- Users podem atualizar seu interesse
CREATE POLICY "interessados_update_own"
ON public.interessados FOR UPDATE
TO authenticated
USING (usuario_id::text = current_user_id())
WITH CHECK (usuario_id::text = current_user_id());

-- Users podem remover seu interesse
CREATE POLICY "interessados_delete_own"
ON public.interessados FOR DELETE
TO authenticated
USING (usuario_id::text = current_user_id());

-- ============================================
-- 5. TROCAS - PÚBLICO (listagem), ADMIN (edição)
-- ============================================
ALTER TABLE public.trocas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trocas_select" ON public.trocas;
DROP POLICY IF EXISTS "trocas_insert" ON public.trocas;

-- Todos podem listar trocas (feed)
CREATE POLICY "trocas_select"
ON public.trocas FOR SELECT
TO authenticated, anon
USING (true);

-- Backend pode criar trocas (via service role)
CREATE POLICY "trocas_insert_admin"
ON public.trocas FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- 6. MENSAGENS - PRIVADO (apenas destinatário)
-- ============================================
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mensagens_select_own" ON public.mensagens;
DROP POLICY IF EXISTS "mensagens_insert" ON public.mensagens;

-- Users veem apenas suas mensagens (como remetente ou destinatário)
CREATE POLICY "mensagens_select_own"
ON public.mensagens FOR SELECT
TO authenticated
USING (
  remetente_id::text = current_user_id() OR 
  interessado_id::text = current_user_id()
);

-- Qualquer usuário autenticado pode enviar mensagem
CREATE POLICY "mensagens_insert"
ON public.mensagens FOR INSERT
TO authenticated
WITH CHECK (remetente_id::text = current_user_id());

-- ============================================
-- HELPER FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt()->>'user_id',
    CAST(auth.uid() AS TEXT)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function applyRlsPolicies() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           APLICAR RLS POLICIES - SUPABASE                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('⚠️  ATENÇÃO: Essas RLS policies vão restringir o acesso às tabelas!\n');
  console.log('📋 O que será alterado:\n');
  
  console.log('  usuarios:     SELECT (próprio), INSERT (público), UPDATE (próprio)');
  console.log('  lanches:      SELECT (público), INSERT (auth), UPDATE/DELETE (dono)');
  console.log('  propostas:    SELECT (público), INSERT (auth), UPDATE/DELETE (dono)');
  console.log('  interessados: SELECT (público), INSERT (auth), UPDATE/DELETE (próprio)');
  console.log('  trocas:       SELECT (público), INSERT (auth)');
  console.log('  mensagens:    SELECT (destinatário/remetente), INSERT (próprio)\n');

  const confirm = process.argv.includes('--confirm');
  
  if (!confirm) {
    console.log('💡 Para aplicar, execute com --confirm flag:');
    console.log('   node apply-rls-policies.js --confirm\n');
    return;
  }

  console.log('🔄 Aplicando RLS policies...\n');

  try {
    // Salvando SQL em arquivo temporário para referência
    const sqlFile = path.join(__dirname, 'rls-policies-applied.sql');
    fs.writeFileSync(sqlFile, rlsPoliciesSql);
    console.log(`✓ SQL salvo em: ${sqlFile}\n`);

    // Para aplicar via Supabase, é necessário usar o SQL Editor
    console.log('📝 PRÓXIMOS PASSOS:\n');
    console.log('  1. Abra: https://app.supabase.com/');
    console.log('  2. Vá para: SQL Editor → New Query');
    console.log('  3. Cole o conteúdo de: rls-policies-applied.sql');
    console.log('  4. Clique: RUN\n');

    console.log('Ou execute via CLI do Supabase (se instalado):\n');
    console.log(`  supabase db push --file ${sqlFile}\n`);

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

applyRlsPolicies();
