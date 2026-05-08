import { useState } from "react";
import clsx from "clsx";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, Column } from "@/lib/kanban";
import { KanbanCard } from "@/components/KanbanCard";
import { NewCardForm } from "@/components/NewCardForm";

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
        "flex min-h-[520px] flex-col rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] p-4 shadow-[var(--shadow)] transition",
        isOver && "ring-2 ring-[var(--accent-yellow)]"
      )}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-full">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-10 rounded-full bg-[var(--accent-yellow)]" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
                {cards.length} cards
              </span>
            </div>
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
                "rounded-xl px-2 py-1 text-xs font-semibold transition",
                confirmDelete
                  ? "bg-red-50 text-red-500 border border-red-200"
                  : "text-[var(--gray-text)] hover:text-red-400"
              )}
              title="Delete column"
            >
              {confirmDelete ? "Confirm?" : "×"}
            </button>
          </div>
          <input
            value={column.title}
            onChange={(event) => onRename(column.id, event.target.value)}
            onBlur={(event) => onRenameCommit(column.id, event.target.value)}
            className="mt-3 w-full bg-transparent font-display text-lg font-semibold text-[var(--navy-dark)] outline-none"
            aria-label="Column title"
          />
        </div>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3">
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
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--stroke)] px-3 py-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
            Drop a card here
          </div>
        )}
      </div>
      <NewCardForm onAdd={(title, details) => onAddCard(column.id, title, details)} />
    </section>
  );
};
