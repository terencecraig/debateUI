import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricsPanel } from './MetricsPanel';
import { useDebateStore } from '@debateui/state';
import type { TurnResponse, ConsensusResult } from '@debateui/core';

describe('MetricsPanel', () => {
  beforeEach(() => {
    // Reset store before each test
    useDebateStore.getState().reset();
  });

  // Helper to start a debate
  const startDebate = () => {
    const store = useDebateStore.getState();
    store.setConfig({ question: 'Test question?', participants: [] });
    store.startDebate();
    store.debateStarted('debate-1');
  };

  const mockTurn1: TurnResponse = {
    turnId: 'turn-1',
    branchId: 'branch-1',
    participantId: 'gpt-4',
    participantType: 'model',
    content: 'First response',
    tokensUsed: 150,
    costUsd: 0.0045,
    latencyMs: 1200,
    createdAt: '2025-12-01T10:00:00Z',
  };

  const mockTurn2: TurnResponse = {
    turnId: 'turn-2',
    branchId: 'branch-1',
    participantId: 'claude',
    participantType: 'model',
    content: 'Second response',
    tokensUsed: 200,
    costUsd: 0.0060,
    latencyMs: 1500,
    createdAt: '2025-12-01T10:01:00Z',
  };

  const mockTurn3: TurnResponse = {
    turnId: 'turn-3',
    branchId: 'branch-1',
    participantId: 'user-123',
    participantType: 'human',
    content: 'Third response',
    tokensUsed: 50,
    costUsd: 0.0015,
    latencyMs: 800,
    createdAt: '2025-12-01T10:02:00Z',
  };

  const mockConsensus: ConsensusResult = {
    level: 'strong',
    percentage: 0.85,
    supporting: 4,
    dissenting: 1,
    confidence: 0.92,
  };

  it('shows zero metrics when no turns', () => {
    render(<MetricsPanel />);

    expect(screen.getByText('Total Turns')).toBeInTheDocument();
    expect(screen.getByText('Current Round')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0); // Multiple zeros

    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('$0.0000')).toBeInTheDocument();

    expect(screen.getByText('Avg Latency')).toBeInTheDocument();
    expect(screen.getByText('0ms')).toBeInTheDocument();
  });

  it('calculates total tokens correctly', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);
    store.receiveTurn(mockTurn2);
    store.receiveTurn(mockTurn3);

    render(<MetricsPanel />);

    // 150 + 200 + 50 = 400
    expect(screen.getByText('400')).toBeInTheDocument();
  });

  it('calculates total cost correctly', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);
    store.receiveTurn(mockTurn2);
    store.receiveTurn(mockTurn3);

    render(<MetricsPanel />);

    // 0.0045 + 0.0060 + 0.0015 = 0.0120
    expect(screen.getByText('$0.0120')).toBeInTheDocument();
  });

  it('calculates average latency correctly', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);
    store.receiveTurn(mockTurn2);
    store.receiveTurn(mockTurn3);

    render(<MetricsPanel />);

    // (1200 + 1500 + 800) / 3 = 1166.67 rounded to 1167
    expect(screen.getByText('1167ms')).toBeInTheDocument();
  });

  it('shows current round', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);

    render(<MetricsPanel />);

    // debateStarted sets currentRound to 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('displays consensus when available', async () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);
    store.receiveTurn(mockTurn2);
    store.receiveTurn(mockTurn3);

    // Complete debate before rendering
    store.completeDebate(mockConsensus);

    // Wait a tick for state to stabilize
    await new Promise(resolve => setTimeout(resolve, 0));

    render(<MetricsPanel />);

    expect(screen.getByText('Consensus')).toBeInTheDocument();
    expect(screen.getByText('strong')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('does not display consensus when debate is running', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);

    render(<MetricsPanel />);

    expect(screen.queryByText('Consensus')).not.toBeInTheDocument();
  });

  it('formats currency values correctly', () => {
    startDebate();
    const store = useDebateStore.getState();
    const expensiveTurn: TurnResponse = {
      ...mockTurn1,
      costUsd: 1.23456789,
    };
    store.receiveTurn(expensiveTurn);

    render(<MetricsPanel />);

    // Should format to 4 decimal places
    expect(screen.getByText('$1.2346')).toBeInTheDocument();
  });

  it('formats percentage values correctly', async () => {
    startDebate();
    const store = useDebateStore.getState();
    const consensusWithDecimals: ConsensusResult = {
      level: 'moderate',
      percentage: 0.6789,
      supporting: 3,
      dissenting: 2,
      confidence: 0.85,
    };
    store.receiveTurn(mockTurn1);
    store.completeDebate(consensusWithDecimals);

    // Wait a tick for state to stabilize
    await new Promise(resolve => setTimeout(resolve, 0));

    render(<MetricsPanel />);

    // Should format to whole percentage
    expect(screen.getByText('68%')).toBeInTheDocument();
  });

  it('handles Option types properly for consensus', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);

    const { container } = render(<MetricsPanel />);

    // Should not throw when consensus is None
    expect(container).toBeInTheDocument();
    expect(screen.queryByText('Consensus')).not.toBeInTheDocument();
  });

  it('updates in real-time as turns come in', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);

    const { rerender } = render(<MetricsPanel />);

    // Initial state: 1 turn
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument(); // tokens
    expect(screen.getByText('$0.0045')).toBeInTheDocument(); // cost

    // Add another turn
    store.receiveTurn(mockTurn2);

    rerender(<MetricsPanel />);

    // Updated state: 2 turns
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument(); // 150 + 200
    expect(screen.getByText('$0.0105')).toBeInTheDocument(); // 0.0045 + 0.0060
  });

  it('displays all metrics with proper labels', () => {
    render(<MetricsPanel />);

    expect(screen.getByText('Total Turns')).toBeInTheDocument();
    expect(screen.getByText('Current Round')).toBeInTheDocument();
    expect(screen.getByText('Total Tokens')).toBeInTheDocument();
    expect(screen.getByText('Total Cost')).toBeInTheDocument();
    expect(screen.getByText('Avg Latency')).toBeInTheDocument();
  });

  it('uses card-based layout with Tailwind classes', () => {
    const { container } = render(<MetricsPanel />);

    // Should have a card wrapper
    const panel = container.querySelector('[data-testid="metrics-panel"]');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveClass('rounded-lg');
    expect(panel).toHaveClass('border');
    expect(panel).toHaveClass('shadow-sm');
  });

  it('displays turn count correctly', () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);
    store.receiveTurn(mockTurn2);
    store.receiveTurn(mockTurn3);

    render(<MetricsPanel />);

    expect(screen.getByText('Total Turns')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('handles empty turns array gracefully', () => {
    startDebate();

    render(<MetricsPanel />);

    expect(screen.getByText('Total Turns')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0); // Multiple zeros (turn count, tokens)
    expect(screen.getByText('$0.0000')).toBeInTheDocument();
    expect(screen.getByText('0ms')).toBeInTheDocument();
  });

  it('rounds average latency to nearest integer', () => {
    startDebate();
    const store = useDebateStore.getState();
    const turn1 = { ...mockTurn1, latencyMs: 1000 };
    const turn2 = { ...mockTurn2, latencyMs: 1500 };
    const turn3 = { ...mockTurn3, latencyMs: 1501 };

    store.receiveTurn(turn1);
    store.receiveTurn(turn2);
    store.receiveTurn(turn3);

    render(<MetricsPanel />);

    // (1000 + 1500 + 1501) / 3 = 1333.67 -> 1334
    expect(screen.getByText('1334ms')).toBeInTheDocument();
  });

  it('displays consensus confidence level', async () => {
    startDebate();
    const store = useDebateStore.getState();
    store.receiveTurn(mockTurn1);
    store.completeDebate(mockConsensus);

    // Wait a tick for state to stabilize
    await new Promise(resolve => setTimeout(resolve, 0));

    render(<MetricsPanel />);

    // Should show supporting/dissenting counts - use more specific selectors
    expect(screen.getByText('Supporting')).toBeInTheDocument();
    expect(screen.getByText('Dissenting')).toBeInTheDocument();
    expect(screen.getByText('Confidence')).toBeInTheDocument();

    // Verify the consensus section is present
    expect(screen.getByText('Consensus')).toBeInTheDocument();
    expect(screen.getByText('strong')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument(); // confidence
  });
});
