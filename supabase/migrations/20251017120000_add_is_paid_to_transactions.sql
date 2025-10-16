-- Adiciona coluna de status de pagamento às transações
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS is_paid boolean NOT NULL DEFAULT false;

-- Índice para consultas filtrando por status
CREATE INDEX IF NOT EXISTS idx_transactions_is_paid
ON public.transactions (is_paid);
