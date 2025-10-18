import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export type CommunityFeedbackType = 'suggestion' | 'issue';
export type CommunityFeedbackStatus = 'pending' | 'reviewing' | 'done' | 'rejected';

export interface CommunityFeedback {
  id: string;
  user_id: string;
  type: CommunityFeedbackType;
  title: string;
  description: string;
  status: CommunityFeedbackStatus;
  staff_response: string | null;
  created_at: string;
  updated_at: string;
}

const COMMUNITY_FEEDBACK_TABLE = 'community_feedback';

export function useCommunityChangelog() {
  return useQuery({
    queryKey: ['community-feedback', 'changelog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(COMMUNITY_FEEDBACK_TABLE)
        .select('*')
        .eq('status', 'done')
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as CommunityFeedback[];
    },
  });
}

interface UseMyCommunityFeedbackOptions {
  enabled?: boolean;
}

export function useMyCommunityFeedback(options?: UseMyCommunityFeedbackOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['community-feedback', 'mine', user?.id],
    enabled: Boolean(user?.id) && (options?.enabled ?? true),
    queryFn: async () => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from(COMMUNITY_FEEDBACK_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []) as CommunityFeedback[];
    },
  });
}

interface CommunityFeedbackFilters {
  status?: CommunityFeedbackStatus | 'all';
  type?: CommunityFeedbackType | 'all';
}

export function useAllCommunityFeedback(filters: CommunityFeedbackFilters | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['community-feedback', 'all', filters],
    enabled,
    queryFn: async () => {
      let query = supabase.from(COMMUNITY_FEEDBACK_TABLE).select('*').order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []) as CommunityFeedback[];
    },
  });
}

interface CreateCommunityFeedbackInput {
  type: CommunityFeedbackType;
  title: string;
  description: string;
}

export function useCreateCommunityFeedback() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommunityFeedbackInput) => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const payload = {
        user_id: user.id,
        type: input.type,
        title: input.title,
        description: input.description,
        status: 'pending' as CommunityFeedbackStatus,
      };

      const { data, error } = await supabase
        .from(COMMUNITY_FEEDBACK_TABLE)
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data as CommunityFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['community-feedback', 'changelog'] });
      toast.success('Sua contribuição foi enviada com sucesso. Obrigado por ajudar a comunidade!');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Não foi possível enviar a contribuição. Tente novamente.';
      toast.error(message);
    },
  });
}

interface UpdateCommunityFeedbackInput {
  id: string;
  status: CommunityFeedbackStatus;
  staff_response?: string | null;
}

export function useUpdateCommunityFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, staff_response }: UpdateCommunityFeedbackInput) => {
      const { data, error } = await supabase
        .from(COMMUNITY_FEEDBACK_TABLE)
        .update({
          status,
          staff_response: staff_response ?? null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as CommunityFeedback;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['community-feedback', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['community-feedback', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['community-feedback', 'changelog'] });
      toast.success('Feedback atualizado com sucesso.');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Não foi possível atualizar o feedback. Tente novamente.';
      toast.error(message);
    },
  });
}
