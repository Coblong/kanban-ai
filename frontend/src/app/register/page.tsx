'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../lib/auth/AuthContext';
import { api } from '../../lib/api';

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const data = await api.register(email, password, displayName || undefined);
      login(data.token, data.user);
      router.push('/boards');
    } catch (err: unknown) {
      const status = err instanceof Error && err.message.includes('409');
      setError(status ? 'That username is already taken.' : 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-[var(--surface)] px-4'>
      <div className='pointer-events-none fixed left-0 top-0 h-[500px] w-[500px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.18)_0%,_transparent_70%)]' />
      <div className='pointer-events-none fixed bottom-0 right-0 h-[500px] w-[500px] translate-x-1/3 translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.15)_0%,_transparent_70%)]' />

      <div className='relative w-full max-w-md'>
        <div className='rounded-[32px] border border-[var(--stroke)] bg-white p-10 shadow-[var(--shadow)]'>
          <div className='mb-8'>
            <p className='text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gray-text)]'>Get started</p>
            <h1 className='mt-2 font-display text-3xl font-semibold text-[var(--navy-dark)]'>Create account</h1>
            <p className='mt-2 text-sm text-[var(--gray-text)]'>Your board will be ready in seconds</p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label htmlFor='display_name' className='block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)] mb-2'>
                Name <span className='text-[var(--gray-text)] normal-case tracking-normal font-normal'>(optional)</span>
              </label>
              <input
                id='display_name'
                type='text'
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder='Your name'
                className='w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] transition'
              />
            </div>

            <div>
              <label htmlFor='email' className='block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)] mb-2'>
                Username
              </label>
              <input
                id='email'
                type='text'
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder='choose a username'
                className='w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] transition'
              />
            </div>

            <div>
              <label htmlFor='password' className='block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--navy-dark)] mb-2'>
                Password
              </label>
              <input
                id='password'
                type='password'
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder='at least 6 characters'
                className='w-full rounded-2xl border border-[var(--stroke)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--navy-dark)] placeholder:text-[var(--gray-text)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-blue)] transition'
              />
            </div>

            {error && (
              <div className='rounded-2xl bg-red-50 border border-red-100 px-4 py-3'>
                <p className='text-sm text-red-600'>{error}</p>
              </div>
            )}

            <button
              type='submit'
              disabled={isLoading}
              className='w-full rounded-2xl bg-[var(--navy-dark)] px-5 py-3.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className='mt-6 text-center text-sm text-[var(--gray-text)]'>
            Already have an account?{' '}
            <Link href='/login' className='font-semibold text-[var(--primary-blue)] hover:underline'>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
