'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, type ApiBoard, type CardOperation } from '@/lib/api';
import { VoiceOrb } from './VoiceOrb';

const BOARD_TOOLS = [
  {
    type: 'function',
    async: true,
    function: {
      name: 'create_card',
      description: 'Create a new card in a column on the Kanban board.',
      parameters: {
        type: 'object',
        properties: {
          column_id: { type: 'number', description: 'ID of the column to create the card in' },
          title: { type: 'string', description: 'Title of the card' },
          description: { type: 'string', description: 'Optional description' },
        },
        required: ['column_id', 'title'],
      },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: 'move_card',
      description: 'Move a card to a different column or position.',
      parameters: {
        type: 'object',
        properties: {
          card_id: { type: 'number', description: 'ID of the card to move' },
          column_id: { type: 'number', description: 'ID of the destination column' },
          position: { type: 'number', description: 'Position index (0-based)' },
        },
        required: ['card_id', 'column_id'],
      },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: 'update_card',
      description: 'Update the title or description of an existing card.',
      parameters: {
        type: 'object',
        properties: {
          card_id: { type: 'number', description: 'ID of the card to update' },
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
        },
        required: ['card_id'],
      },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: 'delete_card',
      description: 'Delete a card from the board.',
      parameters: {
        type: 'object',
        properties: {
          card_id: { type: 'number', description: 'ID of the card to delete' },
        },
        required: ['card_id'],
      },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: 'update_open_card',
      description: 'Update the title or description of whichever card is currently open in the editor. Use this when the user says "this card", "the open card", or refers to the card without specifying an ID.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'New title' },
          description: { type: 'string', description: 'New description' },
        },
      },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: 'save_open_card',
      description: 'Save the currently open card and return to the board. Use when the user says "save", "done", "confirm", or similar.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: 'close_open_card',
      description: 'Close the currently open card without saving and return to the board. Use when the user says "cancel", "close", "go back", or similar.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: 'open_card',
      description: 'Open a card so the user can view and edit its full details.',
      parameters: {
        type: 'object',
        properties: {
          card_id: { type: 'number', description: 'ID of the card to open' },
        },
        required: ['card_id'],
      },
    },
  },
];

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Mode = 'text' | 'voice';

type VapiMessage = {
  type?: string;
  role?: string;
  transcriptType?: 'partial' | 'final';
  transcript?: string;
  message?: string;
  toolCallList?: Array<{ id: string; function: { name: string; arguments: string | Record<string, unknown> } }>;
  toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string | Record<string, unknown> } }>;
};

type ChatSidebarProps = {
  boardId: number;
  onBoardUpdate: (board: ApiBoard, operations: CardOperation[]) => void;
  onOpenCard: (cardId: number) => void;
  openCardId?: number;
  onSaveOpenCard: () => Promise<void>;
  onCloseOpenCard: () => void;
};

