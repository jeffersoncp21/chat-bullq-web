import type { CardSummary } from '../services/pipelines.service';

/** Minúsculas e sem acento: "Júlia" e "julia" batem. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function textoDoCard(card: CardSummary): string {
  return normalizar(
    [card.title, card.description, card.contact?.name, card.contact?.phone, card.closedReason]
      .filter(Boolean)
      .join(' '),
  );
}

/**
 * Monta o filtro da busca do quadro. Procura no título, na descrição, no
 * nome e no telefone do contato e no motivo de perda.
 * - Texto: cada palavra precisa aparecer em algum desses campos, sem ligar
 *   para acento e maiúscula ("ana imovel" acha "Ana Júlia · Imóvel").
 * - Telefone: busca feita só de números e pontuação de telefone, com 3+
 *   dígitos, compara os dígitos ("(18) 99622-1473" e "99622" acham
 *   5518996221473).
 * Busca vazia devolve null (sem filtro).
 */
export function criarFiltroDeCards(busca: string): ((card: CardSummary) => boolean) | null {
  const limpa = busca.trim();
  if (!limpa) return null;

  const digitos = limpa.replace(/\D/g, '');
  if (/^[\d\s().+-]+$/.test(limpa) && digitos.length >= 3) {
    return (card) =>
      (card.contact?.phone ?? '').replace(/\D/g, '').includes(digitos) ||
      textoDoCard(card).replace(/\D/g, ' ').split(' ').some((n) => n.includes(digitos));
  }

  const termos = normalizar(limpa).split(/\s+/);
  return (card) => {
    const texto = textoDoCard(card);
    return termos.every((termo) => texto.includes(termo));
  };
}
