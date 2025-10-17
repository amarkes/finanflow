import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Account } from '@/hooks/useAccounts';
import type { Transaction } from '@/hooks/useTransactions';
import { formatCentsToBRL } from '@/lib/currency';
import { CreditCard, Wallet, Banknote, Landmark } from 'lucide-react';
import { getAccountTypeLabel } from '@/lib/account';
import { useCreditCardInstallmentsSummary } from '@/hooks/useCreditCardInstallments';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AccountsCardProps {
  accounts: Account[] | undefined;
  transactions: Transaction[] | undefined;
  periodStart?: string;
  periodEnd?: string;
}

interface CreditCardSummary {
  account: Account;
  invoiceCents: number;
  futureAmountCents: number;
  totalParceladoCents: number;
  remainingInstallments: number;
  limitAvailableTotalCents: number | null;
}

function getAccountIcon(type: Account['type']) {
  switch (type) {
    case 'credit_card':
    case 'debit_card':
      return <CreditCard className="h-4 w-4 text-primary" />;
    case 'cash':
    case 'food_voucher':
    case 'boleto':
      return <Wallet className="h-4 w-4 text-primary" />;
    case 'pix':
    case 'transfer':
      return <Banknote className="h-4 w-4 text-primary" />;
    case 'ewallet':
    case 'bank_account':
    default:
      return <Landmark className="h-4 w-4 text-primary" />;
  }
}

