import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TurnCard } from './TurnCard';
import type { TurnResponse } from '@debateui/core';

describe('TurnCard', () => {
  const mockModelTurn: TurnResponse = {
    turnId: 'turn-1',
    branchId: 'branch-1',
    participantId: 'gpt-4',
    participantType: 'model',
    content: 'This is a model response discussing the topic.',
    tokensUsed: 150,
    costUsd: 0.0045,
    latencyMs: 1200,
    createdAt: '2025-12-01T10:00:00Z',
  };

  const mockHumanTurn: TurnResponse = {
    turnId: 'turn-2',
    branchId: 'branch-1',
    participantId: 'user-123',
    participantType: 'human',
    content: 'This is a human response.',
    tokensUsed: 50,
    costUsd: 0.0015,
    latencyMs: 500,
    createdAt: '2025-12-01T10:01:00Z',
  };

  const mockAnotherModelTurn: TurnResponse = {
    turnId: 'turn-3',
    branchId: 'branch-1',
    participantId: 'claude-3',
    participantType: 'model',
    content: 'This is another model response.',
    tokensUsed: 25,
    costUsd: 0.001,
    latencyMs: 300,
    createdAt: '2025-12-01T10:02:00Z',
  };

  it('renders turn content correctly', () => {
    render(<TurnCard turn={mockModelTurn} />);
    expect(screen.getByText('This is a model response discussing the topic.')).toBeInTheDocument();
  });

  it('displays participant info for model', () => {
    render(<TurnCard turn={mockModelTurn} />);
    expect(screen.getByText('gpt-4')).toBeInTheDocument();
    const badge = screen.getAllByText(/model/i)[0];
    expect(badge).toHaveClass('rounded-full');
  });

  it('displays participant info for human', () => {
    render(<TurnCard turn={mockHumanTurn} />);
    expect(screen.getByText('user-123')).toBeInTheDocument();
    const badge = screen.getAllByText(/human/i)[0];
    expect(badge).toHaveClass('rounded-full');
  });

  it('displays participant info for another model', () => {
    render(<TurnCard turn={mockAnotherModelTurn} />);
    expect(screen.getByText('claude-3')).toBeInTheDocument();
    const badge = screen.getAllByText(/model/i)[0];
    expect(badge).toHaveClass('rounded-full');
  });

  it('shows metrics correctly', () => {
    render(<TurnCard turn={mockModelTurn} />);
    expect(screen.getByText(/150/)).toBeInTheDocument(); // tokens
    expect(screen.getByText(/0\.0045/)).toBeInTheDocument(); // cost
    expect(screen.getByText(/1200/)).toBeInTheDocument(); // latency
  });

  it('applies correct styling for model participant type', () => {
    const { container } = render(<TurnCard turn={mockModelTurn} />);
    const card = container.querySelector('[data-participant-type="model"]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-blue-50');
  });

  it('applies correct styling for human participant type', () => {
    const { container } = render(<TurnCard turn={mockHumanTurn} />);
    const card = container.querySelector('[data-participant-type="human"]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-green-50');
  });


  it('does not show fork button when onFork callback not provided', () => {
    render(<TurnCard turn={mockModelTurn} />);
    expect(screen.queryByRole('button', { name: /fork/i })).not.toBeInTheDocument();
  });

  it('shows fork button when onFork callback provided', () => {
    const onFork = vi.fn();
    render(<TurnCard turn={mockModelTurn} onFork={onFork} />);
    expect(screen.getByRole('button', { name: /fork/i })).toBeInTheDocument();
  });

  it('calls onFork callback when fork button clicked', async () => {
    const user = userEvent.setup();
    const onFork = vi.fn();
    render(<TurnCard turn={mockModelTurn} onFork={onFork} />);

    const forkButton = screen.getByRole('button', { name: /fork/i });
    await user.click(forkButton);

    expect(onFork).toHaveBeenCalledTimes(1);
    expect(onFork).toHaveBeenCalledWith('turn-1');
  });

  it('has proper accessibility attributes', () => {
    render(<TurnCard turn={mockModelTurn} />);

    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('gpt-4'));
  });

  it('displays timestamp in readable format', () => {
    render(<TurnCard turn={mockModelTurn} />);
    // Timestamp should be formatted - checking for formatted date pattern
    expect(screen.getByText(/12\/01\/2025/)).toBeInTheDocument();
  });

  it('handles long content with text wrapping', () => {
    const longContentTurn: TurnResponse = {
      ...mockModelTurn,
      content: 'A'.repeat(500),
    };
    const { container } = render(<TurnCard turn={longContentTurn} />);
    const contentElement = container.querySelector('[data-testid="turn-content"]');
    expect(contentElement).toHaveClass('whitespace-pre-wrap');
  });

  it('displays all metrics with proper labels', () => {
    render(<TurnCard turn={mockModelTurn} />);
    expect(screen.getByText(/tokens/i)).toBeInTheDocument();
    expect(screen.getByText(/cost/i)).toBeInTheDocument();
    expect(screen.getByText(/latency/i)).toBeInTheDocument();
  });
});
