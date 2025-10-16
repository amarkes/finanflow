-- Criar tabela de perfis de usuários
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Usuários podem ver seu próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para criar perfil automaticamente ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Criar tabela de categorias
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  color text DEFAULT '#6B7280',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies para categories
CREATE POLICY "Usuários podem ver suas próprias categorias"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias categorias"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias categorias"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias categorias"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Criar tabela de transações
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense')),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  payment_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies para transactions
CREATE POLICY "Usuários podem ver suas próprias transações"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias transações"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias transações"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias transações"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Criar índices para melhor performance
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(date DESC);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- Inserir categorias padrão (seeds) - função para ser executada por usuário
CREATE OR REPLACE FUNCTION public.create_default_categories()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Categorias de receita
  INSERT INTO public.categories (user_id, name, type, color)
  VALUES 
    (auth.uid(), 'Salário', 'income', '#10B981'),
    (auth.uid(), 'Freelance', 'income', '#059669'),
    (auth.uid(), 'Investimentos', 'income', '#34D399');
  
  -- Categorias de despesa
  INSERT INTO public.categories (user_id, name, type, color)
  VALUES 
    (auth.uid(), 'Alimentação', 'expense', '#EF4444'),
    (auth.uid(), 'Transporte', 'expense', '#F59E0B'),
    (auth.uid(), 'Moradia', 'expense', '#8B5CF6'),
    (auth.uid(), 'Lazer', 'expense', '#EC4899'),
    (auth.uid(), 'Saúde', 'expense', '#06B6D4');
END;
$$;