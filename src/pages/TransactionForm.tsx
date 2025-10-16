import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Layout } from '@/components/Layout';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction, useUpdateTransaction, useTransactions } from '@/hooks/useTransactions';
import { parseBRLToCents } from '@/lib/currency';
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
  notes: z.string().optional(),
  is_paid: z.boolean().default(false),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export default function TransactionForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const { data: categories } = useCategories();
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
      notes: '',
      is_paid: false,
    },
  });

  const selectedType = form.watch('type');
  const currentCategoryId = form.watch('category_id');

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
          notes: transaction.notes || '',
          is_paid: transaction.is_paid,
        });
      }
    }
  }, [isEditing, id, transactions, form]);

  const filteredCategories = categories?.filter(
    (cat) => cat.type === selectedType
  );

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

  async function onSubmit(data: TransactionFormData) {
    const transactionData = {
      type: data.type,
      amount_cents: parseBRLToCents(data.amount),
      date: format(data.date, 'yyyy-MM-dd'),
      description: data.description,
      category_id: data.category_id === 'none' ? null : data.category_id,
      payment_method: data.payment_method || null,
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
                      <FormControl>
                        <Input
                          placeholder="Ex: Cartão de crédito, Dinheiro, PIX"
                          {...field}
                        />
                      </FormControl>
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
