import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RecurrenceType } from '@/lib/transactions';

interface CreditCardInstallmentRecord {
  account_id: string;
  amount_cents: number;
  date: string;
  is_paid: boolean;
  series_type: RecurrenceType;
}

export interface CreditCardInstallmentsSummary {
  accountId: string;
  futureAmountCents: number;
  remainingInstallments: number;
}

interface CreditCardInstallmentsParams {
  accountIds: string[];
  cutoffDate?: string;
}

export function useCreditCardInstallmentsSummary({
  accountIds,
  cutoffDate,
}: CreditCardInstallmentsParams) {
  return useQuery({
    queryKey: [
      'credit-card-installments-summary',
      accountIds.slice().sort(),
      cutoffDate ?? null,
    ],
    enabled: accountIds.length > 0,
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('account_id, amount_cents, date, is_paid, series_type')
        .in('account_id', accountIds)
        .eq('type', 'expense')
        .eq('is_paid', false);

      if (cutoffDate) {
        query = query.gt('date', cutoffDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      const normalized = (data ?? []) as CreditCardInstallmentRecord[];
      const aggregated = new Map<string, CreditCardInstallmentsSummary>();

      normalized.forEach((transaction) => {
        const current = aggregated.get(transaction.account_id) ?? {
          accountId: transaction.account_id,
          futureAmountCents: 0,
          remainingInstallments: 0,
        };

        current.futureAmountCents += transaction.amount_cents;
        if (transaction.series_type === 'installment') {
          current.remainingInstallments += 1;
        }

        aggregated.set(transaction.account_id, current);
      });

      return accountIds.map((accountId) => {
        const dataForAccount = aggregated.get(accountId);
        return (
          dataForAccount ?? {
            accountId,
            futureAmountCents: 0,
            remainingInstallments: 0,
          }
        );
      });
    },
  });
}

