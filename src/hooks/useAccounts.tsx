import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return message;
    }
  }

  if (typeof error === 'string') {
    return error;
  }

  return '';
}

export type AccountType =
  | 'credit_card'
  | 'debit_card'
  | 'cash'
  | 'pix'
  | 'boleto'
  | 'food_voucher'
  | 'transfer'
  | 'ewallet'
  | 'bank_account';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  limit_cents: number | null;
  balance_cents: number | null;
  is_active: boolean;
  created_at: string;
}

interface AccountsFilter {
  type?: AccountType;
  isActive?: boolean;
}

export function useAccounts(filter?: AccountsFilter) {
  return useQuery({
    queryKey: ['accounts', filter],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .order('name');

      if (filter?.type) {
        query = query.eq('type', filter.type);
      }

      if (filter?.isActive !== undefined) {
        query = query.eq('is_active', filter.isActive);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Account[];
    },
  });
}

type AccountInput = {
  name: string;
  type: AccountType;
  limit_cents?: number | null;
  balance_cents?: number | null;
  is_active?: boolean;
};

export function useCreateAccount() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (account: AccountInput) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const payload = {
        ...account,
        limit_cents: account.limit_cents ?? null,
        balance_cents: account.balance_cents ?? null,
        is_active: account.is_active ?? true,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('accounts')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta criada com sucesso!');
    },
    onError: (error) => {
      const message = getErrorMessage(error) || 'Erro ao criar conta';
      toast.error(message);
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...account }: Partial<AccountInput> & { id: string }) => {
      const payload: Record<string, unknown> = {
        ...account,
      };

      if (payload.limit_cents === undefined) {
        delete payload.limit_cents;
      }

      if (payload.balance_cents === undefined) {
        delete payload.balance_cents;
      }

      if (payload.is_active === undefined) {
        delete payload.is_active;
      }

      const { data, error } = await supabase
        .from('accounts')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta atualizada com sucesso!');
    },
    onError: (error) => {
      const message = getErrorMessage(error) || 'Erro ao atualizar conta';
      toast.error(message);
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Conta excluída com sucesso!');
    },
    onError: (error) => {
      const message = getErrorMessage(error) || 'Erro ao excluir conta';
      toast.error(message);
    },
  });
}
