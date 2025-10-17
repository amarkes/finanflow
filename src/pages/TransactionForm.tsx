import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Layout } from '@/components/Layout';
import { useCategories } from '@/hooks/useCategories';
import {
  useCreateTransaction,
  useUpdateTransaction,
  useTransactions,
  type CreateTransactionInput,
  type TransactionUpdateInput,
} from '@/hooks/useTransactions';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { PaymentMethodChips, PAYMENT_METHOD_OPTIONS, PAYMENT_METHOD_ACCOUNT_TYPES } from '@/components/payment/PaymentMethodChips';
import { toast } from 'sonner';
import { getAccountTypeLabel } from '@/lib/account';
import {
  calculateInstallments,
  generateMonthlyDates,
  MONTHLY_OCCURRENCES,
  RecurrenceType,
  isSeriesType,
  formatSeriesLabel,
} from '@/lib/transactions';

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
  recurrence_type: z.enum(['single', 'installment', 'monthly']).default('single'),
  installments_count: z
    .number()
    .int()
    .min(2, 'Quantidade mínima de parcelas é 2')
    .max(24, 'Quantidade máxima de parcelas é 24')
    .optional(),
  apply_mode: z.enum(['single', 'series_from_here']).optional(),
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

  if (data.recurrence_type === 'installment') {
    if (data.installments_count == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe a quantidade de parcelas',
        path: ['installments_count'],
      });
    }
  }
});

type TransactionFormData = z.infer<typeof transactionSchema>;

