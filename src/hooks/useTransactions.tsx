import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface Transaction {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  amount_cents: number;
  date: string;
  description: string;
  category_id: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  type?: 'income' | 'expense';
  categoryId?: string;
  search?: string;
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*, categories(name, color)')
        .order('date', { ascending: false });

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
      if (filters?.search) {
        query = query.ilike('description', `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const payload = {
        ...transaction,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([payload as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar transação');
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...transaction }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(transaction)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar transação');
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao excluir transação');
    },
  });
}
