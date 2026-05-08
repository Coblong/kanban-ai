'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { api, type ApiBoardSummary } from '../../lib/api';

const BOARD_COLORS = [
  '#00d3ff', '#7c3aed', '#10b981', '#f43f5e',
  '#f97316', '#f59e0b', '#ec4899', '#6366f1',
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function BoardCard({
  board,
  onDelete,
  onClick,
}: {
  board: ApiBoardSummary;
  onDelete: (id: number) => void;
  onClick: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className='group relative flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 cursor-pointer transition-all hover:border-[var(--border-hover)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:-translate-y-0.5'
      onClick={() => onClick(board.id)}
    >
      <div className='flex items-start justify-between gap-4'>
        <div
          className='flex h-9 w-9 items-center justify-center rounded-xl border'
          style={{ backgroundColor: `${board.color}18`, borderColor: `${board.color}30` }}
        >
          <span className='font-display text-sm font-bold' style={{ color: board.color }}>
            {board.title.charAt(0).toUpperCase()}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirmDelete) {
              onDelete(board.id);
            } else {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 3000);
            }
          }}
          className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition opacity-0 group-hover:opacity-100 ${
            confirmDelete
              ? 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/20'
              : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--red)]/30 hover:text-[var(--red)] hover:bg-[var(--red-dim)]'
          }`}
        >
          {confirmDelete ? 'Confirm?' : 'Delete'}
        </button>
      </div>

      <div>
        <h3 className='font-display text-base font-bold text-[var(--text-primary)] leading-tight'>
          {board.title}
        </h3>
        {board.description && (
          <p className='mt-1 text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed'>
            {board.description}
          </p>
        )}
      </div>

      <p className='text-[10px] text-[var(--text-secondary)] mt-auto'>
        Updated {formatDate(board.updated_at)}
      </p>

      <div className='absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full opacity-40 transition-opacity group-hover:opacity-80' style={{ backgroundColor: board.color }} />
    </div>
  );
}

function CreateBoardModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, description: string, color: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(BOARD_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onCreate(title.trim(), description.trim(), color);
    setLoading(false);
  };

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4'
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className='w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.8)]'>
        <h2 className='font-display text-xl font-bold text-[var(--text-primary)] mb-6'>New Board</h2>
        <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
          <div>
            <label className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2'>
              Board Name
            </label>
            <input
              autoFocus
              type='text'
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Sprint 12'
              className='w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors'
            />
          </div>
          <div>
            <label className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2'>
              Description{' '}
              <span className='text-[var(--text-muted)] normal-case tracking-normal font-normal'>
                (optional)
              </span>
            </label>
            <input
              type='text'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What is this board for?'
              className='w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors'
            />
          </div>
          <div>
            <label className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2'>
              Color
            </label>
            <div className='flex gap-2'>
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  type='button'
                  onClick={() => setColor(c)}
                  className='w-7 h-7 rounded-full transition-transform hover:scale-110'
                  style={{
                    backgroundColor: c,
                    boxShadow: color === c ? `0 0 0 2px var(--bg-surface), 0 0 0 4px ${c}` : 'none',
                  }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <div className='flex gap-3 pt-1'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading || !title.trim()}
              className='flex-1 rounded-xl px-5 py-3 text-sm font-bold text-[var(--bg-base)] transition hover:brightness-110 disabled:opacity-40'
              style={{ backgroundColor: color }}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BoardsPage() {
  const { isLoggedIn, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const [boards, setBoards] = useState<ApiBoardSummary[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) router.push('/login');
  }, [isLoggedIn, isLoading, router]);

  useEffect(() => {
    if (isLoggedIn) {
      api
        .listBoards()
        .then(setBoards)
        .catch(() => {})
        .finally(() => setLoadingBoards(false));
    }
  }, [isLoggedIn]);

  const handleCreate = async (title: string, description: string, color: string) => {
    const newBoard = await api.createBoard(title, description || undefined, color);
    setShowCreate(false);
    router.push(`/boards/${newBoard.id}`);
  };

  const handleDelete = async (boardId: number) => {
    await api.deleteBoard(boardId);
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (isLoading || loadingBoards) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]'>
          Loading...
        </p>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className='min-h-screen'>
      <div className='pointer-events-none fixed inset-0 overflow-hidden'>
        <div className='absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[var(--accent-cyan)] opacity-[0.04] blur-3xl' />
        <div className='absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[var(--accent-violet)] opacity-[0.05] blur-3xl' />
      </div>

      <div className='relative mx-auto max-w-5xl px-6 py-10'>
        {/* Header */}
        <header className='flex items-center justify-between mb-10'>
          <div className='flex items-center gap-3'>
            <div className='w-2 h-2 rounded-full bg-[var(--accent-cyan)] shadow-[0_0_8px_var(--accent-cyan)]' />
            <div>
              <p className='text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-secondary)]'>
                Kanban AI
              </p>
              <h1 className='font-display text-2xl font-bold text-[var(--text-primary)] mt-0.5'>
                {user?.display_name ? `${user.display_name}'s Boards` : 'Your Boards'}
              </h1>
            </div>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setShowCreate(true)}
              className='rounded-xl bg-[var(--accent-cyan)] px-4 py-2.5 text-xs font-bold text-[var(--bg-base)] transition hover:brightness-110'
            >
              New Board
            </button>
            <button
              onClick={handleLogout}
              className='text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
            >
              Logout
            </button>
          </div>
        </header>

        {/* Board grid */}
        {boards.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-24 px-8 text-center'>
            <div className='flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] mb-5'>
              <span className='text-2xl text-[var(--text-secondary)]'>+</span>
            </div>
            <h3 className='font-display text-lg font-bold text-[var(--text-primary)]'>No boards yet</h3>
            <p className='mt-2 text-xs text-[var(--text-secondary)] max-w-xs leading-relaxed'>
              Create your first board to start organizing your work with drag-and-drop cards and AI assistance.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className='mt-6 rounded-xl bg-[var(--accent-cyan)] px-5 py-2.5 text-xs font-bold text-[var(--bg-base)] transition hover:brightness-110'
            >
              Create your first board
            </button>
          </div>
        ) : (
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                onDelete={handleDelete}
                onClick={(id) => router.push(`/boards/${id}`)}
              />
            ))}
            <button
              onClick={() => setShowCreate(true)}
              className='flex items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--border)] p-5 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-cyan)]/40 hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-glow)] min-h-[140px]'
            >
              <span className='text-base'>+</span>
              New Board
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateBoardModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
