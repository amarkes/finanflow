import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Layout } from '@/components/Layout';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction, useUpdateTransaction, useTransactions } from '@/hooks/useTransactions';
import { useAccounts } from '@/hooks/useAccounts';
import { parseBRLToCents, formatCentsToBRL } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { PaymentMethodChips, PAYMENT_METHOD_OPTIONS, PAYMENT_METHOD_ACCOUNT_TYPES } from '@/components/payment/PaymentMethodChips';
import { toast } from 'sonner';
import { getAccountTypeLabel } from '@/lib/account';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense'], {
    required_error: 'Selecione o tipo',
  }),
  amount: z.string().min(1, 'Valor é obrigatório'),
  date: z.date({
    required_error: 'Data é obrigatória',
  }),
  description: z.string().min(3, 'Descrição deve ter no mínimo 3 caracteres'),
  category_id: z.string(),
  payment_method: z.string().optional(),
  account_id: z.string().optional(),
  notes: z.string().optional(),
  is_paid: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.payment_method?.toLowerCase() === 'cartão de crédito') {
    if (!data.account_id || data.account_id === 'none') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione uma conta de cartão de crédito',
        path: ['account_id'],
      });
    }
  }
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts({ isActive: true });
  const { data: transactions } = useTransactions();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      date: new Date(),
      description: '',
      category_id: 'none',
      payment_method: '',
      account_id: 'none',
      notes: '',
      is_paid: false,
    },
  });

  const selectedType = form.watch('type');
  const currentCategoryId = form.watch('category_id');
  const paymentMethod = form.watch('payment_method');
  const currentAccountId = form.watch('account_id');

  useEffect(() => {
    if (isEditing && transactions) {
      const transaction = transactions.find((t) => t.id === id);
      if (transaction) {
        form.reset({
          type: transaction.type,
          amount: (transaction.amount_cents / 100).toFixed(2).replace('.', ','),
          date: new Date(transaction.date),
          description: transaction.description,
          category_id: transaction.category_id || 'none',
          payment_method: transaction.payment_method || '',
          account_id: transaction.account_id || 'none',
          notes: transaction.notes || '',
          is_paid: transaction.is_paid,
        });
      }
    }
  }, [isEditing, id, transactions, form]);

  const filteredCategories = categories?.filter(
    (cat) => cat.type === selectedType
  );

  const compatibleAccountTypes = useMemo(() => {
    if (!paymentMethod) return undefined;
    return PAYMENT_METHOD_ACCOUNT_TYPES[paymentMethod] || undefined;
  }, [paymentMethod]);

  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    const activeAccounts = accounts.filter((account) => account.is_active);

    if (!compatibleAccountTypes || compatibleAccountTypes.length === 0) {
      return activeAccounts;
    }

    return activeAccounts.filter((account) =>
      compatibleAccountTypes.includes(account.type)
    );
  }, [accounts, compatibleAccountTypes]);

  const selectedAccount = useMemo(() => {
    if (!accounts) return undefined;
    if (!currentAccountId || currentAccountId === 'none') return undefined;
    return accounts.find((account) => account.id === currentAccountId);
  }, [accounts, currentAccountId]);

  useEffect(() => {
    if (!categories) return;
    if (!selectedType) return;
    if (!currentCategoryId || currentCategoryId === 'none') return;

    const categoryExists = categories.some(
      (cat) => cat.id === currentCategoryId && cat.type === selectedType
    );

    if (!categoryExists) {
      form.setValue('category_id', 'none');
    }
  }, [categories, selectedType, currentCategoryId, form]);

  useEffect(() => {
    if (!currentAccountId) return;
    if (currentAccountId === 'none') return;

    const stillAvailable = filteredAccounts.some((account) => account.id === currentAccountId);

    if (!stillAvailable) {
      form.setValue('account_id', 'none');
    }
  }, [filteredAccounts, currentAccountId, form]);

  const outstandingAmount = useMemo(() => {
    if (!selectedAccount) return 0;
    if (!transactions) return 0;

    return transactions
      .filter(
        (transaction) =>
          transaction.account_id === selectedAccount.id &&
          transaction.type === 'expense' &&
          !transaction.is_paid &&
          (!isEditing || transaction.id !== id)
      )
      .reduce((total, transaction) => total + transaction.amount_cents, 0);
  }, [selectedAccount, transactions, isEditing, id]);

  const availableLimit = useMemo(() => {
    if (!selectedAccount) return null;
    if (selectedAccount.type !== 'credit_card') return null;
    if (selectedAccount.limit_cents == null) return null;

    return selectedAccount.limit_cents - outstandingAmount;
  }, [selectedAccount, outstandingAmount]);

  const balanceHint = useMemo(() => {
    if (!selectedAccount) return null;

    if (selectedAccount.type === 'credit_card') {
      if (availableLimit == null) return 'Limite não informado';
      return `Limite disponível: ${formatCentsToBRL(Math.max(availableLimit, 0))}`;
    }

    if (selectedAccount.balance_cents != null) {
      return `Saldo estimado: ${formatCentsToBRL(selectedAccount.balance_cents)}`;
    }

    return 'Saldo não informado';
  }, [selectedAccount, availableLimit]);

  async function onSubmit(data: TransactionFormData) {
    const sanitizedMethod = data.payment_method?.trim() ?? '';
    const selectedAccountId = data.account_id && data.account_id !== 'none' ? data.account_id : null;
    const selectedAccountForSubmit = accounts?.find((account) => account.id === selectedAccountId);
    const compatibleTypes = sanitizedMethod ? PAYMENT_METHOD_ACCOUNT_TYPES[sanitizedMethod] : undefined;

    if (compatibleTypes && compatibleTypes.length > 0) {
      if (!selectedAccountForSubmit && compatibleTypes.includes('credit_card')) {
        toast.error('Selecione uma conta de cartão de crédito para este método.');
        return;
      }

      if (
        selectedAccountForSubmit &&
        compatibleTypes.length > 0 &&
        !compatibleTypes.includes(selectedAccountForSubmit.type)
      ) {
        toast.error('A conta selecionada não é compatível com o método de pagamento escolhido.');
        return;
      }
    }

    const transactionData = {
      type: data.type,
      amount_cents: parseBRLToCents(data.amount),
      date: format(data.date, 'yyyy-MM-dd'),
      description: data.description,
      category_id: data.category_id === 'none' ? null : data.category_id,
      payment_method: sanitizedMethod || null,
      account_id: selectedAccountId,
      notes: data.notes || null,
      is_paid: data.is_paid ?? false,
    };

    if (isEditing) {
      await updateMutation.mutateAsync({ id: id!, ...transactionData });
    } else {
      await createMutation.mutateAsync(transactionData);
    }

    navigate('/transacoes');
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? 'Atualize os dados da transação'
              : 'Preencha os dados da nova transação'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Transação</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="income">Receita</SelectItem>
                          <SelectItem value="expense">Despesa</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor (R$) *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="0,00"
                            {...field}
                            onChange={(e) => {
                              const value = e.target.value
                                .replace(/[^\d,]/g, '')
                                .replace(/,/, '.')
                                .replace(/(\..*)\./g, '$1');
                              field.onChange(value.replace('.', ','));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP', { locale: ptBR })
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Compra no supermercado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem categoria</SelectItem>
                          {filteredCategories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_paid"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-1">
                        <FormLabel>Status de Pagamento</FormLabel>
                        <FormDescription>
                          Marque como pago quando o lançamento já tiver sido quitado.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          aria-label="Marcar transação como paga"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Método de Pagamento</FormLabel>
                      <PaymentMethodChips
                        selected={field.value}
                        onSelect={(value) => {
                          field.onChange(value);
                        }}
                        options={PAYMENT_METHOD_OPTIONS}
                      />
                      <FormControl>
                        <Input
                          placeholder="Ex: Cartão de crédito, Dinheiro, PIX"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Utilize um atalho acima ou informe manualmente o método.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conta</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma conta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem conta vinculada</SelectItem>
                          {filteredAccounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} — {getAccountTypeLabel(account.type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAccount && balanceHint && (
                        <FormDescription>{balanceHint}</FormDescription>
                      )}
                      {!selectedAccount && paymentMethod && compatibleAccountTypes && (
                        <FormDescription>
                          Selecione uma conta compatível com o método escolhido.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notas adicionais (opcional)"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/transacoes')}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Salvando...'
                      : isEditing
                      ? 'Atualizar'
                      : 'Criar'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
