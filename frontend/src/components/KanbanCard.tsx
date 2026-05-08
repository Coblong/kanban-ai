import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import type { Card } from '@/lib/kanban';

type KanbanCardProps = {
  card: Card;
  onDelete: (cardId: string) => void;
  isHighlighted?: boolean;
};

export const KanbanCard = ({ card, onDelete, isHighlighted = false }: KanbanCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative rounded-xl overflow-hidden',
        'bg-[var(--bg-elevated)] border border-[var(--border)]',
        'cursor-grab active:cursor-grabbing',
        'transition-all duration-150 ease-out',
        'hover:border-[var(--border-hover)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.5)]',
        isDragging && 'opacity-30 scale-[0.97]',
        isHighlighted && 'border-[var(--accent-amber)] card-highlighted',
      )}
      {...attributes}
      {...listeners}
      data-testid={`card-${card.id}`}
    >
      {/* Left accent stripe */}
      <div
        className={clsx(
          'absolute left-0 top-0 bottom-0 w-[3px] transition-colors',
          isHighlighted ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-cyan)] opacity-50 group-hover:opacity-80',
        )}
      />

      <div className='pl-4 pr-3 py-3'>
        <div className='flex items-start justify-between gap-2'>
          <div className='flex-1 min-w-0'>
            <h4 className='font-display text-sm font-bold text-[var(--text-primary)] leading-snug'>
              {card.title}
            </h4>
            {card.details && (
              <p className='mt-1.5 text-xs text-[var(--text-secondary)] leading-[1.6] line-clamp-3'>
                {card.details}
              </p>
            )}
          </div>
          <button
            type='button'
            onClick={(e) => { e.stopPropagation(); onDelete(card.id); }}
            onPointerDown={(e) => e.stopPropagation()}
            className='flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--red)] hover:bg-[var(--red-dim)] opacity-0 group-hover:opacity-100 transition-all text-sm leading-none'
            aria-label={`Delete ${card.title}`}
          >
            ×
          </button>
        </div>
      </div>
    </article>
  );
};
