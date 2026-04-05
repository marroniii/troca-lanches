-- Schema alinhado ao backend Node (usuarios, interessados, trocas.a_id/b_id, etc.)
-- Execute no SQL Editor do Supabase ANTES de rodar a API.
-- O arquivo 00-init-database.sql é um modelo antigo (tabela users, JSON em propostas) e NÃO corresponde ao código atual.
--
-- Se você viu erro "column dono_id does not exist": já existia uma tabela public.lanches
-- (ou outra) com estrutura diferente. CREATE TABLE IF NOT EXISTS não altera tabelas velhas;
-- o bloco abaixo remove só essas tabelas do app e recria do zero (APAGA DADOS nelas).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS public.mensagens CASCADE;
DROP TABLE IF EXISTS public.trocas CASCADE;
DROP TABLE IF EXISTS public.interessados CASCADE;
DROP TABLE IF EXISTS public.propostas CASCADE;
DROP TABLE IF EXISTS public.lanches CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

-- Usuários do app (login nome+local gera UUID no servidor)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY,
  nome TEXT NOT NULL,
  local TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lanches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  foto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lanche_id UUID NOT NULL REFERENCES public.lanches(id) ON DELETE CASCADE,
  dono_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'aberta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.interessados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  entrega TEXT NOT NULL,
  mensagens JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proposta_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS public.trocas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  a_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  b_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  lanche_id UUID NOT NULL REFERENCES public.lanches(id) ON DELETE CASCADE,
  entrega TEXT,
  reacoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  comentarios JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  remetente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  interessado_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lanches_dono ON public.lanches(dono_id);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas(status);
CREATE INDEX IF NOT EXISTS idx_interessados_proposta ON public.interessados(proposta_id);
CREATE INDEX IF NOT EXISTS idx_trocas_ab ON public.trocas(a_id, b_id);
