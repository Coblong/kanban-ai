import { useState, type FormEvent } from 'react';

const initialFormState = { title: '', details: '' };

type NewCardFormProps = {
  onAdd: (title: string, details: string) => void;
};

export const NewCardForm = ({ onAdd }: NewCardFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(initialFormState);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.title.trim()) return;
    onAdd(formState.title.trim(), formState.details.trim());
    setFormState(initialFormState);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setFormState(initialFormState);
  };

  return (
    <div className='pt-2'>
      {isOpen ? (
        <form onSubmit={handleSubmit} className='flex flex-col gap-2'>
          <input
            value={formState.title}
            onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
            placeholder='Card title'
            className='w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors'
            required
          />
          <textarea
            value={formState.details}
            onChange={(e) => setFormState((prev) => ({ ...prev, details: e.target.value }))}
            placeholder='Details (optional)'
            rows={2}
            className='w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--border-focus)] transition-colors'
          />
          <div className='flex items-center gap-2'>
            <button
              type='submit'
              className='flex-1 rounded-lg bg-[var(--accent-cyan)] py-1.5 text-xs font-bold text-[var(--bg-base)] transition hover:brightness-110'
            >
              Add card
            </button>
            <button
              type='button'
              onClick={handleCancel}
              className='rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type='button'
          onClick={() => setIsOpen(true)}
          className='w-full rounded-lg border border-dashed border-[var(--border)] py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-cyan)]/40 hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-glow)]'
        >
          + Add a card
        </button>
      )}
    </div>
  );
};
