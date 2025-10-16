import { useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTransactions } from "@/hooks/useTransactions";
import { useAccounts } from "@/hooks/useAccounts";
import { AccountsCard } from "@/components/accounts/AccountsCard";
import { formatCentsToBRL, formatDate } from "@/lib/currency";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";
import {
  format,
  startOfDay,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

type PeriodOption = "current" | "last" | "all" | "today" | "custom";

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodOption>("current");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [appliedRange, setAppliedRange] = useState<DateRange | undefined>();
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const [customHasOpened, setCustomHasOpened] = useState(false);
  const [previousPeriod, setPreviousPeriod] = useState<PeriodOption>("current");

  // Calcular datas do período
  const { startDate, endDate, startDateObj, endDateObj } = useMemo(() => {
    const now = startOfDay(new Date());
    let start: Date | undefined;
    let end: Date | undefined;

    switch (period) {
      case "today":
        start = now;
        end = now;
        break;
      case "current":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "last":
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case "custom":
        if (appliedRange?.from && appliedRange?.to) {
          start = startOfDay(appliedRange.from);
          end = startOfDay(appliedRange.to);
        }
        break;
      case "all":
      default:
        start = undefined;
        end = undefined;
    }

    return {
      startDate: start ? format(start, "yyyy-MM-dd") : undefined,
      endDate: end ? format(end, "yyyy-MM-dd") : undefined,
      startDateObj: start,
      endDateObj: end,
    };
  }, [period, appliedRange]);

  const { data: transactions, isLoading } = useTransactions({
    startDate,
    endDate,
  });
  const { data: accounts } = useAccounts({ isActive: true });

  const periodLabel = useMemo(() => {
    if (startDateObj && endDateObj) {
      const formattedStart = format(startDateObj, "dd/MM/yyyy");
      const formattedEnd = format(endDateObj, "dd/MM/yyyy");
      return `Período: ${formattedStart} → ${formattedEnd}`;
    }

    if (period === "all") {
      return "Período: Todos";
    }

    return null;
  }, [startDateObj, endDateObj, period]);

  const handleApplyCustomRange = () => {
    if (!customRange?.from || !customRange?.to) {
      toast.error("Selecione uma data inicial e final.");
      return;
    }
    setAppliedRange(customRange);
    setPeriod("custom");
    setPreviousPeriod("custom");
    setIsCustomOpen(false);
    setCustomHasOpened(false);
  };

  const handleCancelCustomRange = () => {
    setIsCustomOpen(false);
    setCustomRange(appliedRange);
    if (!appliedRange?.from || !appliedRange?.to) {
      setPeriod(previousPeriod);
    }
    setCustomHasOpened(false);
  };

  const handleResetFilters = () => {
    setPeriod("all");
    setAppliedRange(undefined);
    setCustomRange(undefined);
    setPreviousPeriod("all");
    setIsCustomOpen(false);
    setCustomHasOpened(false);
  };

  const handlePeriodChange = (value: PeriodOption) => {
    if (value === "custom") {
      setPreviousPeriod(period);
      setPeriod("custom");
      setCustomRange(
        appliedRange ?? {
          from: startOfDay(new Date()),
          to: startOfDay(new Date()),
        }
      );
      setIsCustomOpen(true);
      setCustomHasOpened(false);
      return;
    }

    setPeriod(value);
    setPreviousPeriod(value);
    setAppliedRange(undefined);
    setCustomRange(undefined);
  };

  // Calcular totais
  const stats = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, balance: 0 };

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount_cents, 0);

    const expense = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount_cents, 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  const pendingCount = useMemo(() => {
    if (!transactions) return 0;
    return transactions.filter((t) => !t.is_paid).length;
  }, [transactions]);

  // Últimas 5 transações
  const recentTransactions = transactions?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das suas finanças
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Select
              value={period}
              onValueChange={(value) =>
                handlePeriodChange(value as PeriodOption)
              }
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="current">Mês Atual</SelectItem>
                <SelectItem value="last">Mês Anterior</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="custom">Personalizado…</SelectItem>
              </SelectContent>
            </Select>
            {period === "custom" && (
              <Popover
                open={isCustomOpen}
                onOpenChange={(open) => {
                  setIsCustomOpen(open);
                  if (open) {
                    setCustomHasOpened(true);
                    return;
                  }

                  if (!customHasOpened) {
                    return;
                  }

                  setCustomRange(appliedRange);
                  if (!appliedRange?.from || !appliedRange?.to) {
                    setPeriod(previousPeriod);
                  }
                  setCustomHasOpened(false);
                }}
              >
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto">
                    Selecionar intervalo
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={1}
                    initialFocus
                    locale={ptBR}
                  />
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={handleCancelCustomRange}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleApplyCustomRange}
                      disabled={!customRange?.from || !customRange?.to}
                    >
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              disabled={period === "all" && !appliedRange}
              className="w-full sm:w-auto"
            >
              Resetar
            </Button>
            <Button
              onClick={() => navigate("/transacoes/nova")}
              className="w-full sm:w-auto"
            >
              Nova Transação
            </Button>
          </div>
        </div>

        {periodLabel && (
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Saldo Atual</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.balance >= 0 ? "text-primary" : "text-destructive"
                }`}
              >
                {formatCentsToBRL(stats.balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Receitas
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCentsToBRL(stats.income)}
              </div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Despesas
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCentsToBRL(stats.expense)}
              </div>
              <p className="text-xs text-muted-foreground">
                No período selecionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Transações Pendentes
              </CardTitle>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {pendingCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Aguardando pagamento
              </p>
              {pendingCount > 0 && (
                <Button
                  variant="link"
                  className="px-0 mt-2"
                  onClick={() => navigate("/transacoes?status=pending")}
                >
                  Ver pendentes
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
            <CardDescription>As 5 transações mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação encontrada
              </p>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() =>
                      navigate(`/transacoes/${transaction.id}/editar`)
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          transaction.type === "income"
                            ? "bg-green-600"
                            : "bg-red-600"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                          {transaction.categories && (
                            <> • {transaction.categories.name}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        className={
                          transaction.is_paid
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }
                        variant="outline"
                      >
                        {transaction.is_paid ? "Paga" : "Pendente"}
                      </Badge>
                      <p
                        className={`font-semibold ${
                          transaction.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCentsToBRL(transaction.amount_cents)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentTransactions.length > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/transacoes")}
              >
                Ver Todas as Transações
              </Button>
            )}
          </CardContent>
        </Card>
        <AccountsCard accounts={accounts} transactions={transactions} />
      </div>
    </Layout>
  );
}
