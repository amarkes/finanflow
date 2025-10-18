-- Adiciona coluna de staff e campos auxiliares à tabela existente de perfis
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_staff boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Função utilitária para manter updated_at sincronizado
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Atualiza registros existentes garantindo valores padrão
UPDATE public.profiles
SET
  is_staff = COALESCE(is_staff, false),
  updated_at = COALESCE(updated_at, created_at);

-- Garante que todo usuário autenticado possua perfil (caso o trigger não tenha sido executado)
INSERT INTO public.profiles (user_id, full_name)
SELECT au.id, COALESCE(au.raw_user_meta_data->>'full_name', 'Usuário')
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.id IS NULL;

-- Atualiza enum de status de feedback para incluir 'rejected'
DO $$
BEGIN
  ALTER TYPE public.community_feedback_status ADD VALUE IF NOT EXISTS 'rejected';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

-- Campo para resposta da equipe
ALTER TABLE public.community_feedback
  ADD COLUMN IF NOT EXISTS staff_response text;

-- Policies para permitir moderação por usuários staff
ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON public.community_feedback;
CREATE POLICY "Users insert own feedback"
  ON public.community_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own feedback" ON public.community_feedback;
CREATE POLICY "Users view own feedback"
  ON public.community_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public changelog entries" ON public.community_feedback;
CREATE POLICY "Public changelog entries"
  ON public.community_feedback
  FOR SELECT
  USING (status = 'done');

DROP POLICY IF EXISTS "Staff view all feedback" ON public.community_feedback;
CREATE POLICY "Staff view all feedback"
  ON public.community_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_staff = true
    )
  );

DROP POLICY IF EXISTS "Staff update feedback" ON public.community_feedback;
CREATE POLICY "Staff update feedback"
  ON public.community_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_staff = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND p.is_staff = true
    )
  );

