import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { useDebateStore } from './debate-store';
import {
  networkError,
  validationError,
  type TurnResponse,
  type ConsensusResult,
  type BranchInfo,
} from '@debateui/core';
import * as O from 'fp-ts/Option';

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

describe('DebateStore - Initialization', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('should initialize with Idle state', () => {
    const state = useDebateStore.getState();

    expect(state.debate._tag).toBe('Idle');
    expect(state.config.question).toBe('');
    expect(state.config.participants).toEqual([]);
    expect(state.config.rounds).toBe(4);
    expect(state.config.consensusThreshold).toBe(0.8);
    expect(state.config.forkMode).toBe('save');
  });

  it('should initialize branching state with no active branch', () => {
    const state = useDebateStore.getState();

    expect(O.isNone(state.branching.activeBranchId)).toBe(true);
    expect(state.branching.branches.size).toBe(0);
    expect(O.isNone(state.branching.forkDraft)).toBe(true);
  });
});

describe('DebateStore - Configuration', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('should update config partially', () => {
    const { setConfig } = useDebateStore.getState();

    setConfig({ question: 'What is the meaning of life?' });

    const state = useDebateStore.getState();
    expect(state.config.question).toBe('What is the meaning of life?');
    expect(state.config.rounds).toBe(4);
  });

  it('should update multiple config fields', () => {
    const { setConfig } = useDebateStore.getState();

    setConfig({
      question: 'Is AI beneficial?',
      participants: ['claude', 'gpt4'],
      rounds: 3,
    });

    const state = useDebateStore.getState();
    expect(state.config.question).toBe('Is AI beneficial?');
    expect(state.config.participants).toEqual(['claude', 'gpt4']);
    expect(state.config.rounds).toBe(3);
  });
});

describe('DebateStore - State Transitions', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('should transition from Idle to Starting', () => {
    const { setConfig, startDebate } = useDebateStore.getState();

    setConfig({
      question: 'Test question',
      participants: ['claude', 'gpt4'],
    });
    startDebate();

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Starting');
    if (state.debate._tag === 'Starting') {
      expect(state.debate.config.question).toBe('Test question');
    }
  });

  it('should transition from Starting to Running', () => {
    const { setConfig, startDebate, debateStarted } = useDebateStore.getState();

    setConfig({ question: 'Test', participants: ['a', 'b'] });
    startDebate();
    debateStarted('debate-123');

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Running');
    if (state.debate._tag === 'Running') {
      expect(state.debate.debateId).toBe('debate-123');
      expect(state.debate.currentRound).toBe(1);
      expect(state.debate.turns).toEqual([]);
    }
  });
});

describe('DebateStore - Turn Handling', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
    const { setConfig, startDebate, debateStarted } = useDebateStore.getState();
    setConfig({ question: 'Test', participants: ['claude', 'gpt4'] });
    startDebate();
    debateStarted('debate-123');
  });

  it('should receive and store a turn', () => {
    const { receiveTurn } = useDebateStore.getState();
    const turn = createTurnResponse({ content: 'First response' });

    receiveTurn(turn);

    const state = useDebateStore.getState();
    if (state.debate._tag === 'Running') {
      expect(state.debate.turns.length).toBe(1);
      expect(state.debate.turns[0]?.content).toBe('First response');
    }
  });

  it('should append multiple turns', () => {
    const { receiveTurn } = useDebateStore.getState();
    const turn1 = createTurnResponse({
      turnId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      content: 'First',
    });
    const turn2 = createTurnResponse({
      turnId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      content: 'Second',
    });

    receiveTurn(turn1);
    receiveTurn(turn2);

    const state = useDebateStore.getState();
    if (state.debate._tag === 'Running') {
      expect(state.debate.turns.length).toBe(2);
      expect(state.debate.turns[0]?.content).toBe('First');
      expect(state.debate.turns[1]?.content).toBe('Second');
    }
  });
});

describe('DebateStore - Pause/Resume', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
    const { setConfig, startDebate, debateStarted } = useDebateStore.getState();
    setConfig({ question: 'Test', participants: ['a', 'b'] });
    startDebate();
    debateStarted('debate-123');
  });

  it('should pause a running debate', () => {
    const { pauseDebate } = useDebateStore.getState();

    pauseDebate('User requested pause');

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Paused');
    if (state.debate._tag === 'Paused') {
      expect(state.debate.reason).toBe('User requested pause');
      expect(state.debate.canResume).toBe(true);
    }
  });

  it('should resume a paused debate', () => {
    const { pauseDebate, resumeDebate } = useDebateStore.getState();

    pauseDebate('Pause');
    resumeDebate();

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Running');
  });
});

