'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../lib/auth/AuthContext';
import { api, type ApiBoardSummary } from '../../lib/api';

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
      className='group relative flex flex-col gap-3 rounded-[24px] border border-[var(--stroke)] bg-white p-6 shadow-[0_4px_20px_rgba(3,33,71,0.07)] cursor-pointer transition hover:shadow-[var(--shadow)] hover:-translate-y-0.5'
      onClick={() => onClick(board.id)}
    >
      <div className='flex items-start justify-between gap-4'>
        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-yellow)]'>
          <span className='text-[var(--navy-dark)] text-sm font-bold'>{board.title.charAt(0).toUpperCase()}</span>
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
          className='rounded-xl border border-[var(--stroke)] px-3 py-1.5 text-xs font-semibold text-[var(--gray-text)] opacity-0 group-hover:opacity-100 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500'
        >
          {confirmDelete ? 'Confirm?' : 'Delete'}
        </button>
      </div>

      <div>
        <h3 className='font-display text-lg font-semibold text-[var(--navy-dark)] leading-tight'>{board.title}</h3>
        {board.description && (
          <p className='mt-1 text-sm text-[var(--gray-text)] line-clamp-2'>{board.description}</p>
        )}
      </div>

      <p className='text-xs text-[var(--gray-text)] mt-auto'>Updated {formatDate(board.updated_at)}</p>
    </div>
  );
}

function CreateBoardModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    await onCreate(title.trim(), description.trim());
    setLoading(false);
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4'>
      <div className='w-full max-w-md rounded-[28px] border border-[var(--stroke)] bg-white p-8 shadow-[var(--shadow)]'>
        <h2 className='font-display text-xl font-semibold text-[var(--navy-dark)] mb-6'>New Board</h2>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)] mb-2'>
              Board Name
            </label>
            <input
              autoFocus
              type='text'
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. Sprint 12'
              className='w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] transition'
            />
          </div>
          <div>
            <label className='block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)] mb-2'>
              Description <span className='text-[var(--gray-text)] normal-case tracking-normal font-normal'>(optional)</span>
            </label>
            <input
              type='text'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='What is this board for?'
              className='w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] transition'
            />
          </div>
          <div className='flex gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              className='flex-1 rounded-2xl border border-[var(--stroke)] px-5 py-3 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading || !title.trim()}
              className='flex-1 rounded-2xl bg-[var(--navy-dark)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50'
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
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  useEffect(() => {
    if (isLoggedIn) {
      api.listBoards()
        .then(setBoards)
        .catch(() => {})
        .finally(() => setLoadingBoards(false));
    }
  }, [isLoggedIn]);

  const handleCreate = async (title: string, description: string) => {
    const newBoard = await api.createBoard(title, description || undefined);
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
      <div className='flex min-h-screen items-center justify-center'>
        <p className='text-sm text-[var(--gray-text)]'>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn) return null;

  return (
    <div className='relative min-h-screen overflow-clip'>
      <div className='pointer-events-none absolute left-0 top-0 h-[500px] w-[500px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.2)_0%,_transparent_70%)]' />
      <div className='pointer-events-none absolute bottom-0 right-0 h-[500px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.15)_0%,_transparent_70%)]' />

      <main className='relative mx-auto max-w-6xl px-6 pb-16 pt-12'>
        <header className='flex items-start justify-between gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur'>
          <div>
            <p className='text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]'>Project Management</p>
            <h1 className='mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)]'>Your Boards</h1>
            <p className='mt-2 text-sm text-[var(--gray-text)]'>
              Welcome{user?.display_name ? `, ${user.display_name}` : ''}. Select a board to get started.
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <button
              onClick={() => setShowCreate(true)}
              className='rounded-2xl bg-[var(--primary-blue)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90'
            >
              New Board
            </button>
            <button
              onClick={handleLogout}
              className='rounded-2xl border border-[var(--stroke)] bg-white px-5 py-3 text-sm font-semibold text-[var(--navy-dark)] transition hover:bg-gray-50'
            >
              Logout
            </button>
          </div>
        </header>

        <div className='mt-8'>
          {boards.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-[32px] border border-dashed border-[var(--stroke)] bg-white/50 py-24 px-8 text-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface)] mb-6'>
                <span className='text-3xl text-[var(--navy-dark)]'>+</span>
              </div>
              <h3 className='font-display text-xl font-semibold text-[var(--navy-dark)]'>No boards yet</h3>
              <p className='mt-2 text-sm text-[var(--gray-text)] max-w-sm'>
                Create your first board to start organizing your work with drag-and-drop cards and AI assistance.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className='mt-6 rounded-2xl bg-[var(--navy-dark)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90'
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
                className='flex items-center justify-center gap-3 rounded-[24px] border border-dashed border-[var(--stroke)] bg-white/50 p-6 text-sm font-semibold text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)] hover:bg-white min-h-[160px]'
              >
                <span className='text-lg'>+</span>
                New Board
              </button>
            </div>
          )}
        </div>
      </main>

      {showCreate && (
        <CreateBoardModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
