import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ChatSidebar } from '@/components/ChatSidebar';
import type { ApiBoard } from '@/lib/api';

const mockAiChat = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    aiChat: (...args: unknown[]) => mockAiChat(...args),
  },
}));

const mockBoard: ApiBoard = {
  id: 1,
  user_id: 1,
  title: 'My Board',
  columns: [],
};

const noop = vi.fn();

describe('ChatSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading, placeholder text, input, and send button', () => {
    render(<ChatSidebar onBoardUpdate={noop} />);
    expect(screen.getByRole('heading', { name: /AI Assistant/i })).toBeInTheDocument();
    expect(screen.getByText(/Start a conversation/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Message input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('send button is disabled when input is empty', () => {
    render(<ChatSidebar onBoardUpdate={noop} />);
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  it('send button is enabled once text is typed', async () => {
    render(<ChatSidebar onBoardUpdate={noop} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'hello');
    expect(screen.getByRole('button', { name: /send/i })).toBeEnabled();
  });

  it('shows user message immediately on send', async () => {
    mockAiChat.mockResolvedValue({ message: 'Hi!', operations: [], board: null });
    render(<ChatSidebar onBoardUpdate={noop} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('clears input after sending', async () => {
    mockAiChat.mockResolvedValue({ message: 'Hi!', operations: [], board: null });
    render(<ChatSidebar onBoardUpdate={noop} />);
    const input = screen.getByLabelText('Message input');
    await userEvent.type(input, 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(input).toHaveValue('');
  });

  it('shows loading state while API call is in flight', async () => {
    mockAiChat.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ChatSidebar onBoardUpdate={noop} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thinking/i })).toBeDisabled();
  });

  it('shows AI response after successful call', async () => {
    mockAiChat.mockResolvedValue({ message: 'Done!', operations: [], board: null });
    render(<ChatSidebar onBoardUpdate={noop} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(screen.getByText('Done!')).toBeInTheDocument());
  });

  it('calls onBoardUpdate when AI returns a board', async () => {
    const onBoardUpdate = vi.fn();
    const ops = [{ type: 'create_card' as const, column_id: 1, title: 'New' }];
    mockAiChat.mockResolvedValue({ message: 'Created', operations: ops, board: mockBoard });
    render(<ChatSidebar onBoardUpdate={onBoardUpdate} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'add a card');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => expect(onBoardUpdate).toHaveBeenCalledWith(mockBoard, ops));
  });

  it('does not call onBoardUpdate when board is null', async () => {
    const onBoardUpdate = vi.fn();
    mockAiChat.mockResolvedValue({ message: 'Hi', operations: [], board: null });
    render(<ChatSidebar onBoardUpdate={onBoardUpdate} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'hi');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() => screen.getByText('Hi'));
    expect(onBoardUpdate).not.toHaveBeenCalled();
  });

  it('shows error message on API failure', async () => {
    mockAiChat.mockRejectedValue(new Error('network error'));
    render(<ChatSidebar onBoardUpdate={noop} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i),
    );
  });

  it('submits on Enter key (without shift)', async () => {
    mockAiChat.mockResolvedValue({ message: 'OK', operations: [], board: null });
    render(<ChatSidebar onBoardUpdate={noop} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'hello{Enter}');
    await waitFor(() => expect(mockAiChat).toHaveBeenCalledWith('hello'));
  });

  it('does not submit on Shift+Enter', async () => {
    render(<ChatSidebar onBoardUpdate={noop} />);
    await userEvent.type(screen.getByLabelText('Message input'), 'line one');
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}');
    expect(mockAiChat).not.toHaveBeenCalled();
  });
});
