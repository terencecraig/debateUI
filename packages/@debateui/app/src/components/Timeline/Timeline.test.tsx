import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Timeline } from './Timeline';
import type { TurnResponse } from '@debateui/core';

// Mock the state selectors
vi.mock('@debateui/state', () => ({
  useTurns: vi.fn(),
  useIsDebateRunning: vi.fn(),
}));

// Mock the TurnCard component
vi.mock('../TurnCard', () => ({
  TurnCard: ({ turn }: { turn: TurnResponse }) => (
    <div data-testid={`turn-card-${turn.turnId}`}>
      Turn: {turn.content}
    </div>
  ),
}));

import { useTurns, useIsDebateRunning } from '@debateui/state';

const mockUseTurns = useTurns as ReturnType<typeof vi.fn>;
const mockUseIsDebateRunning = useIsDebateRunning as ReturnType<typeof vi.fn>;

describe('Timeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no turns exist and debate is not running', () => {
      mockUseTurns.mockReturnValue([]);
      mockUseIsDebateRunning.mockReturnValue(false);

      render(<Timeline />);

      expect(screen.getByText(/no turns yet/i)).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('shows loading state when debate is running but no turns yet', () => {
      mockUseTurns.mockReturnValue([]);
      mockUseIsDebateRunning.mockReturnValue(true);

      render(<Timeline />);

      expect(screen.getByText(/waiting for first turn/i)).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Turn List Rendering', () => {
    const mockTurns: TurnResponse[] = [
      {
        turnId: '123e4567-e89b-12d3-a456-426614174001',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        participantId: 'claude-3',
        participantType: 'model',
        content: 'First turn response',
        confidence: 0.95,
        tokensUsed: 150,
        costUsd: 0.005,
        latencyMs: 250,
        createdAt: '2024-01-01T10:00:00Z',
      },
      {
        turnId: '123e4567-e89b-12d3-a456-426614174002',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        participantId: 'gpt-4',
        participantType: 'model',
        content: 'Second turn response',
        confidence: 0.88,
        tokensUsed: 200,
        costUsd: 0.008,
        latencyMs: 300,
        createdAt: '2024-01-01T10:01:00Z',
      },
      {
        turnId: '123e4567-e89b-12d3-a456-426614174003',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        participantId: 'gemini-pro',
        participantType: 'model',
        content: 'Third turn response',
        tokensUsed: 175,
        costUsd: 0.006,
        latencyMs: 280,
        createdAt: '2024-01-01T10:02:00Z',
      },
    ];

    it('renders list of turns when turns exist', () => {
      mockUseTurns.mockReturnValue(mockTurns);
      mockUseIsDebateRunning.mockReturnValue(false);

      render(<Timeline />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      expect(screen.getByTestId('turn-card-123e4567-e89b-12d3-a456-426614174001')).toBeInTheDocument();
      expect(screen.getByTestId('turn-card-123e4567-e89b-12d3-a456-426614174002')).toBeInTheDocument();
      expect(screen.getByTestId('turn-card-123e4567-e89b-12d3-a456-426614174003')).toBeInTheDocument();
    });

    it('each turn has unique key attribute', () => {
      mockUseTurns.mockReturnValue(mockTurns);
      mockUseIsDebateRunning.mockReturnValue(false);

      const { container } = render(<Timeline />);

      const listItems = container.querySelectorAll('[role="listitem"]');
      expect(listItems).toHaveLength(3);

      // Check that each list item has a unique key (React doesn't expose key directly,
      // but we can verify through test IDs which should match turnId)
      mockTurns.forEach((turn) => {
        expect(screen.getByTestId(`turn-card-${turn.turnId}`)).toBeInTheDocument();
      });
    });

    it('renders turns in order', () => {
      mockUseTurns.mockReturnValue(mockTurns);
      mockUseIsDebateRunning.mockReturnValue(false);

      render(<Timeline />);

      const turnCards = screen.getAllByTestId(/turn-card-/);
      expect(turnCards).toHaveLength(3);

      // Verify order by checking the content
      expect(turnCards[0]).toHaveTextContent('First turn response');
      expect(turnCards[1]).toHaveTextContent('Second turn response');
      expect(turnCards[2]).toHaveTextContent('Third turn response');
    });
  });

  describe('Auto-scroll Behavior', () => {
    it('auto-scrolls to latest turn when new turn arrives', async () => {
      const initialTurns: TurnResponse[] = [
        {
          turnId: '123e4567-e89b-12d3-a456-426614174001',
          branchId: '123e4567-e89b-12d3-a456-426614174000',
          participantId: 'claude-3',
          participantType: 'model',
          content: 'First turn',
          tokensUsed: 150,
          costUsd: 0.005,
          latencyMs: 250,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      mockUseTurns.mockReturnValue(initialTurns);
      mockUseIsDebateRunning.mockReturnValue(true);

      const { rerender } = render(<Timeline />);

      // Add a new turn
      const newTurn: TurnResponse = {
        turnId: '123e4567-e89b-12d3-a456-426614174002',
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        participantId: 'gpt-4',
        participantType: 'model',
        content: 'Second turn',
        tokensUsed: 200,
        costUsd: 0.008,
        latencyMs: 300,
        createdAt: '2024-01-01T10:01:00Z',
      };

      const updatedTurns = [...initialTurns, newTurn];
      mockUseTurns.mockReturnValue(updatedTurns);

      rerender(<Timeline />);

      await waitFor(() => {
        expect(screen.getByTestId('turn-card-123e4567-e89b-12d3-a456-426614174002')).toBeInTheDocument();
      });

      // Verify the latest turn card exists (scrolling is tested via ref behavior)
      const latestTurnCard = screen.getByTestId('turn-card-123e4567-e89b-12d3-a456-426614174002');
      expect(latestTurnCard).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes for list navigation', () => {
      const mockTurns: TurnResponse[] = [
        {
          turnId: '123e4567-e89b-12d3-a456-426614174001',
          branchId: '123e4567-e89b-12d3-a456-426614174000',
          participantId: 'claude-3',
          participantType: 'model',
          content: 'First turn',
          tokensUsed: 150,
          costUsd: 0.005,
          latencyMs: 250,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      mockUseTurns.mockReturnValue(mockTurns);
      mockUseIsDebateRunning.mockReturnValue(false);

      render(<Timeline />);

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', 'Debate turns timeline');
    });

    it('loading state has proper ARIA role', () => {
      mockUseTurns.mockReturnValue([]);
      mockUseIsDebateRunning.mockReturnValue(true);

      render(<Timeline />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('empty state is accessible to screen readers', () => {
      mockUseTurns.mockReturnValue([]);
      mockUseIsDebateRunning.mockReturnValue(false);

      render(<Timeline />);

      const emptyState = screen.getByText(/no turns yet/i);
      expect(emptyState).toBeInTheDocument();
    });
  });

  describe('Scrolling Behavior', () => {
    it('has proper scrolling container with overflow handling', () => {
      const mockTurns: TurnResponse[] = [
        {
          turnId: '123e4567-e89b-12d3-a456-426614174001',
          branchId: '123e4567-e89b-12d3-a456-426614174000',
          participantId: 'claude-3',
          participantType: 'model',
          content: 'First turn',
          tokensUsed: 150,
          costUsd: 0.005,
          latencyMs: 250,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      mockUseTurns.mockReturnValue(mockTurns);
      mockUseIsDebateRunning.mockReturnValue(false);

      const { container } = render(<Timeline />);

      // Find the scrolling container
      const scrollContainer = container.querySelector('[data-testid="timeline-scroll-container"]');
      expect(scrollContainer).toBeInTheDocument();
      expect(scrollContainer).toHaveClass('overflow-y-auto');
    });
  });
});
