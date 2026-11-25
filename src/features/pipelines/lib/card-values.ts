import type { CardSummary } from '../services/pipelines.service';

/** Valor do card (valor da carta) como número; vazio ou inválido conta como 0. */
export function cardValue(card: Pick<CardSummary, 'value'>): number {
  const v = card.value;
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const pct = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** R$ 1.250.000 */
export const formatBRL = (n: number) => brl.format(n);
/** R$ 1,3 mi · R$ 300 mil */
export const formatBRLCompact = (n: number) => brlCompact.format(n);
/** 12,5% */
export const formatPct = (ratio: number) => pct.format(ratio);
