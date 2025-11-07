import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useTransactions,
  useDeleteTransaction,
  useUpdateTransaction,
  useCloneTransaction,
  type Transaction,
} from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCentsToBRL, formatDate } from '@/lib/currency';
import { getAccountTypeLabel } from '@/lib/account';
import { formatSeriesLabel, isSeriesType, type RecurrenceType } from '@/lib/transactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, CheckCircle2, Clock, Copy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Transactions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>(() => {
    const statusParam = searchParams.get('status');
    return statusParam === 'paid' || statusParam === 'pending' ? statusParam : 'all';
  });
  const [seriesFilter, setSeriesFilter] = useState<'all' | RecurrenceType>(() => {
    const seriesParam = searchParams.get('series');
    return seriesParam === 'installment' || seriesParam === 'monthly' || seriesParam === 'single'
      ? (seriesParam as RecurrenceType)
      : 'all';
  });
  const [accountFilter, setAccountFilter] = useState<string>(() => {
    const accountParam = searchParams.get('account');
    return accountParam ?? 'all';
  });
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [toggleTarget, setToggleTarget] = useState<{
    transaction: Transaction;
    nextStatus: boolean;
  } | null>(null);
  const [cloneTarget, setCloneTarget] = useState<Transaction | null>(null);
  const [cloneDate, setCloneDate] = useState('');
  const [cloneIsPaid, setCloneIsPaid] = useState(false);

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts({ isActive: true });
  const { data: transactions, isLoading } = useTransactions({
    search,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    seriesType: seriesFilter !== 'all' ? seriesFilter : undefined,
    accountId: accountFilter !== 'all' ? accountFilter : undefined,
  });
  const deleteMutation = useDeleteTransaction();
  const updateMutation = useUpdateTransaction();
  const cloneMutation = useCloneTransaction();

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'paid' || statusParam === 'pending') {
      setStatusFilter(statusParam);
    } else {
      setStatusFilter('all');
    }

    const accountParam = searchParams.get('account');
    if (accountParam) {
      setAccountFilter(accountParam);
    } else {
      setAccountFilter('all');
    }

    const seriesParam = searchParams.get('series');
    if (seriesParam === 'single' || seriesParam === 'installment' || seriesParam === 'monthly') {
      setSeriesFilter(seriesParam as RecurrenceType);
    } else {
      setSeriesFilter('all');
    }
  }, [searchParams]);

  const handleStatusFilterChange = (value: 'all' | 'paid' | 'pending') => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('status');
    } else {
      params.set('status', value);
    }
    setSearchParams(params, { replace: true });
  };

  const handleAccountFilterChange = (value: string) => {
    setAccountFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('account');
    } else {
      params.set('account', value);
    }
    setSearchParams(params, { replace: true });
  };

  const handleSeriesFilterChange = (value: 'all' | RecurrenceType) => {
    setSeriesFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') {
      params.delete('series');
    } else {
      params.set('series', value);
    }
    setSearchParams(params, { replace: true });
  };

  const handleDelete = (mode: 'single' | 'series_from_here') => {
    if (!deleteTarget) return;

    deleteMutation.mutate(
      {
        id: deleteTarget.id,
        mode,
        seriesMeta:
          mode === 'series_from_here' && deleteTarget.series_id
            ? {
                series_id: deleteTarget.series_id,
                series_sequence: deleteTarget.series_sequence ?? 1,
              }
            : undefined,
      },
      {
        onSettled: () => setDeleteTarget(null),
      }
    );
  };

  const handleRequestStatusChange = (transaction: Transaction) => {
    setToggleTarget({
      transaction,
      nextStatus: !transaction.is_paid,
    });
  };

  const normalizeTransactionDate = (date: string) => {
    if (!date) return '';
    const [onlyDate] = date.split('T');
    return onlyDate ?? date;
  };

  const handleRequestClone = (transaction: Transaction) => {
    setCloneTarget(transaction);
    setCloneDate(normalizeTransactionDate(transaction.date));
    setCloneIsPaid(false);
  };

  const resetCloneState = () => {
    setCloneTarget(null);
    setCloneDate('');
    setCloneIsPaid(false);
  };

  const handleConfirmClone = () => {
    if (!cloneTarget || !cloneDate) return;

    cloneMutation.mutate(
      {
        sourceId: cloneTarget.id,
        date: cloneDate,
        isPaid: cloneIsPaid,
      },
      {
        onSuccess: () => {
          resetCloneState();
        },
      }
    );
  };

  const isRowUpdating = (transactionId: string) =>
    updateMutation.isPending && updateMutation.variables?.id === transactionId;

  const isCloningTransaction = (transactionId: string) =>
    cloneMutation.isPending && cloneMutation.variables?.sourceId === transactionId;

  const handleConfirmToggle = (mode: 'single' | 'series_from_here') => {
    if (!toggleTarget) return;

    updateMutation.mutate(
      {
        id: toggleTarget.transaction.id,
        is_paid: toggleTarget.nextStatus,
        applyMode: mode,
        seriesMeta:
          mode === 'series_from_here' && toggleTarget.transaction.series_id
            ? {
                series_id: toggleTarget.transaction.series_id,
                series_sequence: toggleTarget.transaction.series_sequence ?? 1,
              }
            : undefined,
      },
      {
        onSettled: () => setToggleTarget(null),
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Transações</h1>
            <p className="text-muted-foreground">
              Gerencie suas receitas e despesas
            </p>
          </div>
          <Button onClick={() => navigate('/transacoes/nova')}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="transactions-search" className="text-sm font-medium text-muted-foreground">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="transactions-search"
                placeholder="Descrição da transação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="transactions-type" className="text-sm font-medium text-muted-foreground">
              Tipo
            </label>
            <Select
              value={typeFilter}
              onValueChange={(value) =>
                setTypeFilter(value as 'all' | 'income' | 'expense')
              }
            >
              <SelectTrigger id="transactions-type">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="transactions-category" className="text-sm font-medium text-muted-foreground">
              Categoria
            </label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="transactions-category">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="transactions-account" className="text-sm font-medium text-muted-foreground">
              Conta
            </label>
            <Select
              value={accountFilter}
              onValueChange={(value) => handleAccountFilterChange(value)}
            >
              <SelectTrigger id="transactions-account">
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {accounts?.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="transactions-status" className="text-sm font-medium text-muted-foreground">
              Status
            </label>
            <Select
              value={statusFilter}
              onValueChange={(value) =>
                handleStatusFilterChange(value as 'all' | 'paid' | 'pending')
              }
            >
              <SelectTrigger id="transactions-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="transactions-series" className="text-sm font-medium text-muted-foreground">
              Recorrência
            </label>
            <Select
              value={seriesFilter}
              onValueChange={(value) =>
                handleSeriesFilterChange(value as 'all' | RecurrenceType)
              }
            >
              <SelectTrigger id="transactions-series">
                <SelectValue placeholder="Recorrência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="single">Únicas</SelectItem>
                <SelectItem value="installment">Parceladas</SelectItem>
                <SelectItem value="monthly">Mensais</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Recorrência</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{formatDate(transaction.date)}</TableCell>
                    <TableCell className="font-medium">
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      {transaction.categories ? (
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: transaction.categories.color,
                            color: transaction.categories.color,
                          }}
                        >
                          {transaction.categories.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.account ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{transaction.account.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getAccountTypeLabel(transaction.account.type)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={isSeriesType(transaction.series_type) ? 'secondary' : 'outline'}
                      >
                        {formatSeriesLabel(transaction)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.type === 'income'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          transaction.is_paid
                            ? 'bg-green-100 text-green-700 border-green-200'
                            : 'bg-amber-100 text-amber-700 border-amber-200'
                        }
                        variant="outline"
                      >
                        {transaction.is_paid ? 'Paga' : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        transaction.type === 'income'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCentsToBRL(transaction.amount_cents)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRequestStatusChange(transaction)}
                          disabled={isRowUpdating(transaction.id)}
                          aria-label={
                            transaction.is_paid
                              ? 'Marcar como pendente'
                              : 'Marcar como paga'
                          }
                          title={
                            transaction.is_paid
                              ? 'Marcar como pendente'
                              : 'Marcar como paga'
                          }
                        >
                          {transaction.is_paid ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRequestClone(transaction)}
                          disabled={isCloningTransaction(transaction.id)}
                          aria-label="Clonar transação"
                          title="Clonar transação"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(`/transacoes/${transaction.id}/editar`)
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(transaction)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">Nenhuma transação encontrada</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/transacoes/nova')}
            >
              Criar Primeira Transação
            </Button>
          </div>
        )}
      </div>

      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(open) => {
          if (!open) setToggleTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget
                ? `Deseja marcar "${toggleTarget.transaction.description}" como ${toggleTarget.nextStatus ? 'paga' : 'pendente'}?`
                : ''}
            </AlertDialogDescription>
            {toggleTarget && isSeriesType(toggleTarget.transaction.series_type) && toggleTarget.transaction.series_id && (
              <p className="text-sm text-muted-foreground">
                Parte da série {formatSeriesLabel(toggleTarget.transaction)}.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirmToggle('single')}
              disabled={updateMutation.isPending}
            >
              Somente esta
            </AlertDialogAction>
            {toggleTarget && isSeriesType(toggleTarget.transaction.series_type) && toggleTarget.transaction.series_id && (
              <AlertDialogAction
                onClick={() => handleConfirmToggle('series_from_here')}
                disabled={updateMutation.isPending}
              >
                Esta e próximas
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!cloneTarget}
        onOpenChange={(open) => {
          if (!open) resetCloneState();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clonar transação</AlertDialogTitle>
            <AlertDialogDescription>
              {cloneTarget
                ? `Informe a nova data para "${cloneTarget.description}".`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label
              htmlFor="clone-date"
              className="text-sm font-medium text-muted-foreground"
            >
              Data
            </label>
            <Input
              id="clone-date"
              type="date"
              value={cloneDate}
              onChange={(e) => setCloneDate(e.target.value)}
              disabled={cloneMutation.isPending}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Marcar como paga</p>
              <p className="text-xs text-muted-foreground">
                Defina o status da transação clonada. Padrão: Pendente.
              </p>
            </div>
            <Switch
              id="clone-is-paid"
              checked={cloneIsPaid}
              onCheckedChange={(checked) => setCloneIsPaid(checked)}
              disabled={cloneMutation.isPending}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cloneMutation.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClone}
              disabled={cloneMutation.isPending || !cloneDate}
            >
              Clonar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja excluir "${deleteTarget.description}"? Esta ação não pode ser desfeita.`
                : ''}
            </AlertDialogDescription>
            {deleteTarget && isSeriesType(deleteTarget.series_type) && deleteTarget.series_id && (
              <p className="text-sm text-muted-foreground">
                Parte da série {formatSeriesLabel(deleteTarget)}.
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete('single')}
              disabled={deleteMutation.isPending}
            >
              Somente esta
            </AlertDialogAction>
            {deleteTarget && isSeriesType(deleteTarget.series_type) && deleteTarget.series_id && (
              <AlertDialogAction
                onClick={() => handleDelete('series_from_here')}
                disabled={deleteMutation.isPending}
              >
                Esta e próximas
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
