import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ForkDialog } from './ForkDialog';
import { useDebateStore } from '@debateui/state';

// Mock the store
vi.mock('@debateui/state', () => ({
  useDebateStore: vi.fn(),
}));

describe('ForkDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();
  const mockStartFork = vi.fn();
  const mockUpdateForkDraft = vi.fn();
  const mockCancelFork = vi.fn();

  const defaultProps = {
    isOpen: true,
    turnId: 'turn-123',
    branchId: 'branch-456',
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default store mock
    (useDebateStore as any).mockImplementation((selector: any) => {
      const mockState = {
        startFork: mockStartFork,
        updateForkDraft: mockUpdateForkDraft,
        cancelFork: mockCancelFork,
        branching: {
          forkDraft: {
            _tag: 'Some',
            value: {
              parentTurnId: 'turn-123',
              parentBranchId: 'branch-456',
              content: 'Original turn content',
              forkMode: 'explore' as const,
            },
          },
        },
      };
      return selector ? selector(mockState) : mockState;
    });
  });

  it('renders when isOpen is true', () => {
    render(<ForkDialog {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /create fork/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<ForkDialog {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('initializes fork draft on open', () => {
    render(<ForkDialog {...defaultProps} />);
    expect(mockStartFork).toHaveBeenCalledWith('turn-123', 'branch-456');
  });

  it('pre-fills textarea with fork draft content', () => {
    render(<ForkDialog {...defaultProps} />);
    const textarea = screen.getByRole('textbox', { name: /alternative content/i });
    expect(textarea).toHaveValue('Original turn content');
  });

  it('updates content on textarea change', async () => {
    const user = userEvent.setup();
    render(<ForkDialog {...defaultProps} />);

    const textarea = screen.getByRole('textbox', { name: /alternative content/i });
    await user.clear(textarea);

    // After clear, update the mock to return empty content
    (useDebateStore as any).mockImplementation((selector: any) => {
      const mockState = {
        startFork: mockStartFork,
        updateForkDraft: mockUpdateForkDraft,
        cancelFork: mockCancelFork,
        branching: {
          forkDraft: {
            _tag: 'Some',
            value: {
              parentTurnId: 'turn-123',
              parentBranchId: 'branch-456',
              content: '',
              forkMode: 'explore' as const,
            },
          },
        },
      };
      return selector ? selector(mockState) : mockState;
    });

    await user.type(textarea, 'New');

    // Check that updateForkDraft was called
    expect(mockUpdateForkDraft).toHaveBeenCalled();
  });

  it('handles fork mode selection for save mode', async () => {
    const user = userEvent.setup();
    render(<ForkDialog {...defaultProps} />);

    // Find all radio buttons
    const radios = screen.getAllByRole('radio');
    const saveRadio = radios.find((r) => (r as HTMLInputElement).value === 'save');
    expect(saveRadio).toBeDefined();

    // Initially, explore should be checked
    const exploreRadio = radios.find((r) => (r as HTMLInputElement).value === 'explore');
    expect(exploreRadio).toBeChecked();
    expect(saveRadio).not.toBeChecked();

    // Click the save radio button
    await user.click(saveRadio!);

    // Verify updateForkDraft was called (which happens on mode change)
    expect(mockUpdateForkDraft).toHaveBeenCalled();
  });

  it('handles fork mode selection for explore mode', async () => {
    render(<ForkDialog {...defaultProps} />);

    // Find all radio buttons and get the explore one
    const radios = screen.getAllByRole('radio');
    const exploreRadio = radios.find((r) => (r as HTMLInputElement).value === 'explore');
    expect(exploreRadio).toBeDefined();

    // Explore should already be checked by default
    expect(exploreRadio).toBeChecked();
  });

  it('calls onSubmit with fork data on submit', async () => {
    const user = userEvent.setup();
    render(<ForkDialog {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /create fork/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        parentTurnId: 'turn-123',
        parentBranchId: 'branch-456',
        content: 'Original turn content',
        forkMode: 'explore',
      });
    });
  });

  it('clears draft and calls onClose on cancel', async () => {
    const user = userEvent.setup();
    render(<ForkDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockCancelFork).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    render(<ForkDialog {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    await user.type(dialog, '{Escape}');

    await waitFor(() => {
      expect(mockCancelFork).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('has proper accessibility attributes', () => {
    render(<ForkDialog {...defaultProps} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby');
  });

  it('disables submit when content empty', () => {
    // Mock store with empty content
    (useDebateStore as any).mockImplementation((selector: any) => {
      const mockState = {
        startFork: mockStartFork,
        updateForkDraft: mockUpdateForkDraft,
        cancelFork: mockCancelFork,
        branching: {
          forkDraft: {
            _tag: 'Some',
            value: {
              parentTurnId: 'turn-123',
              parentBranchId: 'branch-456',
              content: '',
              forkMode: 'explore' as const,
            },
          },
        },
      };
      return selector ? selector(mockState) : mockState;
    });

    render(<ForkDialog {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /create fork/i });
    expect(submitButton).toBeDisabled();
  });

  it('displays optional branch name field', () => {
    render(<ForkDialog {...defaultProps} />);
    expect(screen.getByLabelText(/branch name/i)).toBeInTheDocument();
  });

  it('allows entering optional branch name', async () => {
    const user = userEvent.setup();
    render(<ForkDialog {...defaultProps} />);

    const branchNameInput = screen.getByLabelText(/branch name/i);
    await user.type(branchNameInput, 'My Custom Branch');

    expect(branchNameInput).toHaveValue('My Custom Branch');
  });

  it('maintains modal styling with backdrop', () => {
    const { container } = render(<ForkDialog {...defaultProps} />);
    const backdrop = container.querySelector('[data-testid="dialog-backdrop"]');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass('bg-black', 'bg-opacity-50');
  });

  it('displays fork mode descriptions', () => {
    render(<ForkDialog {...defaultProps} />);
    expect(screen.getByText(/persistent branch/i)).toBeInTheDocument();
    expect(screen.getByText(/temporary experimentation/i)).toBeInTheDocument();
  });

  it('handles missing fork draft gracefully', () => {
    // Mock store with no fork draft
    (useDebateStore as any).mockImplementation((selector: any) => {
      const mockState = {
        startFork: mockStartFork,
        updateForkDraft: mockUpdateForkDraft,
        cancelFork: mockCancelFork,
        branching: {
          forkDraft: {
            _tag: 'None',
          },
        },
      };
      return selector ? selector(mockState) : mockState;
    });

    render(<ForkDialog {...defaultProps} />);
    // Should still render but with empty content
    const textarea = screen.getByRole('textbox', { name: /alternative content/i });
    expect(textarea).toHaveValue('');
  });

  it('focuses on textarea when dialog opens', async () => {
    render(<ForkDialog {...defaultProps} />);
    const textarea = screen.getByRole('textbox', { name: /alternative content/i });

    await waitFor(() => {
      expect(textarea).toHaveFocus();
    });
  });
});
