import { useState } from 'react';
import clsx from 'clsx';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Card, Column } from '@/lib/kanban';
import { KanbanCard } from '@/components/KanbanCard';
import { NewCardForm } from '@/components/NewCardForm';

type KanbanColumnProps = {
  column: Column;
  cards: Card[];
  onRename: (columnId: string, title: string) => void;
  onRenameCommit: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddCard: (columnId: string, title: string, details: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  highlightedCardIds?: Set<string>;
};

export const KanbanColumn = ({
  column,
  cards,
  onRename,
  onRenameCommit,
  onDeleteColumn,
  onAddCard,
  onDeleteCard,
  highlightedCardIds,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section
      ref={setNodeRef}
      className={clsx(
        'flex flex-col h-full rounded-2xl border bg-[var(--bg-surface)] transition-colors',
        isOver
          ? 'border-[var(--accent-amber)]/50 bg-[var(--accent-amber-glow)]'
          : 'border-[var(--border)]',
      )}
      data-testid={`column-${column.id}`}
    >
      {/* Column header */}
      <div className='flex-shrink-0 px-4 pt-4 pb-3'>
        <div className='flex items-center justify-between gap-2 mb-3'>
          <span className='text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]'>
            {cards.length} {cards.length === 1 ? 'card' : 'cards'}
          </span>
          <button
            onClick={() => {
              if (confirmDelete) {
                onDeleteColumn(column.id);
              } else {
                setConfirmDelete(true);
                setTimeout(() => setConfirmDelete(false), 3000);
              }
            }}
            className={clsx(
              'rounded-md px-2 py-0.5 text-[10px] font-semibold transition',
              confirmDelete
                ? 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--red)] hover:bg-[var(--red-dim)]',
            )}
          >
            {confirmDelete ? 'Confirm?' : '×'}
          </button>
        </div>
        <input
          value={column.title}
          onChange={(e) => onRename(column.id, e.target.value)}
          onBlur={(e) => onRenameCommit(column.id, e.target.value)}
          className='w-full bg-transparent font-display text-base font-bold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] hover:opacity-80 focus:opacity-100 transition-opacity'
          aria-label='Column title'
        />
        <div className='mt-3 h-px bg-[var(--border)]' />
      </div>

      {/* Scrollable cards area */}
      <div className='flex-1 overflow-y-auto min-h-0 px-3 pb-3 flex flex-col gap-2'>
        <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              onDelete={(cardId) => onDeleteCard(column.id, cardId)}
              isHighlighted={highlightedCardIds?.has(card.id)}
            />
          ))}
        </SortableContext>
        {cards.length === 0 && (
          <div className='flex-1 flex items-center justify-center min-h-[80px] rounded-lg border border-dashed border-[var(--border)] text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]'>
            Drop here
          </div>
        )}
      </div>

      {/* Add card form - fixed at bottom */}
      <div className='flex-shrink-0 px-3 pb-3'>
        <NewCardForm onAdd={(title, details) => onAddCard(column.id, title, details)} />
      </div>
    </section>
  );
};
