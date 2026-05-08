export type ApiUser = {
  id: number;
  email: string;
  display_name: string | null;
};

export type ApiCard = {
  id: number;
  column_id: number;
  title: string;
  description: string | null;
  position: number;
};

export type ApiColumn = {
  id: number;
  board_id: number;
  title: string;
  position: number;
  cards: ApiCard[];
};

export type ApiBoard = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  color: string;
  columns: ApiColumn[];
  created_at: string;
  updated_at: string;
};

export type ApiBoardSummary = {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
};

export type CardOperation = {
  type: 'create_card' | 'move_card' | 'update_card' | 'delete_card';
  column_id?: number;
  card_id?: number;
  title?: string;
  description?: string | null;
  position?: number;
};

export type AiChatResponse = {
  message: string;
  operations: CardOperation[];
  board: ApiBoard | null;
};

export type AuthResponse = {
  user: ApiUser;
  token: string;
};

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  register: (email: string, password: string, display_name?: string) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name }),
    }),

  logout: () =>
    request<void>('/api/auth/logout', { method: 'POST' }),

  // Boards
  listBoards: () => request<ApiBoardSummary[]>('/api/boards'),

  createBoard: (title: string, description?: string, color?: string) =>
    request<ApiBoard>('/api/boards', {
      method: 'POST',
      body: JSON.stringify({ title, description: description || null, color: color || '#00d3ff' }),
    }),

  getBoard: (boardId: number) => request<ApiBoard>(`/api/boards/${boardId}`),

  updateBoard: (boardId: number, updates: { title?: string; description?: string; color?: string }) =>
    request<ApiBoardSummary>(`/api/boards/${boardId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteBoard: (boardId: number) =>
    request<void>(`/api/boards/${boardId}`, { method: 'DELETE' }),

  // Columns
  createColumn: (boardId: number, title: string) =>
    request<ApiColumn>('/api/columns', {
      method: 'POST',
      body: JSON.stringify({ board_id: boardId, title }),
    }),

  renameColumn: (columnId: number, title: string) =>
    request(`/api/column/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),

  deleteColumn: (columnId: number) =>
    request<void>(`/api/column/${columnId}`, { method: 'DELETE' }),

  // Cards
  createCard: (columnId: number, title: string, description?: string) =>
    request<ApiCard>('/api/card', {
      method: 'POST',
      body: JSON.stringify({ column_id: columnId, title, description: description || null }),
    }),

  updateCard: (cardId: number, updates: { title?: string; description?: string }) =>
    request<ApiCard>(`/api/card/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteCard: (cardId: number) =>
    request<void>(`/api/card/${cardId}`, { method: 'DELETE' }),

  moveCard: (cardId: number, columnId: number, position: number) =>
    request<ApiCard>(`/api/card/${cardId}/move`, {
      method: 'PUT',
      body: JSON.stringify({ column_id: columnId, position }),
    }),

  // AI
  aiChat: (message: string, boardId?: number) =>
    request<AiChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message, board_id: boardId ?? null }),
    }),

  createVoiceSession: (boardId?: number) =>
    request<{ publicKey: string; assistantId: string; systemPrompt: string }>('/api/ai/voice/session', {
      method: 'POST',
      body: JSON.stringify({ board_id: boardId ?? null }),
    }),

  processVoiceTranscript: (
    boardId: number,
    transcript: { role: string; content: string }[],
  ) =>
    request<AiChatResponse>('/api/ai/voice/process', {
      method: 'POST',
      body: JSON.stringify({ board_id: boardId, transcript }),
    }),
};
