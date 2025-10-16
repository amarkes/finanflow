-- Cria tabela de contas e integrações com transações

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (
    type IN (
      'credit_card',
      'debit_card',
      'cash',
      'pix',
      'boleto',
      'food_voucher',
      'transfer',
      'ewallet',
      'bank_account'
    )
  ),
  limit_cents integer,
  balance_cents integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_type ON public.accounts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_accounts_is_active ON public.accounts(user_id, is_active);

DROP POLICY IF EXISTS "Usuários podem ver suas próprias contas" ON public.accounts;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias contas" ON public.accounts;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias contas" ON public.accounts;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias contas" ON public.accounts;

CREATE POLICY "Usuários podem ver suas próprias contas"
  ON public.accounts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias contas"
  ON public.accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias contas"
  ON public.accounts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias contas"
  ON public.accounts
  FOR DELETE
  USING (auth.uid() = user_id);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);

DROP POLICY IF EXISTS "Usuários podem ver suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias transações" ON public.transactions;
DROP POLICY IF EXISTS "Usuários podem deletar suas próprias transações" ON public.transactions;

CREATE POLICY "Usuários podem ver suas próprias transações"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar suas próprias transações"
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      account_id IS NULL
      OR account_id IN (
        SELECT id FROM public.accounts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem atualizar suas próprias transações"
  ON public.transactions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      account_id IS NULL
      OR account_id IN (
        SELECT id FROM public.accounts WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Usuários podem deletar suas próprias transações"
  ON public.transactions
  FOR DELETE
  USING (auth.uid() = user_id);
