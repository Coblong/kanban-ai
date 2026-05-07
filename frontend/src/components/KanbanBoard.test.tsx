import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '@/components/KanbanBoard';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { vi } from 'vitest';
import type { ApiBoard } from '@/lib/api';

const mockGetBoard = vi.fn();
const mockCreateCard = vi.fn();
const mockDeleteCard = vi.fn();
const mockRenameColumn = vi.fn();
const mockMoveCard = vi.fn();
const mockAiChat = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    getBoard: () => mockGetBoard(),
    createCard: (...args: unknown[]) => mockCreateCard(...args),
    deleteCard: (...args: unknown[]) => mockDeleteCard(...args),
    renameColumn: (...args: unknown[]) => mockRenameColumn(...args),
    moveCard: (...args: unknown[]) => mockMoveCard(...args),
    aiChat: (...args: unknown[]) => mockAiChat(...args),
  },
}));

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockBoard: ApiBoard = {
  id: 1,
  user_id: 1,
  title: 'My Board',
  columns: [
    { id: 1, board_id: 1, title: 'To Do', position: 0, cards: [] },
    {
      id: 2,
      board_id: 1,
      title: 'In Progress',
      position: 1,
      cards: [{ id: 1, column_id: 2, title: 'Test Card', description: 'Test details', position: 0 }],
    },
    { id: 3, board_id: 1, title: 'Done', position: 2, cards: [] },
  ],
};

const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe('KanbanBoard', () => {
  beforeEach(() => {
    mockGetBoard.mockResolvedValue(mockBoard);
    mockCreateCard.mockResolvedValue({ id: 10, column_id: 1, title: 'New card', description: 'Notes', position: 0 });
    mockDeleteCard.mockResolvedValue(undefined);
    mockRenameColumn.mockResolvedValue({});
    mockMoveCard.mockResolvedValue({});
    mockAiChat.mockResolvedValue({ message: 'Done', operations: [], board: null });
    mockPush.mockReset();
  });

  it('renders three columns from the API', async () => {
    renderWithAuth(<KanbanBoard />);
    await waitFor(() => expect(screen.getAllByTestId(/column-/i)).toHaveLength(3));
  });

  it('renames a column', async () => {
    renderWithAuth(<KanbanBoard />);
    await waitFor(() => screen.getAllByTestId(/column-/i));
    const column = screen.getAllByTestId(/column-/i)[0];
    const input = within(column).getByLabelText('Column title');
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name');
    expect(input).toHaveValue('New Name');
  });

  it('adds and removes a card', async () => {
    renderWithAuth(<KanbanBoard />);
    await waitFor(() => screen.getAllByTestId(/column-/i));

    const column = screen.getAllByTestId(/column-/i)[0];
    const addButton = within(column).getByRole('button', { name: /add a card/i });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, 'New card');
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, 'Notes');

    await userEvent.click(within(column).getByRole('button', { name: /add card/i }));

    await waitFor(() => expect(within(column).getByText('New card')).toBeInTheDocument());

    const deleteButton = within(column).getByRole('button', { name: /delete new card/i });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText('New card')).not.toBeInTheDocument();
  });

  it('renders the AI chat sidebar', async () => {
    renderWithAuth(<KanbanBoard />);
    await waitFor(() => screen.getAllByTestId(/column-/i));
    expect(screen.getByRole('complementary', { name: /AI chat sidebar/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /AI Assistant/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Message input')).toBeInTheDocument();
  });

  it('board updates when AI returns a new board', async () => {
    const updatedBoard = {
      ...mockBoard,
      columns: [
        {
          ...mockBoard.columns[0],
          cards: [
            ...mockBoard.columns[0].cards,
            { id: 99, column_id: 1, title: 'AI created card', description: null, position: 1 },
          ],
        },
        mockBoard.columns[1],
        mockBoard.columns[2],
      ],
    };
    mockAiChat.mockResolvedValue({ message: 'Created a card', operations: [], board: updatedBoard });

    renderWithAuth(<KanbanBoard />);
    await waitFor(() => screen.getAllByTestId(/column-/i));

    const input = screen.getByLabelText('Message input');
    await userEvent.type(input, 'add a card');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => expect(screen.getByText('AI created card')).toBeInTheDocument());
  });

  it('shows logout button and handles logout', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Logout successful' }),
      }),
    ) as ReturnType<typeof vi.fn>;

    renderWithAuth(<KanbanBoard />);
    await waitFor(() => screen.getByRole('button', { name: /logout/i }));

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();

    await userEvent.click(logoutButton);

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
