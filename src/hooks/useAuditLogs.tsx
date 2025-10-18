import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AuditEntityType = 'transaction' | 'category' | 'account';
export type AuditActionType = 'created' | 'updated' | 'deleted';

export interface AuditLog {
  id: string;
  entity_type: AuditEntityType;
  entity_id: string;
  action: AuditActionType;
  user_id: string | null;
  message: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

export interface AuditLogWithMeta extends AuditLog {
  actorName?: string | null;
  ownerName?: string | null;
  ownerId?: string | null;
}

export interface AuditLogFilters {
  entityType?: AuditEntityType;
  entityId?: string;
  action?: AuditActionType;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

function mapAuditLog(record: AuditLog): AuditLogWithMeta {
  const meta = record.meta ?? {};
  const actorName =
    typeof meta === 'object' && meta !== null && 'actor_name' in meta
      ? (meta.actor_name as string | null)
      : null;
  const ownerName =
    typeof meta === 'object' && meta !== null && 'owner_name' in meta
      ? (meta.owner_name as string | null)
      : null;
  const ownerId =
    typeof meta === 'object' && meta !== null && 'owner_id' in meta
      ? (meta.owner_id as string | null)
      : null;

  return {
    ...record,
    actorName,
    ownerName,
    ownerId,
  };
}

export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters.entityId) {
        query = query.eq('entity_id', filters.entityId);
      }

      if (filters.action) {
        query = query.eq('action', filters.action);
      }

      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters.search) {
        query = query.ilike('message', `%${filters.search}%`);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data ?? []).map((item) => mapAuditLog(item as AuditLog));
    },
  });
}

interface EntityAuditOptions {
  enabled?: boolean;
}

export function useEntityAuditLogs(
  entityType: AuditEntityType | undefined,
  entityId: string | undefined,
  options?: EntityAuditOptions,
) {
  return useQuery({
    queryKey: ['audit-logs', entityType, entityId],
    enabled:
      Boolean(entityType && entityId) && (options?.enabled ?? true),
    queryFn: async () => {
      if (!entityType || !entityId) return [];

      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((item) => mapAuditLog(item as AuditLog));
    },
  });
}

