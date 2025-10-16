import { useState, useMemo } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCentsToBRL, formatDate } from '@/lib/currency';
import { TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('current');

  // Calcular datas do período
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start, end;

    switch (period) {
      case 'current':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'last':
        const lastMonth = subMonths(now, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'all':
      default:
        start = undefined;
        end = undefined;
    }

    return {
      startDate: start ? format(start, 'yyyy-MM-dd') : undefined,
      endDate: end ? format(end, 'yyyy-MM-dd') : undefined,
    };
  }, [period]);

  const { data: transactions, isLoading } = useTransactions({
    startDate,
    endDate,
  });

  // Calcular totais
  const stats = useMemo(() => {
    if (!transactions) return { income: 0, expense: 0, balance: 0 };

    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount_cents, 0);

    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount_cents, 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
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
          <div className="flex items-center gap-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês Atual</SelectItem>
                <SelectItem value="last">Mês Anterior</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => navigate('/transacoes/nova')}>
              Nova Transação
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Saldo Atual
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas Transações</CardTitle>
            <CardDescription>
              As 5 transações mais recentes
            </CardDescription>
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
                    onClick={() => navigate(`/transacoes/${transaction.id}/editar`)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          transaction.type === 'income'
                            ? 'bg-green-600'
                            : 'bg-red-600'
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
                    <p
                      className={`font-semibold ${
                        transaction.type === 'income'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCentsToBRL(transaction.amount_cents)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {recentTransactions.length > 0 && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/transacoes')}
              >
                Ver Todas as Transações
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
