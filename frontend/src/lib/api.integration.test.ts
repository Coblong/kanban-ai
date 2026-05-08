import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

// Integration tests for the api.ts client module.
// These mock fetch to verify the client constructs correct requests and handles responses.

beforeEach(() => {
  vi.restoreAllMocks();
  // Stub localStorage
  Object.defineProperty(window, 'localStorage', {
    value: { getItem: vi.fn(() => 'dummy-token'), setItem: vi.fn(), removeItem: vi.fn() },
    configurable: true,
  });
});

function mockFetch(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('api.getBoard', () => {
  it('calls GET /api/boards/:id with auth header', async () => {
    mockFetch({ id: 1, user_id: 1, title: 'Board', description: null, columns: [] });
    const board = await api.getBoard(1);
    expect(board.title).toBe('Board');
    expect(global.fetch).toHaveBeenCalledWith('/api/boards/1', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer dummy-token' }),
    }));
  });

  it('throws on non-OK response', async () => {
    mockFetch({ detail: 'Not authenticated' }, 401);
    await expect(api.getBoard(1)).rejects.toThrow('API error 401');
  });
});

describe('api.createCard', () => {
  it('calls POST /api/card with correct body', async () => {
    mockFetch({ id: 5, column_id: 1, title: 'New', description: null, position: 0 });
    await api.createCard(1, 'New');
    expect(global.fetch).toHaveBeenCalledWith('/api/card', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ column_id: 1, title: 'New', description: null }),
    }));
  });

  it('includes description when provided', async () => {
    mockFetch({ id: 5, column_id: 1, title: 'New', description: 'Details', position: 0 });
    await api.createCard(1, 'New', 'Details');
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.description).toBe('Details');
  });
});

describe('api.deleteCard', () => {
  it('calls DELETE /api/card/:id', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    await api.deleteCard(3);
    expect(global.fetch).toHaveBeenCalledWith('/api/card/3', expect.objectContaining({ method: 'DELETE' }));
  });
});

describe('api.moveCard', () => {
  it('calls PUT /api/card/:id/move with column and position', async () => {
    mockFetch({ id: 1, column_id: 2, title: 'Card', description: null, position: 0 });
    await api.moveCard(1, 2, 0);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/card/1/move');
    const body = JSON.parse(call[1].body);
    expect(body).toEqual({ column_id: 2, position: 0 });
  });
});

describe('api.renameColumn', () => {
  it('calls PUT /api/column/:id with new title', async () => {
    mockFetch({ id: 1, title: 'Renamed' });
    await api.renameColumn(1, 'Renamed');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/column/1');
    expect(JSON.parse(call[1].body)).toEqual({ title: 'Renamed' });
  });
});

describe('api.updateCard', () => {
  it('calls PUT /api/card/:id with update fields', async () => {
    mockFetch({ id: 2, column_id: 1, title: 'Updated', description: null, position: 0 });
    await api.updateCard(2, { title: 'Updated' });
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(call[0]).toBe('/api/card/2');
    expect(call[1].method).toBe('PUT');
  });
});
