'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      login(data.token, data.user);
      router.push('/boards');
    } catch {
      setError('Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center px-4'>
      <div className='pointer-events-none fixed inset-0 overflow-hidden'>
        <div className='absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[var(--accent-cyan)] opacity-[0.05] blur-3xl' />
        <div className='absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[var(--accent-violet)] opacity-[0.06] blur-3xl' />
      </div>

      <div className='relative w-full max-w-sm'>
        <div className='mb-8 text-center'>
          <div className='inline-flex items-center gap-2 mb-6'>
            <div className='w-2 h-2 rounded-full bg-[var(--accent-cyan)] shadow-[0_0_8px_var(--accent-cyan)]' />
            <span className='font-display text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-secondary)]'>
              Kanban Studio
            </span>
          </div>
          <h1 className='font-display text-3xl font-bold text-[var(--text-primary)]'>Sign in</h1>
          <p className='mt-2 text-sm text-[var(--text-secondary)]'>Continue to your boards</p>
        </div>

        <div className='rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 shadow-[0_8px_40px_rgba(0,0,0,0.6)]'>
          <form onSubmit={handleSubmit} className='flex flex-col gap-5'>
            <div>
              <label
                htmlFor='username'
                className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2'
              >
                Username
              </label>
              <input
                id='username'
                type='text'
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder='your username'
                className='w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors'
              />
            </div>

            <div>
              <label
                htmlFor='password'
                className='block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-2'
              >
                Password
              </label>
              <input
                id='password'
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='••••••••'
                className='w-full rounded-xl border border-[var(--border)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--border-focus)] transition-colors'
              />
            </div>

            {error && (
              <div className='rounded-xl bg-[var(--red-dim)] border border-[var(--red)]/20 px-4 py-3'>
                <p className='text-xs text-[var(--red)]'>{error}</p>
              </div>
            )}

            <button
              type='submit'
              disabled={isLoading}
              className='w-full rounded-xl bg-[var(--accent-cyan)] px-5 py-3 text-sm font-bold text-[var(--bg-base)] transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed'
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className='mt-6 text-center text-xs text-[var(--text-secondary)]'>
            No account?{' '}
            <Link href='/register' className='font-semibold text-[var(--accent-cyan)] hover:underline'>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
