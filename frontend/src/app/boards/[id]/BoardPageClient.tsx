'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { KanbanBoard } from '@/components/KanbanBoard';

export default function BoardPageClient() {
  const { isLoggedIn, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  // Read from window.location instead of usePathname() — the static export embeds
  // "_build_" in the RSC payload, so usePathname() returns /boards/_build_ on hydration.
  const [boardId, setBoardId] = useState<number>(NaN);

  useEffect(() => {
    const match = window.location.pathname.match(/\/boards\/(\d+)/);
    setBoardId(match ? parseInt(match[1], 10) : NaN);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/login');
    }
  }, [isLoggedIn, isLoading, router]);

  useEffect(() => {
    if (mounted && !isLoading && isLoggedIn && isNaN(boardId)) {
      router.push('/boards');
    }
  }, [mounted, isLoading, isLoggedIn, boardId, router]);

  if (!mounted || isLoading) {
    return (
      <div className='h-screen flex items-center justify-center bg-[var(--bg-base)]'>
        <p className='text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]'>Loading...</p>
      </div>
    );
  }

  if (!isLoggedIn) return null;
  if (isNaN(boardId)) return null;

  return <KanbanBoard boardId={boardId} />;
}
