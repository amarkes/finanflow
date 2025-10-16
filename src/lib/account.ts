import type { AccountType } from '@/hooks/useAccounts';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  cash: 'Dinheiro',
  pix: 'Pix',
  boleto: 'Boleto',
  food_voucher: 'Alimentação',
  transfer: 'Transferência',
  ewallet: 'Carteira digital',
  bank_account: 'Conta bancária',
};

export function getAccountTypeLabel(type: AccountType) {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}

export function isCreditCard(type: AccountType) {
  return type === 'credit_card';
}
