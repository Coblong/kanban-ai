'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, type ApiBoard, type CardOperation } from '@/lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatSidebarProps = {
  boardId: number;
  onBoardUpdate: (board: ApiBoard, operations: CardOperation[]) => void;
};

export const ChatSidebar = ({ boardId, onBoardUpdate }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on mount
  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Re-focus after AI response completes
  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus();
    }
  }, [loading]);

  // Global click: always return focus to AI textarea unless user clicked an input or textarea
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

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

  const handleSubmit = (e: React.FormEvent) => {
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
    <aside className='h-full flex flex-col bg-[var(--bg-surface)]' aria-label='AI chat sidebar'>
      {/* Header */}
      <div className='flex-shrink-0 px-5 py-4 border-b border-[var(--border)]'>
        <div className='flex items-center gap-2.5'>
          <div className='w-2 h-2 rounded-full bg-[var(--accent-violet-bright)] shadow-[0_0_8px_var(--accent-violet-bright)]' />
          <h2 className='font-display text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.2em]'>
            AI Assistant
          </h2>
        </div>
        <p className='mt-1.5 text-[11px] text-[var(--text-secondary)]'>
          Ask me to create, move, or update cards
        </p>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        className='flex-1 overflow-y-auto min-h-0 px-4 py-4 flex flex-col gap-3'
      >
        {messages.length === 0 && !loading && (
          <div className='flex flex-col items-center justify-center gap-3 py-10 text-center flex-1'>
            <div className='w-10 h-10 rounded-xl bg-[var(--accent-violet-glow)] border border-[var(--accent-violet-bright)]/20 flex items-center justify-center'>
              <span className='text-[var(--accent-violet-bright)] text-base'>✦</span>
            </div>
            <p className='text-[11px] text-[var(--text-secondary)] max-w-[150px] leading-relaxed'>
              Start a conversation to manage your board with AI
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
            placeholder='Ask AI to manage your board...'
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
              <path
                d='M1 5H9M5.5 1.5L9 5L5.5 8.5'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </button>
        </div>
        <p className='mt-2 text-center text-[10px] text-[var(--text-muted)]'>
          Enter to send · Shift+Enter for newline
        </p>
      </form>
    </aside>
  );
};
