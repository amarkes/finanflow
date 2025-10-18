import { Fragment } from "react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AuditActionType } from "@/hooks/useAuditLogs";

interface LogDiffProps {
  action: AuditActionType;
  changes: Record<string, unknown> | null;
  className?: string;
}

const HIDDEN_FIELDS = new Set([
  "id",
  "user_id",
  "created_at",
  "updated_at",
  "series_id",
  "series_sequence",
  "series_total",
  "series_amount_total_cents",
  "meta",
  "changes",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

export function LogDiff({ action, changes, className }: LogDiffProps) {
  if (!changes || !isObject(changes)) {
    return null;
  }

  if ("after" in changes && isObject(changes.after)) {
    const fields = Object.entries(changes.after).filter(
      ([key]) => !HIDDEN_FIELDS.has(key),
    );

    if (fields.length === 0) return null;

    return (
      <div className={cn("space-y-2 rounded-md border bg-muted/40 p-3", className)}>
        <p className="text-xs font-medium uppercase text-muted-foreground">
          Dados registrados
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map(([key, value]) => (
            <div key={key} className="space-y-1 rounded-md bg-background/80 p-2 text-sm">
              <p className="text-xs uppercase text-muted-foreground">{key}</p>
              <p className="font-medium text-foreground break-words">
                {formatValue(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if ("before" in changes && isObject(changes.before)) {
    const fields = Object.entries(changes.before).filter(
      ([key]) => !HIDDEN_FIELDS.has(key),
    );

    if (fields.length === 0) return null;

    return (
      <div className={cn("space-y-2 rounded-md border bg-destructive/5 p-3", className)}>
        <p className="text-xs font-medium uppercase text-destructive">
          Registro removido
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map(([key, value]) => (
            <div key={key} className="space-y-1 rounded-md bg-background/90 p-2 text-sm">
              <p className="text-xs uppercase text-muted-foreground">{key}</p>
              <p className="font-medium text-foreground break-words">
                {formatValue(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const diffEntries = Object.entries(changes).filter(
    ([key, value]) =>
      !HIDDEN_FIELDS.has(key) &&
      isObject(value) &&
      "from" in value &&
      "to" in value,
  ) as Array<[string, { from: unknown; to: unknown }]>;

  if (action === "updated" && diffEntries.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2 rounded-md border bg-muted/40 p-3", className)}>
      <p className="text-xs font-medium uppercase text-muted-foreground">
        Campos alterados
      </p>
      <div className="space-y-3">
        {diffEntries.map(([field, value], index) => (
          <Fragment key={field}>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-background/80 p-2 text-sm">
                <p className="text-xs uppercase text-muted-foreground">{field}</p>
                <p className="font-medium text-muted-foreground break-words">
                  {formatValue(value.from)}
                </p>
                <span className="text-xs text-muted-foreground/80">Anterior</span>
              </div>
              <div className="rounded-md bg-background p-2 text-sm">
                <p className="text-xs uppercase text-muted-foreground">{field}</p>
                <p className="font-medium text-foreground break-words">
                  {formatValue(value.to)}
                </p>
                <span className="text-xs text-muted-foreground/80">Atual</span>
              </div>
            </div>
            {index < diffEntries.length - 1 && <Separator />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

