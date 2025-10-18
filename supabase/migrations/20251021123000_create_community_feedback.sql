-- Cria enums para tipo e status das contribuições comunitárias
DO $$
BEGIN
  CREATE TYPE public.community_feedback_type AS ENUM ('suggestion', 'issue');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.community_feedback_status AS ENUM ('pending', 'reviewing', 'done');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Garante função utilitária para atualizar a coluna updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Cria tabela de feedback da comunidade
CREATE TABLE IF NOT EXISTS public.community_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  type public.community_feedback_type NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  status public.community_feedback_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_community_feedback_status
  ON public.community_feedback (status);

CREATE INDEX IF NOT EXISTS idx_community_feedback_created_at
  ON public.community_feedback (created_at DESC);

-- Trigger para manter updated_at sempre atualizado
DROP TRIGGER IF EXISTS trg_community_feedback_updated_at ON public.community_feedback;
CREATE TRIGGER trg_community_feedback_updated_at
  BEFORE UPDATE ON public.community_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Ativa RLS e define políticas básicas
ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir contribuições em seu próprio nome
DROP POLICY IF EXISTS "Users insert own feedback" ON public.community_feedback;
CREATE POLICY "Users insert own feedback"
  ON public.community_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem visualizar suas próprias contribuições
DROP POLICY IF EXISTS "Users view own feedback" ON public.community_feedback;
CREATE POLICY "Users view own feedback"
  ON public.community_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Qualquer usuário autenticado pode visualizar o changelog público (status = done)
DROP POLICY IF EXISTS "Public changelog entries" ON public.community_feedback;
CREATE POLICY "Public changelog entries"
  ON public.community_feedback
  FOR SELECT
  USING (status = 'done');

