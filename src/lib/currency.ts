// Utilitários para formatação de moeda BRL e conversão de centavos

/**
 * Formata centavos para BRL
 * @param cents Valor em centavos
 * @returns String formatada (ex: "R$ 1.234,56")
 */
export function formatCentsToBRL(cents: number): string {
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(reais);
}

/**
 * Converte string BRL para centavos
 * @param value String com valor (ex: "R$ 1.234,56" ou "1234,56")
 * @returns Valor em centavos
 */
export function parseBRLToCents(value: string): number {
  // Remove tudo exceto números e vírgula
  const cleanValue = value.replace(/[^\d,]/g, '');
  // Substitui vírgula por ponto
  const normalized = cleanValue.replace(',', '.');
  const reais = parseFloat(normalized);
  return Math.round(reais * 100);
}

/**
 * Formata data para pt-BR
 * @param date Data ISO ou Date object
 * @returns String formatada (ex: "25/03/2024")
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(d);
}
