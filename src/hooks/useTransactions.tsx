import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import type { AccountType } from '@/hooks/useAccounts';
import {
  calculateInstallments,
  generateMonthlyDates,
  generateSeriesId,
  MONTHLY_OCCURRENCES,
  RecurrenceType,
} from '@/lib/transactions';
import { format, parseISO } from 'date-fns';

export interface TransactionCategoryReference {
  name: string;
  color: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount_cents: number;
  date: string;
  description: string;
  account_id: string | null;
  category_id: string | null;
  payment_method: string | null;
  notes: string | null;
  is_paid: boolean;
  series_amount_total_cents: number | null;
  series_id: string | null;
  series_sequence: number | null;
  series_total: number | null;
  series_type: RecurrenceType;
  created_at: string;
  categories?: TransactionCategoryReference | null;
  account?: {
    id: string;
    name: string;
    type: AccountType;
    limit_cents: number | null;
    balance_cents: number | null;
  } | null;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
  categoryId?: string;
  accountId?: string;
  search?: string;
  status?: 'paid' | 'pending';
  seriesType?: RecurrenceType;
}

type BaseTransactionFields = {
  type: 'income' | 'expense';
  amount_cents: number;
  date: string;
  description: string;
  account_id?: string | null;
  category_id?: string | null;
  payment_method?: string | null;
  notes?: string | null;
  is_paid: boolean;
};

export interface CreateTransactionInput extends BaseTransactionFields {
  recurrence_type: RecurrenceType;
  installments_count?: number;
}

type TransactionUpdatePayload = Partial<
  BaseTransactionFields & {
    series_amount_total_cents?: number | null;
  }
>;

export interface TransactionUpdateInput extends TransactionUpdatePayload {
  id: string;
  applyMode?: 'single' | 'series_from_here';
  seriesMeta?: {
    series_id: string | null;
    series_sequence: number | null;
  };
}

export interface DeleteTransactionInput {
  id: string;
  mode?: 'single' | 'series_from_here';
  seriesMeta?: {
    series_id: string | null;
    series_sequence: number | null;
  };
}

