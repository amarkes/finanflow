-- Cria enum para controlar o tipo de série de transações
DO $$
BEGIN
  CREATE TYPE transaction_series_type AS ENUM ('single', 'installment', 'monthly');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Adiciona colunas relacionadas a recorrências/parcelas
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS series_type transaction_series_type NOT NULL DEFAULT 'single',
  ADD COLUMN IF NOT EXISTS series_id uuid NULL,
  ADD COLUMN IF NOT EXISTS series_sequence integer NULL,
  ADD COLUMN IF NOT EXISTS series_total integer NULL,
  ADD COLUMN IF NOT EXISTS series_amount_total_cents integer NULL;

-- Índices auxiliares
CREATE INDEX IF NOT EXISTS idx_transactions_series_id
  ON public.transactions (series_id);

CREATE INDEX IF NOT EXISTS idx_transactions_series_type
  ON public.transactions (series_type);

-- Normaliza dados existentes
UPDATE public.transactions
SET
  series_sequence = COALESCE(series_sequence, 1),
  series_total = COALESCE(series_total, 1),
  series_amount_total_cents = COALESCE(series_amount_total_cents, amount_cents)
WHERE series_type = 'single';
