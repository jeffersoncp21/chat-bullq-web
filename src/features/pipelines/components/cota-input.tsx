'use client';

import type { ChangeEvent } from 'react';
import { maskBRLInput } from '../lib/card-values';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Campo do valor da cota com "R$" na frente e milhar formatado enquanto digita
 * (150000 → 150.000). O valor continua sendo lido com parseBRL ao salvar.
 */
export function CotaInput({ value, onChange, placeholder = '150.000' }: Props) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    // Quantos dígitos/vírgula havia antes do cursor: o cursor volta para depois
    // do mesmo dígito, em vez de pular para o fim quando a máscara põe um ponto.
    const antes = el.value.slice(0, caret).replace(/[^\d,]/g, '').length;
    const formatado = maskBRLInput(el.value);
    onChange(formatado);
    requestAnimationFrame(() => {
      let pos = 0;
      let contados = 0;
      while (pos < formatado.length && contados < antes) {
        if (/[\d,]/.test(formatado[pos])) contados++;
        pos++;
      }
      if (document.activeElement === el) el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative mt-1">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-zinc-500">
        R$
      </span>
      <input
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="decimal"
        className="w-full rounded-md border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm tabular-nums dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
    </div>
  );
}
