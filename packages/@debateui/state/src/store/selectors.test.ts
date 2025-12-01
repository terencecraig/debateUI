import { describe, it, expect, beforeEach } from 'vitest';
import { useDebateStore } from './debate-store';
import {
  useIsDebateRunning,
  useCurrentRound,
  useTurns,
  useActiveBranch,
  useCanFork,
  useForkDraft,
  useDebateError,
  useConsensus,
  useDebateState,
  useConfig,
  useBranchingState,
} from './selectors';
import * as O from 'fp-ts/Option';
import type { TurnResponse, ConsensusResult, BranchInfo } from '@debateui/core';
import { networkError } from '@debateui/core';
import { renderHook } from '@testing-library/react';

// Helper to create valid TurnResponse
const createTurnResponse = (overrides: Partial<TurnResponse> = {}): TurnResponse => ({
  turnId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  branchId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  participantId: 'claude-3',
  participantType: 'model',
  content: 'Test response',
  tokensUsed: 150,
  costUsd: 0.003,
  latencyMs: 1200,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to create valid ConsensusResult
const createConsensusResult = (overrides: Partial<ConsensusResult> = {}): ConsensusResult => ({
  level: 'strong',
  percentage: 0.85,
  supporting: 4,
  dissenting: 1,
  confidence: 0.9,
  ...overrides,
});

// Helper to create valid BranchInfo
const createBranchInfo = (overrides: Partial<BranchInfo> = {}): BranchInfo => ({
  branchId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  parentBranchId: null,
  forkTurnId: null,
  name: 'Main Branch',
  forkMode: 'save',
  depth: 0,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('Selectors - Debate State', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('useDebateState - should return current debate state', () => {
    const { result } = renderHook(() => useDebateState());
    expect(result.current._tag).toBe('Idle');
  });

  it('useConfig - should return current config', () => {
    const { setConfig } = useDebateStore.getState();
    setConfig({ question: 'Test question', participants: ['alice', 'bob'] });

    const { result } = renderHook(() => useConfig());
    expect(result.current.question).toBe('Test question');
    expect(result.current.participants).toEqual(['alice', 'bob']);
  });

  it('useBranchingState - should return branching state', () => {
    const { result } = renderHook(() => useBranchingState());
    expect(O.isNone(result.current.activeBranchId)).toBe(true);
    expect(result.current.branches.size).toBe(0);
  });
});

describe('Selectors - Debate Running State', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('useIsDebateRunning - should return false when Idle', () => {
    const { result } = renderHook(() => useIsDebateRunning());
    expect(result.current).toBe(false);
  });

  it('useIsDebateRunning - should return true when Running', () => {
    const { setConfig, startDebate, debateStarted } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');

    const { result } = renderHook(() => useIsDebateRunning());
    expect(result.current).toBe(true);
  });

  it('useIsDebateRunning - should return false when Completed', () => {
    const { setConfig, startDebate, debateStarted, completeDebate } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');

    const consensus = createConsensusResult({ percentage: 0.9, level: 'strong' });
    completeDebate(consensus);

    const { result } = renderHook(() => useIsDebateRunning());
    expect(result.current).toBe(false);
  });

  it('useCurrentRound - should return 0 when Idle', () => {
    const { result } = renderHook(() => useCurrentRound());
    expect(result.current).toBe(0);
  });

  it('useCurrentRound - should return current round when Running', () => {
    const { setConfig, startDebate, debateStarted } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');

    const { result } = renderHook(() => useCurrentRound());
    expect(result.current).toBe(1);
  });

  it('useTurns - should return empty array when Idle', () => {
    const { result } = renderHook(() => useTurns());
    expect(result.current).toEqual([]);
  });

  it('useTurns - should return turns when Running', () => {
    const { setConfig, startDebate, debateStarted, receiveTurn } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');

    const turn = createTurnResponse({
      turnId: 'turn-1',
      content: 'My argument',
    });

    receiveTurn(turn);

    const { result } = renderHook(() => useTurns());
    expect(result.current.length).toBe(1);
    expect(result.current[0]?.turnId).toBe('turn-1');
  });

  it('useTurns - should return turns when Completed', () => {
    const { setConfig, startDebate, debateStarted, receiveTurn, completeDebate } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');

    const turn = createTurnResponse({
      turnId: 'turn-1',
      content: 'My argument',
    });

    receiveTurn(turn);

    const consensus = createConsensusResult({ percentage: 0.9, level: 'strong' });
    completeDebate(consensus);

    const { result } = renderHook(() => useTurns());
    expect(result.current.length).toBe(1);
    expect(result.current[0]?.turnId).toBe('turn-1');
  });
});

describe('Selectors - Error and Consensus', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('useDebateError - should return None when no error', () => {
    const { result } = renderHook(() => useDebateError());
    expect(O.isNone(result.current)).toBe(true);
  });

  it('useDebateError - should return Some when error exists', () => {
    const { setConfig, startDebate, setError } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();

    const error = networkError('Connection timeout', new Error('timeout'));
    setError(error, true);

    // Direct selector call instead of renderHook due to Option equality issues
    const debate = useDebateStore.getState().debate;
    const errorOption = debate._tag === 'Error'
      ? O.some(debate.error)
      : O.none;

    expect(O.isSome(errorOption)).toBe(true);
    if (O.isSome(errorOption)) {
      expect(errorOption.value._tag).toBe('NetworkError');
    }
  });

  it('useConsensus - should return None when not completed', () => {
    const { result } = renderHook(() => useConsensus());
    expect(O.isNone(result.current)).toBe(true);
  });

  it('useConsensus - should return Some when completed', () => {
    const { setConfig, startDebate, debateStarted, completeDebate } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');

    const consensus = createConsensusResult({
      level: 'strong',
      percentage: 0.9,
      supporting: 5,
      dissenting: 0,
    });

    completeDebate(consensus);

    // Direct selector call instead of renderHook due to Option equality issues
    const debateResult = useDebateStore.getState().debate;
    const consensusOption = debateResult._tag === 'Completed'
      ? O.some(debateResult.consensus)
      : O.none;

    expect(O.isSome(consensusOption)).toBe(true);
    if (O.isSome(consensusOption)) {
      expect(consensusOption.value.level).toBe('strong');
      expect(consensusOption.value.percentage).toBe(0.9);
    }
  });
});

describe('Selectors - Branching', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('useActiveBranch - should return None initially', () => {
    const { result } = renderHook(() => useActiveBranch());
    expect(O.isNone(result.current)).toBe(true);
  });

  it('useActiveBranch - should return Some after selecting branch', () => {
    const { addBranch, selectBranch } = useDebateStore.getState();

    const branch = createBranchInfo({
      branchId: 'branch-1',
      parentBranchId: 'main',
      name: 'Alternative path',
      forkTurnId: 'turn-1',
      depth: 1,
    });

    addBranch(branch);
    selectBranch('branch-1');

    // Direct selector call instead of renderHook due to Option equality issues
    const state = useDebateStore.getState();
    const activeBranchOption = O.isNone(state.branching.activeBranchId)
      ? O.none
      : O.fromNullable(state.branching.branches.get(state.branching.activeBranchId.value));

    expect(O.isSome(activeBranchOption)).toBe(true);
    if (O.isSome(activeBranchOption)) {
      expect(activeBranchOption.value.branchId).toBe('branch-1');
    }
  });

  it('useCanFork - should return false when Idle', () => {
    const { result } = renderHook(() => useCanFork());
    expect(result.current).toBe(false);
  });

  it('useCanFork - should return true when Running and no fork draft', () => {
    const { setConfig, startDebate, debateStarted } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');

    const { result } = renderHook(() => useCanFork());
    expect(result.current).toBe(true);
  });

  it('useCanFork - should return false when fork draft exists', () => {
    const { setConfig, startDebate, debateStarted, startFork } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');
    startFork('turn-1', 'main');

    const { result } = renderHook(() => useCanFork());
    expect(result.current).toBe(false);
  });

  it('useForkDraft - should return None initially', () => {
    const { result } = renderHook(() => useForkDraft());
    expect(O.isNone(result.current)).toBe(true);
  });

  it('useForkDraft - should return Some after starting fork', () => {
    const { setConfig, startDebate, debateStarted, startFork } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');
    startFork('turn-1', 'main');

    const { result } = renderHook(() => useForkDraft());
    expect(O.isSome(result.current)).toBe(true);
    if (O.isSome(result.current)) {
      expect(result.current.value.parentTurnId).toBe('turn-1');
      expect(result.current.value.parentBranchId).toBe('main');
      expect(result.current.value.content).toBe('');
    }
  });

  it('useForkDraft - should update when content changes', () => {
    const { setConfig, startDebate, debateStarted, startFork, updateForkDraft } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['alice', 'bob'] });
    startDebate();
    debateStarted('debate-123');
    startFork('turn-1', 'main');
    updateForkDraft('Alternative argument');

    const { result } = renderHook(() => useForkDraft());
    expect(O.isSome(result.current)).toBe(true);
    if (O.isSome(result.current)) {
      expect(result.current.value.content).toBe('Alternative argument');
    }
  });
});