export const ChatSidebar = ({ boardId, onBoardUpdate, onOpenCard, openCardId, onSaveOpenCard, onCloseOpenCard }: ChatSidebarProps) => {
  // Text mode state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Voice mode state
  const [mode, setMode] = useState<Mode>('voice');
  const [callActive, setCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const messagesRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vapiRef = useRef<any>(null);
  const boardIdRef = useRef(boardId);
  const onBoardUpdateRef = useRef(onBoardUpdate);
  const onOpenCardRef = useRef(onOpenCard);
  const openCardIdRef = useRef(openCardId);
  const onSaveOpenCardRef = useRef(onSaveOpenCard);
  const onCloseOpenCardRef = useRef(onCloseOpenCard);
  useEffect(() => {
    boardIdRef.current = boardId;
  }, [boardId]);
  useEffect(() => {
    onBoardUpdateRef.current = onBoardUpdate;
  }, [onBoardUpdate]);
  useEffect(() => {
    onOpenCardRef.current = onOpenCard;
  }, [onOpenCard]);
  useEffect(() => {
    openCardIdRef.current = openCardId;
  }, [openCardId]);
  useEffect(() => {
    onSaveOpenCardRef.current = onSaveOpenCard;
  }, [onSaveOpenCard]);
  useEffect(() => {
    onCloseOpenCardRef.current = onCloseOpenCard;
  }, [onCloseOpenCard]);

  // Focus textarea on mount and after AI responds (text mode only)
  useEffect(() => {
    if (mode !== 'text') return;
    const t = setTimeout(() => textareaRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [mode]);

  useEffect(() => {
    if (!loading && mode === 'text') textareaRef.current?.focus();
  }, [loading, mode]);

  // Return focus to textarea on any click (text mode only)
  useEffect(() => {
    if (mode !== 'text') return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      requestAnimationFrame(() => textareaRef.current?.focus());
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [mode]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
  }, [transcript]);

  // Stop VAPI call on unmount
  useEffect(() => {
    return () => {
      vapiRef.current?.stop();
    };
  }, []);

  const initVapi = useCallback(async (publicKey: string) => {
    if (vapiRef.current) return vapiRef.current;

    const { default: Vapi } = await import('@vapi-ai/web');
    const vapi = new Vapi(publicKey);

    vapi.on('call-start', () => setCallActive(true));
    vapi.on('call-end', () => {
      setCallActive(false);
      setIsSpeaking(false);
    });
    vapi.on('speech-start', () => setIsSpeaking(true));
    vapi.on('speech-end', () => setIsSpeaking(false));
    vapi.on('message', (msg: VapiMessage) => {
      // User speech transcript
      if (msg.type === 'transcript' && msg.transcriptType === 'final' && msg.transcript) {
        const role = msg.role === 'assistant' ? 'assistant' : 'user';
        setTranscript((prev) => [...prev, { role, content: msg.transcript! }]);
        return;
      }
      // Bot spoken message
      if (msg.role === 'bot' && msg.message) {
        setTranscript((prev) => [...prev, { role: 'assistant', content: msg.message! }]);
        return;
      }
      // Tool calls — handle both SDK format (type:'tool-calls') and conversation log format (role:'tool_calls')
      const toolCalls = msg.toolCalls ?? msg.toolCallList;
      if (toolCalls && (msg.role === 'tool_calls' || msg.type === 'tool-calls')) {
        for (const toolCall of toolCalls) {
          const rawArgs = toolCall.function.arguments;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const args: any = typeof rawArgs === 'string' ? JSON.parse(rawArgs || '{}') : rawArgs;
          const name = toolCall.function.name;
          const boardId = boardIdRef.current;

          let promise: Promise<unknown>;
          let operation: CardOperation;

          if (name === 'create_card') {
            operation = { type: 'create_card', column_id: args.column_id, title: args.title, description: args.description ?? null };
            promise = api.createCard(args.column_id, args.title, args.description);
          } else if (name === 'move_card') {
            operation = { type: 'move_card', card_id: args.card_id, column_id: args.column_id, position: args.position ?? 0 };
            promise = api.moveCard(args.card_id, args.column_id, args.position ?? 0);
          } else if (name === 'update_card') {
            operation = { type: 'update_card', card_id: args.card_id, title: args.title, description: args.description };
            promise = api.updateCard(args.card_id, { title: args.title, description: args.description });
          } else if (name === 'update_open_card') {
            const cardId = openCardIdRef.current;
            if (!cardId) { setVoiceError('No card is currently open'); continue; }
            operation = { type: 'update_card', card_id: cardId, title: args.title, description: args.description };
            promise = api.updateCard(cardId, { title: args.title, description: args.description });
          } else if (name === 'delete_card') {
            operation = { type: 'delete_card', card_id: args.card_id };
            promise = api.deleteCard(args.card_id);
          } else if (name === 'save_open_card') {
            onSaveOpenCardRef.current().catch(() => setVoiceError('Failed to save card'));
            continue;
          } else if (name === 'close_open_card') {
            onCloseOpenCardRef.current();
            continue;
          } else if (name === 'open_card') {
            onOpenCardRef.current(args.card_id);
            continue;
          } else {
            continue;
          }

          promise
            .then(() => api.getBoard(boardId))
            .then((board) => onBoardUpdateRef.current(board, [operation]))
            .catch(() => setVoiceError(`Failed to execute ${name}`));
        }
      }
    });
    vapi.on('error', (e: Error) => {
      setVoiceError(e?.message ?? 'Voice call error');
      setCallActive(false);
      setIsSpeaking(false);
    });

    vapiRef.current = vapi;
    return vapi;
  }, []);

  const handleVoiceToggle = useCallback(async () => {
    if (callActive) {
      vapiRef.current?.stop();
      return;
    }

    setVoiceError(null);

    let session: { publicKey: string; assistantId: string; systemPrompt: string };
    try {
      session = await api.createVoiceSession(boardId);
    } catch (e: unknown) {
      setVoiceError((e as Error)?.message ?? 'Failed to create voice session');
      return;
    }

    const vapi = await initVapi(session.publicKey);

    try {
      await vapi.start(session.assistantId, {
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: session.systemPrompt }],
          tools: BOARD_TOOLS,
        },
      });
    } catch (e: unknown) {
      setVoiceError((e as Error)?.message ?? 'Failed to start voice call');
    }
  }, [callActive, boardId, initVapi]);

  const switchMode = useCallback(
    (newMode: Mode) => {
      if (newMode === 'text' && callActive) vapiRef.current?.stop();
      setMode(newMode);
      setVoiceError(null);
    },
    [callActive],
  );

  const submit = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await api.aiChat(text, boardId);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
      if (res.board) onBoardUpdate(res.board, res.operations);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <aside className='h-full flex flex-col bg-[var(--bg-surface)]' aria-label='Kai chat sidebar'>
      {/* Header */}
      <div className='flex-shrink-0 px-5 py-4 border-b border-[var(--border)]'>
        <div className='flex items-center gap-2.5'>
          <div className='w-2 h-2 rounded-full bg-[var(--accent-violet-bright)] shadow-[0_0_8px_var(--accent-violet-bright)]' />
          <h2 className='font-display text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.2em]'>Kai</h2>
          {/* Mode toggle */}
          <div className='ml-auto flex items-center gap-0.5 bg-[var(--bg-elevated)] rounded-lg p-0.5 border border-[var(--border)]'>
            <button
              onClick={() => switchMode('text')}
              className={clsx(
                'w-7 h-6 flex items-center justify-center rounded-md transition-all',
                mode === 'text' ? 'bg-[var(--accent-violet)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
              aria-label='Text mode'
            >
              <svg width='12' height='10' viewBox='0 0 12 10' fill='currentColor'>
                <rect x='0' y='0' width='12' height='1.5' rx='0.75' />
                <rect x='0' y='3.5' width='12' height='1.5' rx='0.75' />
                <rect x='0' y='7' width='7.5' height='1.5' rx='0.75' />
              </svg>
            </button>
            <button
              onClick={() => switchMode('voice')}
              className={clsx(
                'w-7 h-6 flex items-center justify-center rounded-md transition-all',
                mode === 'voice' ? 'bg-[var(--accent-violet)] text-white' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
              aria-label='Voice mode'
            >
              <svg width='11' height='14' viewBox='0 0 11 14' fill='none' stroke='currentColor' strokeWidth='1.4' strokeLinecap='round'>
                <rect x='3' y='0.7' width='5' height='7.5' rx='2.5' />
                <path d='M1 7c0 2.485 2.015 4.5 4.5 4.5S10 9.485 10 7' />
                <line x1='5.5' y1='11.5' x2='5.5' y2='13.5' />
              </svg>
            </button>
          </div>
        </div>
        <p className='mt-1.5 text-[11px] text-[var(--text-secondary)]'>
          {mode === 'text' ? 'Ask Kai to create, move, or update cards' : 'Talk to Kai'}
        </p>
      </div>

      {mode === 'text' ? (
        <>
          {/* Messages */}
          <div ref={messagesRef} className='flex-1 overflow-y-auto min-h-0 px-4 py-4 flex flex-col gap-3'>
            {messages.length === 0 && !loading && (
              <div className='flex flex-col items-center justify-center gap-3 py-10 text-center flex-1'>
                <div className='w-10 h-10 rounded-xl bg-[var(--accent-violet-glow)] border border-[var(--accent-violet-bright)]/20 flex items-center justify-center'>
                  <span className='text-[var(--accent-violet-bright)] text-base'>✦</span>
                </div>
                <p className='text-[11px] text-[var(--text-secondary)] max-w-[150px] leading-relaxed'>
                  Ask Kai to manage your board
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={clsx(
                  'max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
                  msg.role === 'user'
                    ? 'ml-auto bg-[var(--accent-cyan)] text-[var(--bg-base)] font-semibold rounded-tr-sm'
                    : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-sm',
                )}
              >
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className='flex items-center gap-1.5 px-1' aria-label='Loading'>
                <span className='w-1.5 h-1.5 rounded-full bg-[var(--accent-violet-bright)] animate-bounce [animation-delay:0ms]' />
                <span className='w-1.5 h-1.5 rounded-full bg-[var(--accent-violet-bright)] animate-bounce [animation-delay:120ms]' />
                <span className='w-1.5 h-1.5 rounded-full bg-[var(--accent-violet-bright)] animate-bounce [animation-delay:240ms]' />
              </div>
            )}
            {error && (
              <p
                className='text-center text-[11px] text-[var(--red)] bg-[var(--red-dim)] border border-[var(--red)]/20 rounded-xl px-3 py-2'
                role='alert'
              >
                {error}
              </p>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className='flex-shrink-0 p-3 border-t border-[var(--border)]'>
            <div className='relative'>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ask Kai to manage your board...'
                rows={3}
                disabled={loading}
                className='w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-3.5 py-3 pr-10 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] disabled:opacity-40 transition-colors'
                aria-label='Message input'
              />
              <button
                type='submit'
                disabled={loading || !input.trim()}
                className='absolute right-2.5 bottom-2.5 w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--accent-cyan)] text-[var(--bg-base)] disabled:opacity-25 disabled:bg-[var(--border)] transition-all hover:brightness-110'
                aria-label={loading ? 'Thinking...' : 'Send'}
              >
                <svg width='10' height='10' viewBox='0 0 10 10' fill='none'>
                  <path d='M1 5H9M5.5 1.5L9 5L5.5 8.5' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
              </button>
            </div>
            <p className='mt-2 text-center text-[10px] text-[var(--text-muted)]'>Enter to send · Shift+Enter for newline</p>
          </form>
        </>
      ) : (
        /* Voice mode */
        <div className='flex-1 flex flex-col min-h-0'>
          {/* Transcript — top 2/3 */}
          <div ref={transcriptRef} className='flex-[2] overflow-y-auto min-h-0 px-4 py-4 flex flex-col gap-3'>
            {transcript.length === 0 && (
              <div className='flex flex-col items-center justify-center gap-3 py-8 text-center flex-1'>
                <p className='text-[11px] text-[var(--text-secondary)] max-w-[160px] leading-relaxed'>
                  Tap the orb below to start a voice conversation
                </p>
              </div>
            )}
            {transcript.map((msg, i) => (
              <div
                key={i}
                className={clsx(
                  'max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed',
                  msg.role === 'user'
                    ? 'ml-auto bg-[var(--accent-cyan)] text-[var(--bg-base)] font-semibold rounded-tr-sm'
                    : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] rounded-tl-sm',
                )}
              >
                {msg.content}
              </div>
            ))}
          </div>

          {/* Orb — bottom 1/3 */}
          <div className='flex-[1] min-h-[140px] border-t border-[var(--border)] flex flex-col'>
            <VoiceOrb isActive={callActive} isSpeaking={isSpeaking} onToggle={handleVoiceToggle} />
            {voiceError && <p className='text-center text-[10px] text-[var(--red)] px-4 pb-3 leading-relaxed'>{voiceError}</p>}
          </div>
        </div>
      )}
    </aside>
  );
};