function formatMonthLabel(periodStart?: string, periodEnd?: string) {
  if (!periodStart || !periodEnd) return null;

  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (!sameMonth) return null;

  const label = format(start, 'MMMM/yyyy', { locale: ptBR });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function AccountsCard({
  accounts,
  transactions,
  periodStart,
  periodEnd,
}: AccountsCardProps) {
  const resolvedAccounts = useMemo(() => accounts ?? [], [accounts]);
  const resolvedTransactions = useMemo(() => transactions ?? [], [transactions]);

  const creditCardAccounts = useMemo(
    () => resolvedAccounts.filter((account) => account.type === 'credit_card'),
    [resolvedAccounts]
  );

  const creditCardAccountIds = useMemo(
    () => creditCardAccounts.map((account) => account.id),
    [creditCardAccounts]
  );

  const cutoffDateForFuture = useMemo(() => {
    if (periodEnd) {
      return periodEnd;
    }
    return format(new Date(), 'yyyy-MM-dd');
  }, [periodEnd]);

  const {
    data: futureInstallmentsData,
    isLoading: isLoadingFutureInstallments,
    isFetching: isFetchingFutureInstallments,
  } = useCreditCardInstallmentsSummary({
    accountIds: creditCardAccountIds,
    cutoffDate: cutoffDateForFuture,
  });

  const futureInstallmentsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        futureAmountCents: number;
        remainingInstallments: number;
      }
    >();

    futureInstallmentsData?.forEach((item) => {
      map.set(item.accountId, {
        futureAmountCents: item.futureAmountCents,
        remainingInstallments: item.remainingInstallments,
      });
    });

    return map;
  }, [futureInstallmentsData]);

  const monthInvoiceByAccount = useMemo(() => {
    return resolvedTransactions.reduce<Map<string, number>>((acc, transaction) => {
      if (
        transaction.account_id &&
        transaction.type === 'expense' &&
        !transaction.is_paid
      ) {
        const current = acc.get(transaction.account_id) ?? 0;
        acc.set(transaction.account_id, current + transaction.amount_cents);
      }

      return acc;
    }, new Map());
  }, [resolvedTransactions]);

  const creditCardSummaries = useMemo<CreditCardSummary[]>(() => {
    return creditCardAccounts.map((account) => {
      const invoiceCents = monthInvoiceByAccount.get(account.id) ?? 0;
      const futureData = futureInstallmentsMap.get(account.id);
      const futureAmountCents = futureData?.futureAmountCents ?? 0;
      const remainingInstallments = futureData?.remainingInstallments ?? 0;
      const totalParceladoCents = invoiceCents + futureAmountCents;

      const limitAvailableTotalCents =
        typeof account.limit_cents === 'number'
          ? account.limit_cents - totalParceladoCents
          : null;

      return {
        account,
        invoiceCents,
        futureAmountCents,
        totalParceladoCents,
        remainingInstallments,
        limitAvailableTotalCents,
      };
    });
  }, [creditCardAccounts, monthInvoiceByAccount, futureInstallmentsMap]);

  const creditCardSummaryMap = useMemo(() => {
    return new Map(creditCardSummaries.map((summary) => [summary.account.id, summary]));
  }, [creditCardSummaries]);

  const creditCardAggregates = useMemo(() => {
    return creditCardSummaries.reduce(
      (acc, summary) => {
        const limit = summary.account.limit_cents ?? 0;
        const availableTotal =
          typeof summary.limitAvailableTotalCents === 'number'
            ? summary.limitAvailableTotalCents
            : summary.account.limit_cents ?? 0;

        acc.limitTotal += limit;
        acc.availableTotal += Math.max(availableTotal, 0);
        acc.invoiceTotal += summary.invoiceCents;
        acc.futureTotal += summary.futureAmountCents;
        acc.totalParcelado += summary.totalParceladoCents;
        acc.remainingInstallments += summary.remainingInstallments;
        return acc;
      },
      {
        limitTotal: 0,
        availableTotal: 0,
        invoiceTotal: 0,
        futureTotal: 0,
        totalParcelado: 0,
        remainingInstallments: 0,
      }
    );
  }, [creditCardSummaries]);

  const otherBalancesTotal = useMemo(
    () =>
      resolvedAccounts
        .filter((account) => account.type !== 'credit_card')
        .reduce((total, account) => total + (account.balance_cents ?? 0), 0),
    [resolvedAccounts]
  );

  const activeAccountsCount = useMemo(
    () => resolvedAccounts.filter((account) => account.is_active).length,
    [resolvedAccounts]
  );

  const monthLabel = useMemo(
    () => formatMonthLabel(periodStart, periodEnd),
    [periodStart, periodEnd]
  );

  const invoiceLabel = monthLabel ? `Fatura de ${monthLabel}` : 'Fatura do período';
  const isFutureLoading = isLoadingFutureInstallments || isFetchingFutureInstallments;

  if (resolvedAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contas</CardTitle>
          <CardDescription>
            Cadastre contas para controlar limites e saldos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Contas</CardTitle>
          <CardDescription>Acompanhe limites e saldos por conta.</CardDescription>
        </div>
        {creditCardAccounts.length > 0 && isFutureLoading && (
          <Badge variant="outline" className="text-xs w-fit">
            Atualizando parcelas futuras…
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground font-medium">
              Contas ativas
            </p>
            <p className="text-lg font-semibold mt-1">{activeAccountsCount}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground font-medium">
              Limite disponível (cartões)
            </p>
            <p className="text-lg font-semibold mt-1">
              {formatCentsToBRL(
                Math.max(
                  creditCardAggregates.availableTotal,
                  0
                )
              )}
            </p>
            {creditCardAccounts.length > 0 ? (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Disponível (parcelado):{' '}
                  {formatCentsToBRL(Math.max(creditCardAggregates.availableTotal, 0))}
                  {creditCardAggregates.limitTotal > 0 && (
                    <>
                      {' '}
                      de {formatCentsToBRL(creditCardAggregates.limitTotal)}
                    </>
                  )}
                </p>
                {creditCardAggregates.futureTotal > 0 && (
                  <p>
                    Parcelas futuras (valor):{' '}
                    {formatCentsToBRL(creditCardAggregates.futureTotal)}
                  </p>
                )}
                {creditCardAggregates.remainingInstallments > 0 && (
                  <p>
                    Qtd. parcelas futuras: {creditCardAggregates.remainingInstallments}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Cadastre um cartão de crédito para acompanhar o limite.
              </p>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground font-medium">
              Saldos estimados
            </p>
            <p className="text-lg font-semibold mt-1">
              {formatCentsToBRL(Math.max(otherBalancesTotal, 0))}
            </p>
          </div>
        </div>

            {resolvedAccounts.map((account) => {
              const isCreditCard = account.type === 'credit_card';
              const creditSummary = creditCardSummaryMap.get(account.id);

              const limitToShow =
                creditSummary?.limitAvailableTotalCents ?? account.limit_cents;

              const formattedLimitAvailable =
                typeof limitToShow === 'number'
                  ? formatCentsToBRL(Math.max(limitToShow, 0))
                  : account.limit_cents != null
              ? formatCentsToBRL(Math.max(account.limit_cents, 0))
              : 'Não informado';

          return (
            <div key={account.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {getAccountIcon(account.type)}
                <span className="font-semibold">{account.name}</span>
                {!account.is_active && (
                  <Badge variant="outline" className="text-xs">
                    Inativa
                  </Badge>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {getAccountTypeLabel(account.type)}
              </p>

              {isCreditCard ? (
                <div className="space-y-1 text-sm">
                  <p>
                    {invoiceLabel}:{' '}
                    <span className="font-medium">
                      {formatCentsToBRL(creditSummary?.invoiceCents ?? 0)}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span>
                      Total parcelado:{' '}
                      <span className="font-medium">
                        {formatCentsToBRL(creditSummary?.totalParceladoCents ?? 0)}
                      </span>
                    </span>
                    {creditSummary?.remainingInstallments ? (
                      <Badge variant="secondary" className="text-xs">
                        {creditSummary.remainingInstallments} parcelas restantes
                      </Badge>
                    ) : null}
                  </div>
                  {creditSummary?.futureAmountCents ? (
                    <p className="text-xs text-muted-foreground">
                      Parcelas futuras incluídas: {formatCentsToBRL(creditSummary.futureAmountCents)}
                    </p>
                  ) : null}
                  <p>
                    Limite do cartão:{' '}
                    <span className="font-medium">
                      {typeof account.limit_cents === 'number'
                        ? formatCentsToBRL(account.limit_cents)
                        : 'Não informado'}
                    </span>
                  </p>
                  <p>
                    Limite disponível:{' '}
                    <span className="font-medium">{formattedLimitAvailable}</span>
                    {' *'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    *Considerando parcelas futuras
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {account.limit_cents != null && (
                    <span>
                      Limite:{' '}
                      <span className="font-medium">
                        {formatCentsToBRL(account.limit_cents)}
                      </span>
                    </span>
                  )}
                  {account.balance_cents != null ? (
                    <span>
                      Saldo estimado:{' '}
                      <span className="font-medium">
                        {formatCentsToBRL(account.balance_cents)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">
                      Saldo não informado
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
