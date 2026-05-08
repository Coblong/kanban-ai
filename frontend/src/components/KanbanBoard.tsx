'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { KanbanColumn } from '@/components/KanbanColumn';
import { KanbanCardPreview } from '@/components/KanbanCardPreview';
import { CardEditor } from '@/components/CardEditor';
import { ChatSidebar } from '@/components/ChatSidebar';
import { boardFromApi, moveCard, numericId, type BoardData } from '@/lib/kanban';
import { api, type ApiBoard, type CardOperation } from '@/lib/api';
import { useAuth } from '@/lib/auth/AuthContext';

type Props = { boardId: number };

export const KanbanBoard = ({ boardId }: Props) => {
  const [board, setBoard] = useState<BoardData>({ columns: [], cards: {} });
  const [boardTitle, setBoardTitle] = useState('');
  const [boardColor, setBoardColor] = useState('#00d3ff');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [highlightedCardIds, setHighlightedCardIds] = useState<Set<string>>(new Set());
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const cardEditorActionsRef = useRef<{ save: () => Promise<void> } | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { logout } = useAuth();
  const router = useRouter();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    api
      .getBoard(boardId)
      .then((apiBoard) => {
        setBoard(boardFromApi(apiBoard));
        setBoardTitle(apiBoard.title);
        setBoardColor(apiBoard.color ?? '#00d3ff');
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
        cards: {
          ...prev.cards,
          [cardId]: { id: cardId, title: newCard.title, details: newCard.description ?? '' },
        },
        columns: prev.columns.map((col) =>
          col.id === columnId ? { ...col, cardIds: [...col.cardIds, cardId] } : col,
        ),
      }));
    } catch {}
  };

  const handleDeleteCard = async (columnId: string, cardId: string) => {
    const previousBoard = board;
    setBoard((prev) => ({
      ...prev,
      cards: Object.fromEntries(Object.entries(prev.cards).filter(([id]) => id !== cardId)),
      columns: prev.columns.map((col) =>
        col.id === columnId ? { ...col, cardIds: col.cardIds.filter((id) => id !== cardId) } : col,
      ),
    }));
    try {
      await api.deleteCard(numericId(cardId));
    } catch {
      setBoard(previousBoard);
    }
  };

  const handleSaveCard = async (cardId: string, title: string, details: string) => {
    await api.updateCard(numericId(cardId), { title, description: details || undefined });
    setBoard((prev) => ({
      ...prev,
      cards: { ...prev.cards, [cardId]: { ...prev.cards[cardId], title, details } },
    }));
    setEditingCardId(null);
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
        highlightTimerRef.current = setTimeout(() => setHighlightedCardIds(new Set()), 2500);
      }
    },
    [board.cards],
  );

  const handleRenameBoardCommit = async (title: string) => {
    if (!title.trim()) return;
    try {
      await api.updateBoard(boardId, { title: title.trim() });
    } catch {}
  };

  const handleColorChange = async (color: string) => {
    setBoardColor(color);
    setShowColorPicker(false);
    try {
      await api.updateBoard(boardId, { color });
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    logout();
    router.push('/login');
  };

  const activeCard = activeCardId ? board.cards[activeCardId] : null;

  if (loading) {
    return (
      <div className='h-screen flex items-center justify-center bg-[var(--bg-base)]'>
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]'>
          Loading board...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='h-screen flex items-center justify-center gap-4 bg-[var(--bg-base)]'>
        <p className='text-xs text-[var(--red)]'>{error}</p>
        <button
          onClick={() => router.push('/boards')}
          className='text-xs text-[var(--accent-cyan)] underline'
        >
          Back to boards
        </button>
      </div>
    );
  }

  return (
    <div className='h-screen overflow-hidden flex flex-col bg-[var(--bg-base)]'>
      {/* Ambient background glows */}
      <div className='pointer-events-none fixed inset-0 overflow-hidden'>
        <div className='absolute -top-32 -left-32 w-80 h-80 rounded-full bg-[var(--accent-cyan)] opacity-[0.04] blur-3xl' />
        <div className='absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[var(--accent-violet)] opacity-[0.05] blur-3xl' />
      </div>

      {/* Compact header */}
      <header className='relative z-10 flex-shrink-0 h-14 flex items-center gap-4 px-5 border-b border-[var(--border)] bg-[var(--bg-surface)]/80 backdrop-blur-sm'>
        <button
          onClick={() => router.push('/boards')}
          className='flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
        >
          <svg width='12' height='12' viewBox='0 0 12 12' fill='none'>
            <path
              d='M7 2L3 6L7 10'
              stroke='currentColor'
              strokeWidth='1.5'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
          Boards
        </button>

        <div className='w-px h-5 bg-[var(--border)]' />

        {/* Color picker */}
        <div className='relative'>
          <button
            onClick={() => setShowColorPicker((v) => !v)}
            className='w-4 h-4 rounded-full flex-shrink-0 transition-transform hover:scale-110'
            style={{ backgroundColor: boardColor, boxShadow: `0 0 6px ${boardColor}80` }}
            aria-label='Change board color'
          />
          {showColorPicker && (
            <>
              <div className='fixed inset-0 z-20' onClick={() => setShowColorPicker(false)} />
              <div className='absolute top-7 left-1/2 -translate-x-1/2 z-30 flex gap-2 p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-[0_8px_32px_rgba(0,0,0,0.6)]'>
                {['#00d3ff','#7c3aed','#10b981','#f43f5e','#f97316','#f59e0b','#ec4899','#6366f1'].map((c) => (
                  <button
                    key={c}
                    onClick={() => handleColorChange(c)}
                    className='w-6 h-6 rounded-full transition-transform hover:scale-110'
                    style={{
                      backgroundColor: c,
                      boxShadow: boardColor === c ? `0 0 0 2px var(--bg-surface), 0 0 0 3.5px ${c}` : 'none',
                    }}
                    aria-label={c}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <input
          value={boardTitle}
          onChange={(e) => setBoardTitle(e.target.value)}
          onBlur={(e) => handleRenameBoardCommit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className='font-display text-base font-bold text-[var(--text-primary)] bg-transparent outline-none border-b border-transparent focus:border-[var(--accent-cyan)]/50 transition-colors min-w-0 max-w-[240px] truncate'
          aria-label='Board title'
        />

        <div className='flex-1' />

        {/* Column pills */}
        <div className='hidden lg:flex items-center gap-1.5 overflow-hidden'>
          {board.columns.map((col) => (
            <div
              key={col.id}
              className='flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-[var(--bg-elevated)] border border-[var(--border)] text-[10px] font-semibold text-[var(--text-secondary)] whitespace-nowrap flex-shrink-0'
            >
              <div className='w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)] opacity-60' />
              {col.title}
              <span className='text-[var(--text-muted)]'>{col.cardIds.length}</span>
            </div>
          ))}
        </div>

        <div className='w-px h-5 bg-[var(--border)]' />

        <button
          onClick={handleLogout}
          className='text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors'
        >
          Logout
        </button>
      </header>

      {/* Main content */}
      <div className='relative z-10 flex-1 flex overflow-hidden'>
        {/* Board area */}
        <div className='relative flex-1 overflow-x-auto overflow-y-hidden'>
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <section
              className='flex gap-3 h-full p-4'
              style={{ minWidth: `${Math.max(board.columns.length + 1, 2) * 288}px` }}
            >
              {board.columns.map((column) => (
                <div key={column.id} className='w-[272px] flex-shrink-0 flex flex-col h-full'>
                  <KanbanColumn
                    column={column}
                    cards={column.cardIds.map((id) => board.cards[id]).filter(Boolean)}
                    onRename={handleRenameColumn}
                    onRenameCommit={handleRenameColumnCommit}
                    onDeleteColumn={handleDeleteColumn}
                    onAddCard={handleAddCard}
                    onDeleteCard={handleDeleteCard}
                    onEditCard={setEditingCardId}
                    highlightedCardIds={highlightedCardIds}
                  />
                </div>
              ))}

              {/* Add column */}
              <div className='w-[272px] flex-shrink-0 flex flex-col'>
                {addingColumn ? (
                  <div className='flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-3'>
                    <input
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddColumn();
                        if (e.key === 'Escape') {
                          setAddingColumn(false);
                          setNewColumnTitle('');
                        }
                      }}
                      placeholder='Column name'
                      className='w-full rounded-lg border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors'
                    />
                    <div className='flex gap-2'>
                      <button
                        onClick={handleAddColumn}
                        className='flex-1 rounded-lg bg-[var(--accent-cyan)] py-1.5 text-xs font-bold text-[var(--bg-base)] transition hover:brightness-110'
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setAddingColumn(false);
                          setNewColumnTitle('');
                        }}
                        className='rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-hover)]'
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingColumn(true)}
                    className='w-full h-[120px] rounded-2xl border border-dashed border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-cyan)]/40 hover:text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan-glow)]'
                  >
                    + Add Column
                  </button>
                )}
              </div>
            </section>

            <DragOverlay>
              {activeCard ? (
                <div className='w-[272px]'>
                  <KanbanCardPreview card={activeCard} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {editingCardId && board.cards[editingCardId] && (
            <CardEditor
              card={board.cards[editingCardId]}
              onClose={() => setEditingCardId(null)}
              onSave={handleSaveCard}
              actionsRef={cardEditorActionsRef}
            />
          )}
        </div>

        {/* AI Sidebar */}
        <div className='w-[300px] flex-shrink-0 h-full border-l border-[var(--border)] overflow-hidden'>
          <ChatSidebar
            boardId={boardId}
            onBoardUpdate={handleBoardUpdate}
            onOpenCard={(cardId) => setEditingCardId(`card-${cardId}`)}
            openCardId={editingCardId ? Number(editingCardId.replace('card-', '')) : undefined}
            onSaveOpenCard={async () => { await cardEditorActionsRef.current?.save(); }}
            onCloseOpenCard={() => setEditingCardId(null)}
          />
        </div>
      </div>
    </div>
  );
};