const RECURRENCE_OPTIONS: Array<{
  value: RecurrenceType;
  label: string;
  helper: string;
}> = [
  { value: 'single', label: 'Única', helper: 'Cria apenas este lançamento.' },
  { value: 'installment', label: 'Parcelada', helper: 'Divide o valor total em parcelas iguais.' },
  { value: 'monthly', label: 'Mensal', helper: 'Repete o valor pelos próximos 12 meses.' },
];

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts({ isActive: true });
  const { data: transactions } = useTransactions();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const currentTransaction = useMemo(
    () => (transactions ? transactions.find((t) => t.id === id) : undefined),
    [transactions, id]
  );

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
      recurrence_type: 'single',
      installments_count: 2,
      apply_mode: 'single',
      is_paid: false,
    },
  });

  const selectedType = form.watch('type');
  const currentCategoryId = form.watch('category_id');
  const paymentMethod = form.watch('payment_method');
  const currentAccountId = form.watch('account_id');
  const recurrenceType = form.watch('recurrence_type');
  const installmentsCount = form.watch('installments_count');
  const transactionDateValue = form.watch('date');
  const amountValue = form.watch('amount');
  const isSeriesTransaction = currentTransaction ? isSeriesType(currentTransaction.series_type) : false;
  const seriesLabel = useMemo(
    () => (currentTransaction ? formatSeriesLabel(currentTransaction) : null),
    [currentTransaction]
  );

  useEffect(() => {
    if (!isEditing || !currentTransaction) return;

    form.reset({
      type: currentTransaction.type,
      amount: (currentTransaction.amount_cents / 100).toFixed(2).replace('.', ','),
      date: new Date(currentTransaction.date),
      description: currentTransaction.description,
      category_id: currentTransaction.category_id || 'none',
      payment_method: currentTransaction.payment_method || '',
      account_id: currentTransaction.account_id || 'none',
      notes: currentTransaction.notes || '',
      recurrence_type: currentTransaction.series_type,
      installments_count:
        currentTransaction.series_type === 'installment'
          ? currentTransaction.series_total ?? 2
          : currentTransaction.series_type === 'single'
            ? 2
            : undefined,
      apply_mode: 'single',
      is_paid: currentTransaction.is_paid,
    });
  }, [isEditing, currentTransaction, form]);

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

  const installmentsSummary = useMemo(() => {
    if (recurrenceType !== 'installment') return null;
    if (!amountValue) return null;
    if (!installmentsCount || installmentsCount < 2) return null;

    const totalCents = parseBRLToCents(amountValue);
    if (!Number.isFinite(totalCents) || Number.isNaN(totalCents) || totalCents <= 0) {
      return null;
    }

    try {
      const values = calculateInstallments(totalCents, installmentsCount);
      const breakdownMap = values.reduce<Map<number, number>>((acc, value) => {
        acc.set(value, (acc.get(value) ?? 0) + 1);
        return acc;
      }, new Map());

      const breakdown = Array.from(breakdownMap.entries())
        .map(([value, count]) => `${count}x de ${formatCentsToBRL(value)}`)
        .join(' + ');

      return {
        total: formatCentsToBRL(totalCents),
        breakdown,
      };
    } catch {
      return null;
    }
  }, [amountValue, installmentsCount, recurrenceType]);

  const monthlySummary = useMemo(() => {
    if (recurrenceType !== 'monthly') return null;
    if (!amountValue || !transactionDateValue) return null;

    const totalCents = parseBRLToCents(amountValue);
    if (Number.isNaN(totalCents) || totalCents <= 0) {
      return null;
    }

    const monthlyDates = generateMonthlyDates(transactionDateValue, MONTHLY_OCCURRENCES);
    const firstDate = monthlyDates[0];
    const lastDate = monthlyDates[monthlyDates.length - 1];

    return {
      amount: formatCentsToBRL(totalCents),
      start: format(firstDate, 'dd/MM/yyyy'),
      end: format(lastDate, 'dd/MM/yyyy'),
    };
  }, [amountValue, recurrenceType, transactionDateValue]);

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

    const amountInCents = parseBRLToCents(data.amount);
    if (!Number.isFinite(amountInCents) || Number.isNaN(amountInCents) || amountInCents <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    const basePayload = {
      type: data.type,
      amount_cents: amountInCents,
      date: format(data.date, 'yyyy-MM-dd'),
      description: data.description,
      category_id: data.category_id === 'none' ? null : data.category_id,
      payment_method: sanitizedMethod || null,
      account_id: selectedAccountId,
      notes: data.notes || null,
      is_paid: data.is_paid ?? false,
    };

    const recurrenceType = data.recurrence_type;
    const installmentsCount =
      recurrenceType === 'installment' ? data.installments_count ?? 2 : undefined;

    if (isEditing) {
      const applyMode = data.apply_mode ?? 'single';
      const updatePayload: TransactionUpdateInput = {
        id: id!,
        ...basePayload,
        applyMode,
      };

      if (applyMode === 'series_from_here' && currentTransaction?.series_id) {
        updatePayload.seriesMeta = {
          series_id: currentTransaction.series_id,
          series_sequence: currentTransaction.series_sequence ?? 1,
        };

        if (currentTransaction.series_type === 'monthly') {
          const totalOccurrences = currentTransaction.series_total ?? MONTHLY_OCCURRENCES;
          updatePayload.series_amount_total_cents = amountInCents * totalOccurrences;
        }
      }

      await updateMutation.mutateAsync(updatePayload);
    } else {
      const createPayload: CreateTransactionInput = {
        ...basePayload,
        recurrence_type: recurrenceType,
        installments_count: installmentsCount,
      };

      await createMutation.mutateAsync(createPayload);
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
        {isEditing && currentTransaction && (
          <div className="mb-6 rounded-md border border-dashed p-3">
            <div className="flex flex-wrap items-center gap-2">
              {seriesLabel && (
                <Badge variant="secondary" className="uppercase tracking-wide">
                  {seriesLabel}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {isSeriesTransaction
                  ? 'Este lançamento pertence a uma série. Use as opções de aplicação abaixo para gerenciar o restante da série.'
                  : 'Este lançamento é único.'}
              </span>
            </div>
          </div>
        )}
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
                  name="recurrence_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de lançamento</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(value as RecurrenceType)}
                          value={field.value}
                          className="grid gap-2 md:grid-cols-3"
                        >
                          {RECURRENCE_OPTIONS.map((option) => {
                            const optionId = `recurrence-${option.value}`;
                            return (
                              <div
                                key={option.value}
                                className={cn(
                                  'flex items-start gap-3 rounded-md border p-3',
                                  field.value === option.value && 'border-primary bg-primary/5'
                                )}
                              >
                                <RadioGroupItem
                                  value={option.value}
                                  id={optionId}
                                  disabled={isEditing}
                                  className="mt-1"
                                />
                                <div className="space-y-1">
                                  <Label htmlFor={optionId} className="cursor-pointer font-medium">
                                    {option.label}
                                  </Label>
                                  <p className="text-sm text-muted-foreground">{option.helper}</p>
                                </div>
                              </div>
                            );
                          })}
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>
                        {isEditing
                          ? 'A recorrência é definida na criação. Para alterar, crie uma nova transação.'
                          : 'Defina se devemos criar parcelas automáticas ou lançamentos mensais.'}
                      </FormDescription>
                      {recurrenceType === 'monthly' && monthlySummary && (
                        <FormDescription className="text-sm text-primary">
                          {`Serão criados ${MONTHLY_OCCURRENCES} lançamentos de ${monthlySummary.amount} entre ${monthlySummary.start} e ${monthlySummary.end}.`}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {recurrenceType === 'installment' && (
                  <FormField
                    control={form.control}
                    name="installments_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade de parcelas</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={2}
                            max={24}
                            value={field.value ?? ''}
                            onChange={(event) => {
                              const raw = event.target.value;
                              field.onChange(raw === '' ? undefined : Number(raw));
                            }}
                          />
                        </FormControl>
                        {installmentsSummary && (
                          <FormDescription className="text-sm text-primary">
                            {`${installmentsSummary.breakdown} (Total: ${installmentsSummary.total})`}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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

                {isEditing && isSeriesTransaction && (
                  <FormField
                    control={form.control}
                    name="apply_mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aplicar alterações</FormLabel>
                        <Select
                          value={field.value ?? 'single'}
                          onValueChange={(value) => field.onChange(value as 'single' | 'series_from_here')}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Escolha como aplicar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">Somente esta transação</SelectItem>
                            <SelectItem value="series_from_here">Esta e próximas da série</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Use esta opção para propagar alterações para os lançamentos futuros da série.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

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
