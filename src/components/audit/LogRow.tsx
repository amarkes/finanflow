import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { AuditLogWithMeta } from "@/hooks/useAuditLogs";
import { LogDiff } from "./LogDiff";
import { CirclePlus, PenSquare, Trash2 } from "lucide-react";

interface LogRowProps {
  log: AuditLogWithMeta;
  showEntityBadge?: boolean;
  className?: string;
}

const ACTION_META: Record<
  AuditLogWithMeta["action"],
  { label: string; icon: typeof CirclePlus; badge: "default" | "secondary" | "destructive" }
> = {
  created: { label: "Criado", icon: CirclePlus, badge: "default" },
  updated: { label: "Atualizado", icon: PenSquare, badge: "secondary" },
  deleted: { label: "Removido", icon: Trash2, badge: "destructive" },
};

const ENTITY_LABEL: Record<AuditLogWithMeta["entity_type"], string> = {
  transaction: "Transação",
  category: "Categoria",
  account: "Conta",
};

export function LogRow({ log, showEntityBadge = false, className }: LogRowProps) {
  const { user } = useAuth();
  const actionConfig = ACTION_META[log.action];
  const Icon = actionConfig.icon;
  const actorLabel =
    log.actorName ??
    (log.user_id && user?.id === log.user_id ? "Você" : log.user_id ?? "Sistema");

  const createdAt = format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
    locale: ptBR,
  });

  return (
    <div className={cn("space-y-3 rounded-lg border bg-card p-4 shadow-sm", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={actionConfig.badge}>{actionConfig.label}</Badge>
              {showEntityBadge && (
                <Badge variant="outline">{ENTITY_LABEL[log.entity_type]}</Badge>
              )}
            </div>
            <p className="text-sm font-medium text-foreground">
              {log.message ?? "Ação registrada sem descrição"}
            </p>
            <p className="text-xs text-muted-foreground">
              Por {actorLabel}
              {log.ownerName ? ` • Dono: ${log.ownerName}` : null}
            </p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{createdAt}</span>
      </div>

      <LogDiff action={log.action} changes={log.changes} />
    </div>
  );
}

