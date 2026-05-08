import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Card } from '@/lib/kanban';

type CardEditorProps = {
  card: Card;
  onClose: () => void;
  onSave: (cardId: string, title: string, details: string) => Promise<void>;
  actionsRef?: MutableRefObject<{ save: () => Promise<void> } | null>;
};

export const CardEditor = ({ card, onClose, onSave, actionsRef }: CardEditorProps) => {
  const [title, setTitle] = useState(card.title);
  const [details, setDetails] = useState(card.details);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  // Sync when Kai updates the card externally
  useEffect(() => { setTitle(card.title); }, [card.title]);
  useEffect(() => { setDetails(card.details); }, [card.details]);

  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(card.id, title.trim(), details.trim());
    setSaving(false);
  };

  // Keep actionsRef current so Kai can trigger save with live editor state
  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  useEffect(() => {
    if (!actionsRef) return;
    actionsRef.current = { save: () => handleSaveRef.current() };
    return () => { actionsRef.current = null; };
  }, [actionsRef]);

  return (
    <div className='absolute inset-0 z-10 flex flex-col bg-[var(--bg-base)] p-6 overflow-y-auto'>
      <div className='flex items-center justify-between mb-6 flex-shrink-0'>
        <div className='flex items-center gap-3'>
          <button
            onClick={onClose}
            className='flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
          >
            <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
              <path d='M7 2L3 6L7 10' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
            </svg>
            Board
          </button>
          <span className='text-[10px] font-mono text-[var(--text-muted)]'>
            #{card.id.replace('card-', '')}
          </span>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={onClose}
            className='rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className='rounded-xl bg-[var(--accent-cyan)] px-4 py-2 text-xs font-bold text-[var(--bg-base)] transition hover:brightness-110 disabled:opacity-40'
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className='mb-5 flex-shrink-0'>
        <label className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2'>
          Title
        </label>
        <input
          ref={titleRef}
          type='text'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder='Card title'
          className='w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 font-display text-lg font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors'
        />
      </div>

      <div className='flex-1 flex flex-col min-h-0'>
        <label className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2 flex-shrink-0'>
          Description
        </label>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSave(); }}
          placeholder='Add a description...'
          className='flex-1 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors resize-none leading-relaxed min-h-[200px]'
        />
        <p className='mt-2 text-[10px] text-[var(--text-muted)]'>Ctrl+Enter to save · Escape to cancel</p>
      </div>
    </div>
  );
};
