import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, FilterX } from "lucide-react";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import type { AuditActionType, AuditEntityType } from "@/hooks/useAuditLogs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/useProfile";
import { LogRow } from "@/components/audit/LogRow";
import { cn } from "@/lib/utils";

const ENTITY_OPTIONS: Array<{ value: "all" | AuditEntityType; label: string }> = [
  { value: "all", label: "Todas as entidades" },
  { value: "transaction", label: "Transações" },
  { value: "category", label: "Categorias" },
  { value: "account", label: "Contas" },
];

const ACTION_OPTIONS: Array<{ value: "all" | AuditActionType; label: string }> = [
  { value: "all", label: "Todas as ações" },
  { value: "created", label: "Criados" },
  { value: "updated", label: "Atualizados" },
  { value: "deleted", label: "Removidos" },
];

export default function AuditLogsPage() {
  const [entityType, setEntityType] = useState<"all" | AuditEntityType>("all");
  const [actionType, setActionType] = useState<"all" | AuditActionType>("all");
  const [search, setSearch] = useState("");
  const [userId, setUserId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { data: profile } = useProfile();
  const isStaff = profile?.is_staff ?? false;

  useEffect(() => {
    if (!isStaff && userId) {
      setUserId("");
    }
  }, [isStaff, userId]);

  const filters = useMemo(() => {
    return {
      entityType: entityType === "all" ? undefined : entityType,
      action: actionType === "all" ? undefined : actionType,
      userId: isStaff && userId.trim() ? userId.trim() : undefined,
      search: search.trim() ? search.trim() : undefined,
      startDate: startDate ? `${startDate}T00:00:00Z` : undefined,
      endDate: endDate ? `${endDate}T23:59:59Z` : undefined,
    };
  }, [entityType, actionType, search, userId, startDate, endDate, isStaff]);

  const { data, isLoading, isFetching, error } = useAuditLogs(filters);

  const handleClearFilters = () => {
    setEntityType("all");
    setActionType("all");
    setSearch("");
    if (isStaff) {
      setUserId("");
    }
    setStartDate("");
    setEndDate("");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Logs de Auditoria</h1>
            <p className="text-muted-foreground">
              Acompanhe todas as alterações realizadas em transações, categorias e contas.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Refine a lista de logs por tipo de entidade, ação ou período.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={cn(
                "grid gap-4",
                isStaff ? "lg:grid-cols-5" : "lg:grid-cols-4",
              )}
            >
              <Select value={entityType} onValueChange={(value: "all" | AuditEntityType) => setEntityType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Entidade" />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionType} onValueChange={(value: "all" | AuditActionType) => setActionType(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Ação" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isStaff && (
                <Input
                  placeholder="Filtrar por usuário (UUID)"
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  className="w-full"
                />
              )}

              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full"
              />

              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Input
                placeholder="Buscar por mensagem"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="w-full sm:w-auto"
              >
                <FilterX className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>
                {data?.length ? (
                  <span>
                    {data.length} registro{data.length !== 1 ? "s" : ""} encontrados.
                  </span>
                ) : (
                  "Nenhum registro encontrado para os filtros selecionados."
                )}
              </CardDescription>
            </div>
            {entityType !== "all" && (
              <Badge variant="outline">{ENTITY_OPTIONS.find((item) => item.value === entityType)?.label}</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {(isLoading || isFetching) && (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            )}

            {!isLoading && !isFetching && error ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Não foi possível carregar os logs. Tente novamente mais tarde.</span>
              </div>
            ) : null}

            {!isLoading && !isFetching && !error && data && data.length > 0 ? (
              <div className="space-y-3">
                {data.map((log) => (
                  <LogRow key={log.id} log={log} showEntityBadge />
                ))}
              </div>
            ) : null}

            {!isLoading && !isFetching && !error && (!data || data.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                Ajuste os filtros ou realize novas ações para gerar registros de auditoria.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
