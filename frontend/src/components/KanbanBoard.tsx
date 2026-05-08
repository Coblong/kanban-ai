'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { KanbanColumn } from '@/components/KanbanColumn';
import { KanbanCardPreview } from '@/components/KanbanCardPreview';
import { ChatSidebar } from '@/components/ChatSidebar';
import { boardFromApi, moveCard, numericId, type BoardData } from '@/lib/kanban';
import { api, type ApiBoard, type CardOperation } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';

type Props = { boardId: number };

export const KanbanBoard = ({ boardId }: Props) => {
  const [board, setBoard] = useState<BoardData>({ columns: [], cards: {} });
  const [boardTitle, setBoardTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [highlightedCardIds, setHighlightedCardIds] = useState<Set<string>>(new Set());
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { logout } = useAuth();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    api.getBoard(boardId)
      .then((apiBoard) => {
        setBoard(boardFromApi(apiBoard));
        setBoardTitle(apiBoard.title);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load board. Please refresh.');
        setLoading(false);
      });
  }, [boardId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCardId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCardId(null);
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const previousColumns = board.columns;
    const newColumns = moveCard(board.columns, activeId, overId);
    setBoard((prev) => ({ ...prev, columns: newColumns }));

    const targetColumn = newColumns.find((col) => col.cardIds.includes(activeId));
    if (!targetColumn) return;
    const position = targetColumn.cardIds.indexOf(activeId);

    try {
      await api.moveCard(numericId(activeId), numericId(targetColumn.id), position);
    } catch {
      setBoard((prev) => ({ ...prev, columns: previousColumns }));
    }
  };

  const handleRenameColumn = (columnId: string, title: string) => {
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.map((col) => (col.id === columnId ? { ...col, title } : col)),
    }));
  };

  const handleRenameColumnCommit = async (columnId: string, title: string) => {
    try {
      await api.renameColumn(numericId(columnId), title);
    } catch {
      const apiBoard = await api.getBoard(boardId).catch(() => null);
      if (apiBoard) setBoard(boardFromApi(apiBoard));
    }
  };

  const handleDeleteColumn = async (columnId: string) => {
    const previousBoard = board;
    setBoard((prev) => ({
      ...prev,
      columns: prev.columns.filter((col) => col.id !== columnId),
    }));
    try {
      await api.deleteColumn(numericId(columnId));
    } catch {
      setBoard(previousBoard);
    }
  };

  const handleAddColumn = async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    setAddingColumn(false);
    setNewColumnTitle('');
    try {
      const col = await api.createColumn(boardId, title);
      const colId = `col-${col.id}`;
      setBoard((prev) => ({
        ...prev,
        columns: [...prev.columns, { id: colId, title: col.title, cardIds: [] }],
      }));
    } catch {}
  };

  const handleAddCard = async (columnId: string, title: string, details: string) => {
    try {
      const newCard = await api.createCard(numericId(columnId), title, details || undefined);
      const cardId = `card-${newCard.id}`;
      setBoard((prev) => ({
        ...prev,
        cards: { ...prev.cards, [cardId]: { id: cardId, title: newCard.title, details: newCard.description ?? '' } },
        columns: prev.columns.map((col) => (col.id === columnId ? { ...col, cardIds: [...col.cardIds, cardId] } : col)),
      }));
    } catch {}
  };

  const handleDeleteCard = async (columnId: string, cardId: string) => {
    const previousBoard = board;
    setBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(Object.entries(prev.cards).filter(([id]) => id !== cardId)),
      columns: prev.columns.map((col) => (col.id === columnId ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) } : col)),
    }));
    try {
      await api.deleteCard(numericId(cardId));
    } catch {
      setBoard(previousBoard);
    }
  };

  const handleBoardUpdate = useCallback(
    (apiBoard: ApiBoard, operations: CardOperation[]) => {
      const oldCardIds = new Set(Object.keys(board.cards));
      const newBoard = boardFromApi(apiBoard);
      setBoard(newBoard);

      const toHighlight = new Set<string>();
      for (const op of operations) {
        if (op.card_id) toHighlight.add(`card-${op.card_id}`);
      }
      for (const id of Object.keys(newBoard.cards)) {
        if (!oldCardIds.has(id)) toHighlight.add(id);
      }

      if (toHighlight.size > 0) {
        setHighlightedCardIds(toHighlight);
        if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setHighlightedCardIds(new Set()), 2000);
      }
    },
    [board.cards],
  );

  const handleRenameBoardCommit = async () => {
    setEditingTitle(false);
    if (!boardTitle.trim()) return;
    try {
      await api.updateBoard(boardId, { title: boardTitle.trim() });
    } catch {}
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch {}
    logout();
    router.push('/login');
  };

  const activeCard = activeCardId ? board.cards[activeCardId] : null;

  if (loading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <p className='text-sm font-semibold text-[var(--gray-text)]'>Loading board...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex min-h-screen items-center justify-center gap-4'>
        <p className='text-sm font-semibold text-red-500'>{error}</p>
        <button onClick={() => router.push('/boards')} className='text-sm text-[var(--primary-blue)] underline'>
          Back to boards
        </button>
      </div>
    );
  }

  return (
    <div className='relative overflow-clip'>
      <div className='pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]' />
      <div className='pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]' />

      <main className='relative mx-auto flex min-h-screen max-w-[1800px] flex-col gap-10 px-6 pb-16 pt-12'>
        <header className='flex flex-col gap-6 rounded-[32px] border border-[var(--stroke)] bg-white/80 p-8 shadow-[var(--shadow)] backdrop-blur'>
          <div className='flex flex-wrap items-start justify-between gap-6'>
            <div className='flex items-start gap-4'>
              <button
                onClick={() => router.push('/boards')}
                className='mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)] hover:text-[var(--navy-dark)] transition'
              >
                ← Boards
              </button>
              <div>
                <p className='text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]'>Kanban Board</p>
                {editingTitle ? (
                  <input
                    autoFocus
                    value={boardTitle}
                    onChange={(e) => setBoardTitle(e.target.value)}
                    onBlur={handleRenameBoardCommit}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameBoardCommit()}
                    className='mt-3 bg-transparent font-display text-4xl font-semibold text-[var(--navy-dark)] outline-none border-b-2 border-[var(--primary-blue)]'
                  />
                ) : (
                  <h1
                    className='mt-3 font-display text-4xl font-semibold text-[var(--navy-dark)] cursor-pointer hover:opacity-70 transition'
                    onClick={() => setEditingTitle(true)}
                    title='Click to rename'
                  >
                    {boardTitle}
                  </h1>
                )}
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <button
                onClick={handleLogout}
                className='rounded-2xl border border-[var(--stroke)] bg-white px-5 py-4 text-sm font-semibold text-[var(--navy-dark)] hover:bg-gray-50 transition-colors'
              >
                Logout
              </button>
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-3'>
            {board.columns.map((column) => (
              <div
                key={column.id}
                className='flex items-center gap-2 rounded-full border border-[var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)]'
              >
                <span className='h-2 w-2 rounded-full bg-[var(--accent-yellow)]' />
                {column.title}
              </div>
            ))}
          </div>
        </header>

        <div className='flex items-start gap-6'>
          <div className='min-w-0 flex-1 overflow-x-auto'>
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <section className='flex gap-6' style={{ minWidth: `${Math.max(board.columns.length, 1) * 280}px` }}>
                {board.columns.map((column) => (
                  <div key={column.id} className='w-[260px] flex-shrink-0'>
                    <KanbanColumn
                      column={column}
                      cards={column.cardIds.map((cardId) => board.cards[cardId]).filter(Boolean)}
                      onRename={handleRenameColumn}
                      onRenameCommit={handleRenameColumnCommit}
                      onDeleteColumn={handleDeleteColumn}
                      onAddCard={handleAddCard}
                      onDeleteCard={handleDeleteCard}
                      highlightedCardIds={highlightedCardIds}
                    />
                  </div>
                ))}

                {/* Add column */}
                <div className='w-[260px] flex-shrink-0'>
                  {addingColumn ? (
                    <div className='flex flex-col gap-3 rounded-3xl border border-[var(--stroke)] bg-white p-4 shadow-sm'>
                      <input
                        autoFocus
                        value={newColumnTitle}
                        onChange={(e) => setNewColumnTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddColumn();
                          if (e.key === 'Escape') { setAddingColumn(false); setNewColumnTitle(''); }
                        }}
                        placeholder='Column name'
                        className='w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--navy-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)]'
                      />
                      <div className='flex gap-2'>
                        <button onClick={handleAddColumn} className='flex-1 rounded-xl bg-[var(--navy-dark)] py-2 text-xs font-semibold text-white transition hover:opacity-90'>
                          Add
                        </button>
                        <button onClick={() => { setAddingColumn(false); setNewColumnTitle(''); }} className='flex-1 rounded-xl border border-[var(--stroke)] py-2 text-xs font-semibold text-[var(--navy-dark)] transition hover:bg-gray-50'>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingColumn(true)}
                      className='flex w-full items-center justify-center gap-2 rounded-3xl border border-dashed border-[var(--stroke)] bg-white/50 py-8 text-sm font-semibold text-[var(--gray-text)] transition hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)] hover:bg-white min-h-[120px]'
                    >
                      + Add Column
                    </button>
                  )}
                </div>
              </section>
              <DragOverlay>
                {activeCard ? (
                  <div className='w-[260px]'>
                    <KanbanCardPreview card={activeCard} />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>

          <div className='w-80 flex-shrink-0 sticky top-6'>
            <ChatSidebar boardId={boardId} onBoardUpdate={handleBoardUpdate} />
          </div>
        </div>
      </main>
    </div>
  );
};
