import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Account } from '@/hooks/useAccounts';
import type { Transaction } from '@/hooks/useTransactions';
import { formatCentsToBRL } from '@/lib/currency';
import { CreditCard, Wallet, Banknote, Landmark } from 'lucide-react';
import { getAccountTypeLabel } from '@/lib/account';

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

function computeOutstandingForCreditCard(account: Account, transactions: Transaction[]) {
  const totalExpenses = transactions
    .filter(
      (transaction) =>
        transaction.account_id === account.id &&
        transaction.type === 'expense' &&
        !transaction.is_paid
    )
    .reduce((total, item) => total + item.amount_cents, 0);

  if (account.limit_cents === null) return null;

  return account.limit_cents - totalExpenses;
}

function computeBalanceHint(account: Account, transactions: Transaction[]) {
  if (account.type === 'credit_card') {
    const remaining = computeOutstandingForCreditCard(account, transactions);
    if (remaining === null) return 'Limite não informado';
    return `Limite disponível: ${formatCentsToBRL(Math.max(remaining, 0))}`;
  }

  if (account.balance_cents != null) {
    return `Saldo estimado: ${formatCentsToBRL(account.balance_cents)}`;
  }

  return 'Saldo não informado';
}

interface AccountsCardProps {
  accounts: Account[] | undefined;
  transactions: Transaction[] | undefined;
}

export function AccountsCard({ accounts, transactions }: AccountsCardProps) {
  if (!accounts || accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contas</CardTitle>
          <CardDescription>Cadastre contas para controlar limites e saldos.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma conta cadastrada.</p>
        </CardContent>
      </Card>
    );
  }

  const transactionsList = transactions || [];
  const creditCardAccounts = accounts.filter((account) => account.type === 'credit_card');
  const creditCardLimitTotal = creditCardAccounts.reduce(
    (total, account) => total + (account.limit_cents ?? 0),
    0
  );
  const creditCardAvailableTotal = creditCardAccounts.reduce((total, account) => {
    const remaining = computeOutstandingForCreditCard(account, transactionsList);
    return total + Math.max(remaining ?? 0, 0);
  }, 0);

  const otherBalancesTotal = accounts
    .filter((account) => account.type !== 'credit_card')
    .reduce((total, account) => total + (account.balance_cents ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contas</CardTitle>
        <CardDescription>Acompanhe limites e saldos por conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground font-medium">
              Contas ativas
            </p>
            <p className="text-lg font-semibold mt-1">{accounts.filter((account) => account.is_active).length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground font-medium">
              Limite disponível (cartões)
            </p>
            <p className="text-lg font-semibold mt-1">{formatCentsToBRL(Math.max(creditCardAvailableTotal, 0))}</p>
            {creditCardLimitTotal > 0 && (
              <p className="text-xs text-muted-foreground">
                de {formatCentsToBRL(creditCardLimitTotal)}
              </p>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground font-medium">
              Saldos estimados
            </p>
            <p className="text-lg font-semibold mt-1">{formatCentsToBRL(Math.max(otherBalancesTotal, 0))}</p>
          </div>
        </div>

        {accounts.map((account) => (
          <div
            key={account.id}
            className="flex items-start justify-between rounded-lg border p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
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
              <p className="text-xs text-muted-foreground">
                {computeBalanceHint(account, transactions || [])}
              </p>
            </div>
            <div className="text-right space-y-1">
              {account.limit_cents != null && (
                <p className="text-sm">
                  Limite: <span className="font-medium">{formatCentsToBRL(account.limit_cents)}</span>
                </p>
              )}
              {account.balance_cents != null && account.type !== 'credit_card' && (
                <p className="text-sm">
                  Saldo: <span className="font-medium">{formatCentsToBRL(account.balance_cents)}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
