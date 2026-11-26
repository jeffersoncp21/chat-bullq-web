'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { pipelinesService, type CardSummary } from '../services/pipelines.service';
import { criarFiltroDeCards } from '../lib/card-search';
import { KanbanColumn } from './kanban-column';
import { PipelineKpis } from './pipeline-kpis';
import { KanbanCard } from './kanban-card';
import { CardDialog } from './card-dialog';
import { AddConversationDialog } from './add-conversation-dialog';
import { ConversationDialog } from '@/features/inbox/components/conversation-dialog';

interface Props {
  pipelineId: string;
}

export function KanbanBoard({ pipelineId }: Props) {
  const qc = useQueryClient();
  const [activeCard, setActiveCard] = useState<CardSummary | null>(null);
  // Edit dialog (existing card)
  const [editingCard, setEditingCard] = useState<CardSummary | null>(null);
  // Add-conversation dialog (new card from existing conversation)
  const [addStageId, setAddStageId] = useState<string | null>(null);
  // Conversation popup (when card has a linked conversation, click opens chat).
  const [viewingConvId, setViewingConvId] = useState<string | null>(null);
  // Busca do quadro: filtra os cards na tela (o board já vem inteiro).
  const [busca, setBusca] = useState('');

  const { data: board, isLoading } = useQuery({
    queryKey: ['pipeline-board', pipelineId],
    queryFn: () => pipelinesService.getBoard(pipelineId),
  });

  const filtro = useMemo(() => criarFiltroDeCards(busca), [busca]);
  const { cardsVisiveis, totalCards, totalVisiveis } = useMemo(() => {
    const visiveis: Record<string, CardSummary[]> = {};
    let total = 0;
    let achados = 0;
    for (const [stageId, lista] of Object.entries(board?.cards ?? {})) {
      const filtrada = filtro ? lista.filter(filtro) : lista;
      visiveis[stageId] = filtrada;
      total += lista.length;
      achados += filtrada.length;
    }
    return { cardsVisiveis: visiveis, totalCards: total, totalVisiveis: achados };
  }, [board, filtro]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Build a fast lookup: cardId → { stageId, index } for the move handler.
  const cardIndex = useMemo(() => {
    const idx = new Map<string, { stageId: string; index: number }>();
    if (board) {
      for (const stageId of Object.keys(board.cards)) {
        board.cards[stageId].forEach((c, i) =>
          idx.set(c.id, { stageId, index: i }),
        );
      }
    }
    return idx;
  }, [board]);

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const data = event.active.data.current as any;
    if (data?.type === 'card') setActiveCard(data.card as CardSummary);
    else {
      // fallback: search the board
      for (const stageId of Object.keys(board?.cards ?? {})) {
        const found = board!.cards[stageId].find((c) => c.id === cardId);
        if (found) {
          setActiveCard(found);
          break;
        }
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveCard(null);
    const { active, over } = event;
    if (!over || !board) return;

    const cardId = active.id as string;
    const targetStageId = over.id as string;
    const target = board.stages.find((s) => s.id === targetStageId);
    if (!target) return;

    const source = cardIndex.get(cardId);
    if (!source) return;

    // Drop appends to end of target column.
    const toIndex =
      source.stageId === targetStageId
        ? Math.max(0, board.cards[targetStageId].length - 1)
        : board.cards[targetStageId].length;

    if (source.stageId === targetStageId && source.index === toIndex) return;

    // Optimistic: rebuild the board locally.
    qc.setQueryData<typeof board>(['pipeline-board', pipelineId], (prev) => {
      if (!prev) return prev;
      const newCards = { ...prev.cards };
      const sourceList = [...newCards[source.stageId]];
      const [moved] = sourceList.splice(source.index, 1);
      newCards[source.stageId] = sourceList;
      const targetList = [...(newCards[targetStageId] ?? [])];
      targetList.splice(toIndex, 0, { ...moved, stageId: targetStageId });
      newCards[targetStageId] = targetList;
      return { ...prev, cards: newCards };
    });

    try {
      await pipelinesService.moveCard(cardId, targetStageId, toIndex);
      // Server emits card:moved via socket; refetch to sync orders precisely.
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Erro ao mover');
      qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
    }
  };

  if (isLoading || !board) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Carregando board…
      </div>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-full flex-col">
          <PipelineKpis board={board} />
          <div className="flex items-center gap-3 px-4 pb-3">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setBusca('');
                }}
                placeholder="Buscar por nome, telefone ou descrição"
                aria-label="Buscar cards no funil"
                className="w-full rounded-md border border-zinc-200 bg-white py-1.5 pl-8 pr-8 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 [&::-webkit-search-cancel-button]:hidden"
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Limpar busca"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {filtro && (
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {totalVisiveis === 0
                  ? 'Nenhum card encontrado'
                  : `${totalVisiveis} de ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
              </span>
            )}
          </div>
          <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-4 pb-4">
            {board.stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                cards={cardsVisiveis[stage.id] ?? []}
                filtrando={!!filtro}
                onAddCard={() => setAddStageId(stage.id)}
                onCardClick={(c) => {
                  // Click primário: abre a conversa em popup. Sem conversa
                  // vinculada, cai pra edição do card como fallback.
                  if (c.conversationId) setViewingConvId(c.conversationId);
                  else setEditingCard(c);
                }}
                // Lápis no card: edição sempre, mesmo com conversa vinculada.
                onCardEdit={(c) => setEditingCard(c)}
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeCard ? <KanbanCard card={activeCard} /> : null}
        </DragOverlay>
      </DndContext>

      <CardDialog
        open={!!editingCard}
        pipelineId={pipelineId}
        card={editingCard}
        stageId={null}
        onClose={() => setEditingCard(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setEditingCard(null);
        }}
      />

      <AddConversationDialog
        open={!!addStageId}
        pipelineId={pipelineId}
        stageId={addStageId}
        onClose={() => setAddStageId(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['pipeline-board', pipelineId] });
          setAddStageId(null);
        }}
      />

      <ConversationDialog
        open={!!viewingConvId}
        conversationId={viewingConvId}
        onClose={() => setViewingConvId(null)}
      />
    </>
  );
}
