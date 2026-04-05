-- ============================================
-- AVISO: modelo legado (users, propostas.interessados JSONB, trocas.usuario_a_id…).
-- O backend atual usa: scripts/schema-troca-lanches-backend.sql
-- ============================================
-- TrocaLanches - Database Initialization (legado)
-- Execute no Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  local TEXT NOT NULL,
  foto_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = auth_id);

-- ============================================
-- 2. LANCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.lanches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dono_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  foto_url TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.lanches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all lanches" ON public.lanches
  FOR SELECT USING (true);

CREATE POLICY "Users can create lanches" ON public.lanches
  FOR INSERT WITH CHECK (auth.uid() = (SELECT auth_id FROM public.users WHERE id = dono_id));

CREATE POLICY "Users can update own lanches" ON public.lanches
  FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = dono_id));

CREATE POLICY "Users can delete own lanches" ON public.lanches
  FOR DELETE USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = dono_id));

CREATE INDEX IF NOT EXISTS idx_lanches_dono ON public.lanches(dono_id);

-- ============================================
-- 3. PROPOSTAS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lanche_id UUID NOT NULL REFERENCES public.lanches(id) ON DELETE CASCADE,
  dono_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'aberta' CHECK (status IN ('aberta', 'aceita', 'rejeitada')),
  interessados JSONB DEFAULT '[]'::jsonb,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all propostas" ON public.propostas
  FOR SELECT USING (true);

CREATE POLICY "Users can update own propostas" ON public.propostas
  FOR UPDATE USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = dono_id));

CREATE POLICY "Users can delete own propostas" ON public.propostas
  FOR DELETE USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = dono_id));

CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas(status);
CREATE INDEX IF NOT EXISTS idx_propostas_lanche ON public.propostas(lanche_id);
CREATE INDEX IF NOT EXISTS idx_propostas_dono ON public.propostas(dono_id);

-- ============================================
-- 4. TROCAS TABLE (Feed)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trocas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_a_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  usuario_b_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lanche_id UUID NOT NULL REFERENCES public.lanches(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  entrega TEXT, -- 'motoboy', 'deslocamento'
  mensagem TEXT,
  reacoes JSONB DEFAULT '{}'::jsonb, -- {"usuario_id": "emoji", ...}
  comentarios JSONB DEFAULT '[]'::jsonb, -- [{usuario_id, text, timestamp}, ...]
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.trocas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all trocas" ON public.trocas
  FOR SELECT USING (true);

CREATE POLICY "Only participants can update trocas" ON public.trocas
  FOR UPDATE USING (
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = usuario_a_id) OR 
    auth.uid() = (SELECT auth_id FROM public.users WHERE id = usuario_b_id)
  );

CREATE INDEX IF NOT EXISTS idx_trocas_usuarios ON public.trocas(usuario_a_id, usuario_b_id);
CREATE INDEX IF NOT EXISTS idx_trocas_criado ON public.trocas(criado_em DESC);

-- ============================================
-- 5. AUDIT TABLE (Optional - para rastreamento)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tabela TEXT NOT NULL,
  acao TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  dados_antigos JSONB,
  dados_novos JSONB,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = (SELECT auth_id FROM public.users WHERE id = usuario_id));

-- ============================================
-- 6. TRIGGERS para UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lanches_updated_at BEFORE UPDATE ON public.lanches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_propostas_updated_at BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trocas_updated_at BEFORE UPDATE ON public.trocas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. Storage para FOTOS (Bucket)
-- ============================================
-- Criar bucket 'lanches-fotos' via Dashboard Supabase UI
-- Depois execute:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('lanches-fotos', 'lanches-fotos', true);
-- 
-- Política de acesso:
-- - Qualquer um can view
-- - Autenticados podem fazer upload
-- - Só o owner pode deletar
