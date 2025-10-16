import { useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/Layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, type Account, type AccountType } from '@/hooks/useAccounts';
import { formatCentsToBRL, parseBRLToCents } from '@/lib/currency';
import { getAccountTypeLabel } from '@/lib/account';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const accountSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  type: z.enum([
    'credit_card',
    'debit_card',
    'cash',
    'pix',
    'boleto',
    'food_voucher',
    'transfer',
    'ewallet',
    'bank_account',
  ]),
  limit: z.string().optional(),
  balance: z.string().optional(),
  is_active: z.boolean().default(true),
});

type AccountFormData = z.infer<typeof accountSchema>;

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'credit_card', label: getAccountTypeLabel('credit_card') },
  { value: 'debit_card', label: getAccountTypeLabel('debit_card') },
  { value: 'cash', label: getAccountTypeLabel('cash') },
  { value: 'pix', label: getAccountTypeLabel('pix') },
  { value: 'boleto', label: getAccountTypeLabel('boleto') },
  { value: 'food_voucher', label: getAccountTypeLabel('food_voucher') },
  { value: 'transfer', label: getAccountTypeLabel('transfer') },
  { value: 'ewallet', label: getAccountTypeLabel('ewallet') },
  { value: 'bank_account', label: getAccountTypeLabel('bank_account') },
];

function formatToInput(value: number | null | undefined) {
  if (value == null) return '';
  return (value / 100).toFixed(2).replace('.', ',');
}

function sanitizeCurrencyInput(value: string) {
  return value
    .replace(/[^\d,]/g, '')
    .replace(/,/, '.')
    .replace(/(\..*)\./g, '$1')
    .replace('.', ',');
}

export default function Accounts() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'credit_card',
      limit: '',
      balance: '',
      is_active: true,
    },
  });

  useEffect(() => {
    if (editingAccount) {
      form.reset({
        name: editingAccount.name,
        type: editingAccount.type,
        limit: formatToInput(editingAccount.limit_cents),
        balance: formatToInput(editingAccount.balance_cents),
        is_active: editingAccount.is_active,
      });
    } else {
      form.reset({
        name: '',
        type: 'credit_card',
        limit: '',
        balance: '',
        is_active: true,
      });
    }
  }, [editingAccount, form, isDialogOpen]);

  const creditCardSummary = useMemo(() => {
    if (!accounts) return { active: 0, totalLimit: 0 };
    const creditCards = accounts.filter((account) => account.type === 'credit_card');
    const totalLimit = creditCards.reduce((sum, account) => sum + (account.limit_cents ?? 0), 0);

    return {
      active: creditCards.filter((account) => account.is_active).length,
      totalLimit,
    };
  }, [accounts]);

  async function onSubmit(values: AccountFormData) {
    const payload = {
      name: values.name,
      type: values.type,
      limit_cents: values.limit ? parseBRLToCents(values.limit) : null,
      balance_cents: values.balance ? parseBRLToCents(values.balance) : null,
      is_active: values.is_active,
    };

    if (editingAccount) {
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        ...payload,
      });
    } else {
      await createAccount.mutateAsync(payload);
    }

    setIsDialogOpen(false);
    setEditingAccount(null);
  }

  const handleOpenDialog = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
    } else {
      setEditingAccount(null);
    }
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteAccount.mutate(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Contas</h1>
            <p className="text-muted-foreground">
              Controle limites de cartões e saldos de contas para acompanhar seus pagamentos.
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                </DialogTitle>
                <DialogDescription>
                  {editingAccount
                    ? 'Atualize as informações da conta.'
                    : 'Informe os dados da conta para vincular às transações.'}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Cartão Nubank" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select
                          onValueChange={(value: AccountType) => field.onChange(value)}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ACCOUNT_TYPES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Escolha o tipo correspondente ao método que você pretende utilizar.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="limit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Limite (R$)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 15.000,00"
                              {...field}
                              onChange={(event) => field.onChange(sanitizeCurrencyInput(event.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Informe o limite disponível em reais para cartões de crédito.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="balance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Saldo Estimado (R$)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ex: 1.200,00"
                              {...field}
                              onChange={(event) => field.onChange(sanitizeCurrencyInput(event.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Use para controlar o saldo disponível em contas sem limite fixo.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-1">
                          <FormLabel>Conta ativa?</FormLabel>
                          <FormDescription>
                            Contas inativas não aparecem para seleção no formulário de transações.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingAccount(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAccount.isPending || updateAccount.isPending}
                    >
                      {createAccount.isPending || updateAccount.isPending
                        ? 'Salvando...'
                        : editingAccount
                        ? 'Atualizar'
                        : 'Criar'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Visão geral das contas cadastradas.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Contas Ativas</p>
                <p className="text-2xl font-semibold mt-1">
                  {accounts?.filter((account) => account.is_active).length ?? 0}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Cartões de Crédito</p>
                <p className="text-2xl font-semibold mt-1">
                  {creditCardSummary.active}
                </p>
                <p className="text-xs text-muted-foreground">
                  Limite total: {formatCentsToBRL(creditCardSummary.totalLimit)}
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase text-muted-foreground">Contas Cadastradas</p>
                <p className="text-2xl font-semibold mt-1">
                  {accounts?.length ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : accounts && accounts.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Saldo Estimado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{getAccountTypeLabel(account.type)}</TableCell>
                    <TableCell>
                      {account.limit_cents != null
                        ? formatCentsToBRL(account.limit_cents)
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {account.balance_cents != null
                        ? formatCentsToBRL(account.balance_cents)
                        : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={account.is_active ? 'default' : 'outline'}
                        className={account.is_active ? '' : 'text-muted-foreground'}
                      >
                        {account.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(account)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(account.id)}
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
            <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => handleOpenDialog()}
            >
              Cadastrar primeira conta
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Transações vinculadas permanecerão com a referência, mas a conta será removida da listagem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
