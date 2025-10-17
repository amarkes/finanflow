import { addMonths, lastDayOfMonth } from 'date-fns';

export type RecurrenceType = 'single' | 'installment' | 'monthly';

export const MONTHLY_OCCURRENCES = 12;

export function calculateInstallments(totalCents: number, quantity: number): number[] {
  if (quantity < 2) {
    throw new Error('Quantidade de parcelas deve ser maior ou igual a 2.');
  }

  const base = Math.floor(totalCents / quantity);
  const remainder = totalCents % quantity;

  return Array.from({ length: quantity }, (_, index) =>
    base + (index < remainder ? 1 : 0)
  );
}

export function generateMonthlyDates(start: Date, occurrences: number): Date[] {
  const day = start.getDate();

  return Array.from({ length: occurrences }, (_, index) => {
    const candidate = addMonths(start, index);
    const normalizedLastDay = lastDayOfMonth(candidate).getDate();
    const target = Math.min(day, normalizedLastDay);

    const result = new Date(candidate);
    result.setDate(target);
    result.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
    return result;
  });
}

export function generateSeriesId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function isSeriesType(seriesType: RecurrenceType): boolean {
  return seriesType !== 'single';
}

export function formatSeriesLabel(options: {
  series_type: RecurrenceType;
  series_sequence?: number | null;
  series_total?: number | null;
}): string {
  const { series_type, series_sequence, series_total } = options;

  if (series_type === 'installment') {
    return `Parcelada ${series_sequence ?? 1}/${series_total ?? 0}`;
  }

  if (series_type === 'monthly') {
    return `Mensal ${series_sequence ?? 1}/${series_total ?? MONTHLY_OCCURRENCES}`;
  }

  return 'Única';
}
