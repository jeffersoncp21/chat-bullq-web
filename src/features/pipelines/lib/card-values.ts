import type { CardSummary } from '../services/pipelines.service';

/** Valor do card (valor da carta) como número; vazio ou inválido conta como 0. */
export function cardValue(card: Pick<CardSummary, 'value'>): number {
  const v = card.value;
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Lê um valor digitado em formato brasileiro.
 * "150.000,00", "150.000", "150000", "R$ 1.250.000", "4500,50" e "4500.50"
 * viram número. Vazio retorna undefined; texto inválido retorna NaN.
 */
export function parseBRL(input: string): number | undefined {
  const s = input.replace(/R\$|\s/g, '');
  if (!s) return undefined;
  let normalized: string;
  if (s.includes(',')) {
    // Vírgula é o decimal; pontos são milhar.
    normalized = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Só pontos em grupos de 3 ("150.000"): é milhar, não decimal.
    normalized = s.replace(/\./g, '');
  } else {
    normalized = s;
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) return NaN;
  return parseFloat(normalized);
}

/**
 * Formata o campo do valor da cota enquanto a pessoa digita:
 * "150000" → "150.000", "1250000,5" → "1.250.000,5".
 * Ponto é sempre milhar (é a máscara que põe); vírgula é o decimal, até 2 casas.
 */
export function maskBRLInput(raw: string): string {
  const semLixo = raw.replace(/[^\d,]/g, '');
  const virgula = semLixo.indexOf(',');
  const inteiro = (virgula >= 0 ? semLixo.slice(0, virgula) : semLixo).replace(/^0+(?=\d)/, '');
  const decimal = virgula >= 0 ? semLixo.slice(virgula + 1).replace(/,/g, '').slice(0, 2) : '';
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (virgula < 0) return comMilhar;
  return `${comMilhar || '0'},${decimal}`;
}

/** Valor do card pronto pra preencher o campo: 150000 → "150.000". */
export function toBRLInput(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
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
