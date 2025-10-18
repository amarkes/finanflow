import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Profile {
  id: string;
  user_id: string;
  is_staff: boolean;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: inserted, error: insertError } = await supabase
            .from('profiles')
            .insert([{ user_id: user.id }])
            .select()
            .single();

          if (insertError) throw insertError;
          return inserted as Profile;
        }

        throw error;
      }

      return data as Profile;
    },
    staleTime: 60_000,
  });
}

