import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KanbanBoard } from '@/components/KanbanBoard';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { vi } from 'vitest';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const getFirstColumn = () => screen.getAllByTestId(/column-/i)[0];

const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe('KanbanBoard', () => {
  it('renders five columns', () => {
    renderWithAuth(<KanbanBoard />);
    expect(screen.getAllByTestId(/column-/i)).toHaveLength(5);
  });

  it('renames a column', async () => {
    renderWithAuth(<KanbanBoard />);
    const column = getFirstColumn();
    const input = within(column).getByLabelText('Column title');
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name');
    expect(input).toHaveValue('New Name');
  });

  it('adds and removes a card', async () => {
    renderWithAuth(<KanbanBoard />);
    const column = getFirstColumn();
    const addButton = within(column).getByRole('button', {
      name: /add a card/i,
    });
    await userEvent.click(addButton);

    const titleInput = within(column).getByPlaceholderText(/card title/i);
    await userEvent.type(titleInput, 'New card');
    const detailsInput = within(column).getByPlaceholderText(/details/i);
    await userEvent.type(detailsInput, 'Notes');

    await userEvent.click(within(column).getByRole('button', { name: /add card/i }));

    expect(within(column).getByText('New card')).toBeInTheDocument();

    const deleteButton = within(column).getByRole('button', {
      name: /delete new card/i,
    });
    await userEvent.click(deleteButton);

    expect(within(column).queryByText('New card')).not.toBeInTheDocument();
  });

  it('shows logout button and handles logout', async () => {
    // Mock fetch for logout API call
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Logout successful' }),
      }),
    ) as any;

    renderWithAuth(<KanbanBoard />);

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();

    await userEvent.click(logoutButton);

    expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
