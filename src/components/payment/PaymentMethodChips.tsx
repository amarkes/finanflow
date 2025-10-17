/* eslint-disable react-refresh/only-export-components */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AccountType } from '@/hooks/useAccounts';

export type PaymentMethodOption = {
  label: string;
  value: string;
  accountTypes?: AccountType[];
};

export const PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { label: 'Cartão de crédito', value: 'Cartão de crédito', accountTypes: ['credit_card'] },
  { label: 'Cartão de débito', value: 'Cartão de débito', accountTypes: ['debit_card'] },
  { label: 'Dinheiro', value: 'Dinheiro', accountTypes: ['cash'] },
  { label: 'Pix', value: 'Pix', accountTypes: ['pix'] },
  { label: 'Boleto', value: 'Boleto', accountTypes: ['boleto'] },
  { label: 'Alimentação', value: 'Alimentação', accountTypes: ['food_voucher'] },
  { label: 'Transferência', value: 'Transferência', accountTypes: ['transfer', 'bank_account'] },
  { label: 'Carteira digital', value: 'Carteira digital', accountTypes: ['ewallet'] },
  { label: 'Conta bancária', value: 'Conta bancária', accountTypes: ['bank_account'] },
];

export const PAYMENT_METHOD_ACCOUNT_TYPES: Record<string, AccountType[]> = PAYMENT_METHOD_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.accountTypes ?? [];
    return acc;
  },
  {} as Record<string, AccountType[]>
);

interface PaymentMethodChipsProps {
  selected?: string | null;
  onSelect: (value: string) => void;
  options?: PaymentMethodOption[];
}

export function PaymentMethodChips({
  selected,
  onSelect,
  options = PAYMENT_METHOD_OPTIONS,
}: PaymentMethodChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.value === selected;
        return (
          <Button
            key={option.value}
            type="button"
            variant={isActive ? 'default' : 'outline'}
            size="sm"
            className={cn('rounded-full', isActive ? '' : 'bg-background')}
            onClick={() => onSelect(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
