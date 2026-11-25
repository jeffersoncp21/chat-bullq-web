'use client';

import type { ReactNode } from 'react';
import { Trophy, X as XIcon } from 'lucide-react';
import type { BoardResponse } from '../services/pipelines.service';
import {
  cardValue,
  formatBRL,
  formatBRLCompact,
  formatPct,
} from '../lib/card-values';

interface Tile {
  label: string;
  value: string;
  sub: string;
  hint: string;
  icon?: ReactNode;
}

const plural = (n: number, um: string, varios: string) =>
  `${n} ${n === 1 ? um : varios}`;

/**
 * Faixa de indicadores no topo do quadro. Tudo é calculado com os cards que
 * o board já trouxe, usando o status do card (OPEN / WON / LOST), que a API
 * sincroniza com o tipo da etapa quando o card é movido.
 */
export function PipelineKpis({ board }: { board: BoardResponse }) {
  const cards = Object.values(board.cards).flat();
  const wonStage = board.stages.find((s) => s.type === 'WON');
  const lostStage = board.stages.find((s) => s.type === 'LOST');

  let abertoQtd = 0;
  let abertoValor = 0;
  let abertoSemValor = 0;
  let ganhoQtd = 0;
  let ganhoValor = 0;
  let perdidoQtd = 0;
  let perdidoValor = 0;
  let comValorQtd = 0;
  let comValorSoma = 0;

  for (const c of cards) {
    const v = cardValue(c);
    if (v > 0) {
      comValorQtd += 1;
      comValorSoma += v;
    }
    if (c.status === 'WON') {
      ganhoQtd += 1;
      ganhoValor += v;
    } else if (c.status === 'LOST') {
      perdidoQtd += 1;
      perdidoValor += v;
    } else {
      abertoQtd += 1;
      abertoValor += v;
      if (v <= 0) abertoSemValor += 1;
    }
  }

  const encerrados = ganhoQtd + perdidoQtd;
  const conversao = encerrados > 0 ? ganhoQtd / encerrados : null;
  const ticket = comValorQtd > 0 ? comValorSoma / comValorQtd : null;

  const tiles: Tile[] = [
    {
      label: 'Em aberto',
      value: formatBRLCompact(abertoValor),
      sub: `${plural(abertoQtd, 'lead', 'leads')} em andamento`,
      hint: `Soma das cartas dos leads em andamento: ${formatBRL(abertoValor)}`,
    },
    {
      label: 'Ticket médio da carta',
      value: ticket === null ? '—' : formatBRLCompact(ticket),
      sub: `média de ${plural(comValorQtd, 'carta informada', 'cartas informadas')}`,
      hint:
        ticket === null
          ? 'Nenhum card tem valor de carta ainda'
          : `Média das cartas informadas: ${formatBRL(ticket)}`,
    },
    {
      label: wonStage?.name ?? 'Ganho',
      icon: <Trophy className="h-3 w-3 shrink-0 text-green-600" />,
      value: formatBRLCompact(ganhoValor),
      sub: plural(ganhoQtd, 'venda', 'vendas'),
      hint: `Soma das cartas vendidas: ${formatBRL(ganhoValor)}`,
    },
    {
      label: 'Taxa de conversão',
      value: conversao === null ? '—' : formatPct(conversao),
      sub:
        encerrados > 0
          ? `${ganhoQtd} de ${plural(encerrados, 'encerrado', 'encerrados')}`
          : 'nenhum lead encerrado',
      hint: 'Vendidos ÷ (vendidos + perdidos). Leads em andamento não entram na conta.',
    },
    {
      label: lostStage?.name ?? 'Perdido',
      icon: <XIcon className="h-3 w-3 shrink-0 text-red-600" />,
      value: formatBRLCompact(perdidoValor),
      sub: plural(perdidoQtd, 'lead', 'leads'),
      hint: `Soma das cartas dos leads perdidos: ${formatBRL(perdidoValor)}`,
    },
    {
      label: 'Sem valor da carta',
      value: String(abertoSemValor),
      sub: `de ${plural(abertoQtd, 'lead', 'leads')} em aberto`,
      hint: 'Leads em andamento que ainda não têm o valor da carta preenchido',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 px-4 pb-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          title={t.hint}
          className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
            {t.icon}
            <span className="truncate">{t.label}</span>
          </div>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {t.value}
          </p>
          <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">
            {t.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