export interface CloneTransactionInput {
  sourceId: string;
  date: string;
  isPaid: boolean;
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, categories(name, color), account:account_id(id, name, type, limit_cents, balance_cents)')
        .order('date', { ascending: false })
        .order('series_sequence', { ascending: true, nullsFirst: true });

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.accountId) {
        query = query.eq('account_id', filters.accountId);
      }
      if (filters?.status) {
        const isPaid = filters.status === 'paid';
        query = query.eq('is_paid', isPaid);
      }
      if (filters?.seriesType) {
        query = query.eq('series_type', filters.seriesType);
      }
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Transaction[];
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: CreateTransactionInput) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const commonPayload = {
        type: transaction.type,
        description: transaction.description,
        category_id: transaction.category_id ?? null,
        payment_method: transaction.payment_method ?? null,
        account_id: transaction.account_id ?? null,
        notes: transaction.notes ?? null,
        is_paid: transaction.is_paid,
        user_id: user.id,
      };

      const records: Array<typeof commonPayload & {
        amount_cents: number;
        date: string;
        series_type: RecurrenceType;
        series_id: string | null;
        series_sequence: number;
        series_total: number;
        series_amount_total_cents: number;
      }> = [];

      if (transaction.recurrence_type === 'single') {
        records.push({
          ...commonPayload,
          amount_cents: transaction.amount_cents,
          date: transaction.date,
          series_type: 'single',
          series_id: null,
          series_sequence: 1,
          series_total: 1,
          series_amount_total_cents: transaction.amount_cents,
        });
      }

      if (transaction.recurrence_type === 'installment') {
        if (!transaction.installments_count || transaction.installments_count < 2) {
          throw new Error('Informe uma quantidade de parcelas válida (mínimo 2).');
        }

        const seriesId = generateSeriesId();
        const baseDate = parseISO(transaction.date);

        if (Number.isNaN(baseDate.getTime())) {
          throw new Error('Data inicial inválida para parcelas.');
        }

        const installmentDates = generateMonthlyDates(baseDate, transaction.installments_count);
        const installmentValues = calculateInstallments(
          transaction.amount_cents,
          transaction.installments_count
        );

        installmentValues.forEach((value, index) => {
          records.push({
            ...commonPayload,
            amount_cents: value,
            date: format(installmentDates[index], 'yyyy-MM-dd'),
            series_type: 'installment',
            series_id: seriesId,
            series_sequence: index + 1,
            series_total: transaction.installments_count!,
            series_amount_total_cents: transaction.amount_cents,
          });
        });
      }

      if (transaction.recurrence_type === 'monthly') {
        const baseDate = parseISO(transaction.date);

        if (Number.isNaN(baseDate.getTime())) {
          throw new Error('Data inicial inválida para recorrência mensal.');
        }

        const seriesId = generateSeriesId();
        const occurrences = MONTHLY_OCCURRENCES;
        const totalSeriesAmount = transaction.amount_cents * occurrences;
        const monthlyDates = generateMonthlyDates(baseDate, occurrences);

        monthlyDates.forEach((date, index) => {
          records.push({
            ...commonPayload,
            amount_cents: transaction.amount_cents,
            date: format(date, 'yyyy-MM-dd'),
            series_type: 'monthly',
            series_id: seriesId,
            series_sequence: index + 1,
            series_total: occurrences,
            series_amount_total_cents: totalSeriesAmount,
          });
        });
      }

      if (records.length === 0) {
        throw new Error('Tipo de lançamento inválido.');
      }

      const { data, error } = await supabase
        .from('transactions')
        .insert(records)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (variables.recurrence_type === 'single') {
        toast.success('Transação criada com sucesso!');
        return;
      }

      if (variables.recurrence_type === 'installment') {
        toast.success(`${variables.installments_count} parcelas criadas com sucesso!`);
        return;
      }

      toast.success('Recorrência mensal criada para os próximos 12 meses!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Erro ao criar transação';
      toast.error(message);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, applyMode = 'single', seriesMeta, ...transaction }: TransactionUpdateInput) => {
      const payload: Record<string, unknown> = { ...transaction };

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });

      let query = supabase.from('transactions').update(payload);

      if (applyMode === 'series_from_here' && seriesMeta?.series_id) {
        query = query.eq('series_id', seriesMeta.series_id);
        if (seriesMeta.series_sequence != null) {
          query = query.gte('series_sequence', seriesMeta.series_sequence);
        }
      } else {
        query = query.eq('id', id);
      }

      const { data, error } =
        applyMode === 'series_from_here'
          ? await query.select()
          : await query.select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (variables.applyMode === 'series_from_here') {
        toast.success('Série atualizada com sucesso!');
        return;
      }

      toast.success('Transação atualizada com sucesso!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Erro ao atualizar transação';
      toast.error(message);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, mode = 'single', seriesMeta }: DeleteTransactionInput) => {
      let query = supabase.from('transactions').delete();

      if (mode === 'series_from_here' && seriesMeta?.series_id) {
        query = query.eq('series_id', seriesMeta.series_id);
        if (seriesMeta.series_sequence != null) {
          query = query.gte('series_sequence', seriesMeta.series_sequence);
        }
      } else {
        query = query.eq('id', id);
      }

      const { error } = await query;

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (variables.mode === 'series_from_here') {
        toast.success('Série de transações removida com sucesso!');
        return;
      }

      toast.success('Transação excluída com sucesso!');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error && error.message ? error.message : 'Erro ao excluir transação';
      toast.error(message);
    },
  });
}

export function useCloneTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ sourceId, date, isPaid }: CloneTransactionInput) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      if (!date) {
        throw new Error('Informe uma data válida para clonar a transação.');
      }

      const { data: transaction, error } = await supabase
        .from('transactions')
        .select(
          'id, type, amount_cents, description, account_id, category_id, payment_method, notes, is_paid'
        )
        .eq('id', sourceId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      if (!transaction) {
        throw new Error('Transação não encontrada.');
      }

      const { error: insertError } = await supabase
        .from('transactions')
        .insert({
          type: transaction.type,
          amount_cents: transaction.amount_cents,
          date,
          description: transaction.description,
          account_id: transaction.account_id,
          category_id: transaction.category_id,
          payment_method: transaction.payment_method,
          notes: transaction.notes,
          is_paid: isPaid,
          user_id: user.id,
          series_type: 'single',
          series_id: null,
          series_sequence: 1,
          series_total: 1,
          series_amount_total_cents: transaction.amount_cents,
        })
        .select()
        .single();

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação clonada com sucesso!');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Erro ao clonar transação';
      toast.error(message);
    },
  });
}
