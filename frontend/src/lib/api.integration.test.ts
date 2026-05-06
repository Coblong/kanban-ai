import { describe, it, expect, vi } from 'vitest';

// Integration tests for frontend-backend API communication

describe('Authentication API Integration', () => {
  it('successfully logs in with correct credentials', async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user', password: 'password' }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.message).toBe('Login successful');
    expect(data.token).toBe('dummy-token');
  });

  it('fails login with incorrect credentials', async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user', password: 'wrong' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.detail).toBe('Invalid credentials');
  });

  it('successfully logs out', async () => {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.message).toBe('Logout successful');
  });
});

describe('Health Check Integration', () => {
  it('returns healthy status', async () => {
    const response = await fetch('/health');
    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});

describe('Frontend-Backend Integration', () => {
  it('serves the main application HTML', async () => {
    const response = await fetch('/');
    expect(response.ok).toBe(true);
    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Kanban Studio');
  });
});
