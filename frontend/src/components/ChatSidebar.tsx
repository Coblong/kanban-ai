'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, type ApiBoard, type CardOperation } from '@/lib/api';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatSidebarProps = {
  onBoardUpdate: (board: ApiBoard, operations: CardOperation[]) => void;
};

export const ChatSidebar = ({ onBoardUpdate }: ChatSidebarProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await api.aiChat(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
      if (res.board) {
        onBoardUpdate(res.board, res.operations);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <aside
      className='flex w-full flex-col rounded-3xl border border-[var(--stroke)] bg-[var(--surface-strong)] shadow-[var(--shadow)]'
      style={{ minHeight: '520px', maxHeight: 'calc(100vh - 96px)' }}
      aria-label='AI chat sidebar'
    >
      <div className='border-b border-[var(--stroke)] px-5 py-4'>
        <h2 className='font-display text-lg font-semibold text-[var(--navy-dark)]'>AI Assistant</h2>
        <p className='mt-1 text-xs text-[var(--gray-text)]'>Ask me to create, move, or update cards</p>
      </div>

      <div ref={messagesRef} className='flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4' style={{ minHeight: 0 }}>
        {messages.length === 0 && !loading && (
          <p className='text-center text-xs text-[var(--gray-text)]'>
            Start a conversation to manage your board with AI.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6',
              msg.role === 'user'
                ? 'ml-auto bg-[var(--primary-blue)] text-white'
                : 'bg-white text-[var(--navy-dark)] shadow-[0_4px_12px_rgba(3,33,71,0.06)]',
            )}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className='flex items-center gap-1.5' aria-label='Loading'>
            <span className='h-2 w-2 animate-bounce rounded-full bg-[var(--primary-blue)] [animation-delay:0ms]' />
            <span className='h-2 w-2 animate-bounce rounded-full bg-[var(--primary-blue)] [animation-delay:150ms]' />
            <span className='h-2 w-2 animate-bounce rounded-full bg-[var(--primary-blue)] [animation-delay:300ms]' />
          </div>
        )}
        {error && (
          <p className='text-center text-xs text-red-500' role='alert'>
            {error}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className='border-t border-[var(--stroke)] p-4'>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Ask AI to manage your board...'
          rows={3}
          disabled={loading}
          className='w-full resize-none rounded-2xl border border-[var(--stroke)] bg-white px-4 py-3 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] disabled:opacity-50'
          aria-label='Message input'
        />
        <button
          type='submit'
          disabled={loading || !input.trim()}
          className='mt-2 w-full rounded-2xl bg-[var(--primary-blue)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40'
        >
          {loading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </aside>
  );
};
