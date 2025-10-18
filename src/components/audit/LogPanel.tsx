import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LogRow } from "./LogRow";
import { useEntityAuditLogs } from "@/hooks/useAuditLogs";
import type { AuditEntityType } from "@/hooks/useAuditLogs";
import { AlertCircle } from "lucide-react";

interface LogPanelProps {
  entityType: AuditEntityType;
  entityId: string;
  className?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

export function LogPanel({
  entityType,
  entityId,
  className,
  title = "Histórico de alterações",
  description = "Veja as ações registradas automaticamente para este item.",
  emptyMessage = "Nenhuma alteração registrada até o momento.",
}: LogPanelProps) {
  const {
    data: logs,
    isLoading,
    isFetching,
    error,
  } = useEntityAuditLogs(entityType, entityId);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || isFetching ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : null}

        {!isLoading && !isFetching && error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>Não foi possível carregar os logs. Tente novamente mais tarde.</span>
          </div>
        ) : null}

        {!isLoading && !isFetching && !error && logs && logs.length > 0 ? (
          <div className="space-y-3">
            {logs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        ) : null}

        {!isLoading && !isFetching && !error && (!logs || logs.length === 0) ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