describe('DebateStore - Completion', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
    const { setConfig, startDebate, debateStarted, receiveTurn } = useDebateStore.getState();
    setConfig({ question: 'Test', participants: ['a', 'b'] });
    startDebate();
    debateStarted('debate-123');
    receiveTurn(createTurnResponse({ content: 'Turn 1' }));
  });

  it('should complete a debate with consensus', () => {
    const { completeDebate } = useDebateStore.getState();
    const consensus = createConsensusResult({ percentage: 0.9, level: 'strong' });

    completeDebate(consensus);

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Completed');
    if (state.debate._tag === 'Completed') {
      expect(state.debate.consensus.percentage).toBe(0.9);
      expect(state.debate.turns.length).toBe(1);
    }
  });
});

describe('DebateStore - Error Handling', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('should set recoverable error', () => {
    const { setError } = useDebateStore.getState();
    const error = networkError('Connection lost');

    setError(error, true);

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Error');
    if (state.debate._tag === 'Error') {
      expect(state.debate.error._tag).toBe('NetworkError');
      expect(state.debate.recoverable).toBe(true);
    }
  });

  it('should set non-recoverable error', () => {
    const { setError } = useDebateStore.getState();
    const zodError = new z.ZodError([
      { code: 'custom', message: 'Invalid config', path: ['config'] },
    ]);
    const error = validationError(zodError);

    setError(error, false);

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Error');
    if (state.debate._tag === 'Error') {
      expect(state.debate.recoverable).toBe(false);
    }
  });
});

describe('DebateStore - Branching', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('should select a branch', () => {
    const { selectBranch, addBranch } = useDebateStore.getState();
    const branch = createBranchInfo({
      branchId: 'branch-1',
      name: 'Main Branch',
    });

    addBranch(branch);
    selectBranch('branch-1');

    const state = useDebateStore.getState();
    expect(O.isSome(state.branching.activeBranchId)).toBe(true);
    if (O.isSome(state.branching.activeBranchId)) {
      expect(state.branching.activeBranchId.value).toBe('branch-1');
    }
  });

  it('should add a branch', () => {
    const { addBranch } = useDebateStore.getState();
    const branch = createBranchInfo({
      branchId: 'branch-2',
      parentBranchId: 'branch-1',
      forkTurnId: 'turn-5',
      name: 'Fork Branch',
      depth: 1,
    });

    addBranch(branch);

    const state = useDebateStore.getState();
    expect(state.branching.branches.size).toBe(1);
    expect(state.branching.branches.get('branch-2')?.name).toBe('Fork Branch');
  });
});

describe('DebateStore - Fork Draft', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  it('should start a fork', () => {
    const { startFork } = useDebateStore.getState();

    startFork('turn-5', 'main');

    const state = useDebateStore.getState();
    expect(O.isSome(state.branching.forkDraft)).toBe(true);
    if (O.isSome(state.branching.forkDraft)) {
      expect(state.branching.forkDraft.value.parentTurnId).toBe('turn-5');
      expect(state.branching.forkDraft.value.parentBranchId).toBe('main');
      expect(state.branching.forkDraft.value.content).toBe('');
    }
  });

  it('should update fork draft content', () => {
    const { startFork, updateForkDraft } = useDebateStore.getState();

    startFork('turn-5', 'main');
    updateForkDraft('Alternative argument');

    const state = useDebateStore.getState();
    if (O.isSome(state.branching.forkDraft)) {
      expect(state.branching.forkDraft.value.content).toBe('Alternative argument');
    }
  });

  it('should cancel fork', () => {
    const { startFork, cancelFork } = useDebateStore.getState();

    startFork('turn-5', 'main');
    cancelFork();

    const state = useDebateStore.getState();
    expect(O.isNone(state.branching.forkDraft)).toBe(true);
  });

  it('should complete fork and clear draft', () => {
    const { startFork, updateForkDraft, completeFork } = useDebateStore.getState();

    startFork('turn-5', 'main');
    updateForkDraft('New content');
    completeFork('new-branch-id');

    const state = useDebateStore.getState();
    expect(O.isNone(state.branching.forkDraft)).toBe(true);
  });
});

describe('DebateStore - Reset', () => {
  it('should reset to initial state', () => {
    const store = useDebateStore.getState();

    // Set up some state
    store.setConfig({ question: 'Test', participants: ['a', 'b'] });
    store.startDebate();
    store.debateStarted('debate-1');
    store.receiveTurn(createTurnResponse());
    store.addBranch(createBranchInfo());
    store.selectBranch('main');

    // Reset
    store.reset();

    const state = useDebateStore.getState();
    expect(state.debate._tag).toBe('Idle');
    expect(state.config.question).toBe('');
    expect(O.isNone(state.branching.activeBranchId)).toBe(true);
    expect(state.branching.branches.size).toBe(0);
  });
});
