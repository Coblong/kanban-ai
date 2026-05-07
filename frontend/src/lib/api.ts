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
  columns: ApiColumn[];
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

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
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
  getBoard: () => request<ApiBoard>('/api/board'),

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

  renameColumn: (columnId: number, title: string) =>
    request(`/api/column/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ title }),
    }),

  aiChat: (message: string) =>
    request<AiChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};
