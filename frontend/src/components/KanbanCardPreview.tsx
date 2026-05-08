import type { Card } from '@/lib/kanban';

type KanbanCardPreviewProps = {
  card: Card;
};

export const KanbanCardPreview = ({ card }: KanbanCardPreviewProps) => (
  <article className='relative rounded-xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--accent-cyan)]/30 shadow-[0_16px_40px_rgba(0,0,0,0.7),0_0_0_1px_rgba(0,211,255,0.1)] scale-[1.02]'>
    <div className='absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent-cyan)]' />
    <div className='pl-4 pr-3 py-3'>
      <h4 className='font-display text-sm font-bold text-[var(--text-primary)] leading-snug'>
        {card.title}
      </h4>
      {card.details && (
        <p className='mt-1.5 text-xs text-[var(--text-secondary)] leading-[1.6] line-clamp-2'>
          {card.details}
        </p>
      )}
    </div>
  </article>
);
