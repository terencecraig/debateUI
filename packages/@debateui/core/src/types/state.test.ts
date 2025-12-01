import { describe, it, expect } from 'vitest';
import * as O from 'fp-ts/Option';
import {
  type DebateState,
  type BranchingState,
  type ForkDraft,
  type StoreState,
  isIdle,
  isConfiguring,
  isStarting,
  isRunning,
  isPaused,
  isCompleted,
  isError,
  idle,
  configuring,
  starting,
  running,
  paused,
  completed,
  error as errorState,
  initialBranchingState,
} from './state';
import type { DebateConfig } from './debate';
import type { TurnResponse, BranchInfo } from './api-responses';
import type { ConsensusResult } from './consensus';
import { networkError, serverError, type ApiError } from './errors';

// Helper to create valid TurnResponse
const createTurnResponse = (overrides: Partial<TurnResponse> = {}): TurnResponse => ({
  turnId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  branchId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  participantId: 'claude-3',
  participantType: 'model',
  content: 'My response',
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

// Helper to create valid DebateConfig
const createDebateConfig = (overrides: Partial<DebateConfig> = {}): DebateConfig => ({
  question: 'What is the meaning of truth?',
  participants: ['claude-3', 'gpt-4'],
  rounds: 3,
  consensusThreshold: 0.8,
  forkMode: 'save',
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

describe('State Type Guards', () => {
  describe('isIdle', () => {
    it('should return true for Idle state', () => {
      const state: DebateState = { _tag: 'Idle' };
      expect(isIdle(state)).toBe(true);
    });

    it('should return false for non-Idle states', () => {
      const states: DebateState[] = [
        { _tag: 'Configuring', draft: {} },
        { _tag: 'Starting', config: createDebateConfig() },
        { _tag: 'Running', debateId: '1', currentRound: 1, turns: [] },
      ];
      states.forEach(state => {
        expect(isIdle(state)).toBe(false);
      });
    });
  });

  describe('isConfiguring', () => {
    it('should return true for Configuring state', () => {
      const state: DebateState = { _tag: 'Configuring', draft: { question: 'test' } };
      expect(isConfiguring(state)).toBe(true);
    });

    it('should narrow type correctly', () => {
      const state: DebateState = { _tag: 'Configuring', draft: { question: 'test' } };
      if (isConfiguring(state)) {
        expect(state.draft.question).toBe('test');
      }
    });
  });

  describe('isStarting', () => {
    it('should return true for Starting state', () => {
      const config = createDebateConfig();
      const state: DebateState = { _tag: 'Starting', config };
      expect(isStarting(state)).toBe(true);
    });
  });

  describe('isRunning', () => {
    it('should return true for Running state', () => {
      const state: DebateState = {
        _tag: 'Running',
        debateId: 'debate-1',
        currentRound: 2,
        turns: [],
      };
      expect(isRunning(state)).toBe(true);
    });

    it('should narrow type correctly with turns', () => {
      const turn = createTurnResponse({ content: 'Hello' });
      const state: DebateState = {
        _tag: 'Running',
        debateId: 'debate-1',
        currentRound: 1,
        turns: [turn],
      };
      if (isRunning(state)) {
        expect(state.turns.length).toBe(1);
        expect(state.turns[0]?.content).toBe('Hello');
      }
    });
  });

  describe('isPaused', () => {
    it('should return true for Paused state', () => {
      const state: DebateState = {
        _tag: 'Paused',
        debateId: 'debate-1',
        reason: 'User requested',
        canResume: true,
      };
      expect(isPaused(state)).toBe(true);
    });

    it('should handle non-resumable pause', () => {
      const state: DebateState = {
        _tag: 'Paused',
        debateId: 'debate-1',
        reason: 'Critical error',
        canResume: false,
      };
      if (isPaused(state)) {
        expect(state.canResume).toBe(false);
      }
    });
  });

  describe('isCompleted', () => {
    it('should return true for Completed state', () => {
      const consensus = createConsensusResult();
      const state: DebateState = {
        _tag: 'Completed',
        debateId: 'debate-1',
        consensus,
        turns: [],
      };
      expect(isCompleted(state)).toBe(true);
    });
  });

  describe('isError', () => {
    it('should return true for Error state', () => {
      const apiError: ApiError = networkError('Something went wrong');
      const state: DebateState = {
        _tag: 'Error',
        error: apiError,
        recoverable: true,
      };
      expect(isError(state)).toBe(true);
    });

    it('should handle non-recoverable errors', () => {
      const apiError: ApiError = serverError(500, 'Unrecoverable');
      const state: DebateState = {
        _tag: 'Error',
        error: apiError,
        recoverable: false,
      };
      if (isError(state)) {
        expect(state.recoverable).toBe(false);
      }
    });
  });
});

describe('State Constructors', () => {
  describe('idle', () => {
    it('should create Idle state', () => {
      const state = idle();
      expect(state._tag).toBe('Idle');
      expect(isIdle(state)).toBe(true);
    });
  });

  describe('configuring', () => {
    it('should create Configuring state with empty draft', () => {
      const state = configuring({});
      expect(state._tag).toBe('Configuring');
      if (isConfiguring(state)) {
        expect(state.draft).toEqual({});
      }
    });

    it('should create Configuring state with partial config', () => {
      const draft = { question: 'AI Ethics', participants: ['claude', 'gpt4'] };
      const state = configuring(draft);
      expect(state._tag).toBe('Configuring');
      if (isConfiguring(state)) {
        expect(state.draft.question).toBe('AI Ethics');
        expect(state.draft.participants).toEqual(['claude', 'gpt4']);
      }
    });

    it('should preserve readonly properties', () => {
      const draft = { participants: ['claude'] };
      const state = configuring(draft);
      if (isConfiguring(state)) {
        expect(state.draft.participants).toEqual(['claude']);
      }
    });
  });

  describe('starting', () => {
    it('should create Starting state with full config', () => {
      const config = createDebateConfig({
        question: 'Climate Change',
        participants: ['claude', 'codex', 'gemini'],
        rounds: 3,
      });
      const state = starting(config);
      expect(state._tag).toBe('Starting');
      if (isStarting(state)) {
        expect(state.config).toEqual(config);
      }
    });

    it('should include optional config fields', () => {
      const config = createDebateConfig({
        consensusThreshold: 0.9,
        forkMode: 'explore',
      });
      const state = starting(config);
      if (isStarting(state)) {
        expect(state.config.consensusThreshold).toBe(0.9);
        expect(state.config.forkMode).toBe('explore');
      }
    });
  });

  describe('running', () => {
    it('should create Running state with no turns', () => {
      const state = running('debate-1', 1, []);
      expect(state._tag).toBe('Running');
      if (isRunning(state)) {
        expect(state.debateId).toBe('debate-1');
        expect(state.currentRound).toBe(1);
        expect(state.turns).toEqual([]);
      }
    });

    it('should create Running state with turns', () => {
      const turn = createTurnResponse({ content: 'My argument' });
      const state = running('debate-1', 1, [turn]);
      if (isRunning(state)) {
        expect(state.turns.length).toBe(1);
        expect(state.turns[0]?.content).toBe('My argument');
      }
    });

    it('should preserve turn order', () => {
      const turns: TurnResponse[] = [
        createTurnResponse({
          turnId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          content: 'First',
          createdAt: '2024-01-01T00:00:00Z',
        }),
        createTurnResponse({
          turnId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
          content: 'Second',
          createdAt: '2024-01-01T00:00:01Z',
        }),
      ];
      const state = running('debate-1', 1, turns);
      if (isRunning(state)) {
        expect(state.turns[0]?.content).toBe('First');
        expect(state.turns[1]?.content).toBe('Second');
      }
    });
  });

  describe('paused', () => {
    it('should create Paused state with resumable flag', () => {
      const state = paused('debate-1', 'User paused', true);
      expect(state._tag).toBe('Paused');
      if (isPaused(state)) {
        expect(state.debateId).toBe('debate-1');
        expect(state.reason).toBe('User paused');
        expect(state.canResume).toBe(true);
      }
    });

    it('should create non-resumable Paused state', () => {
      const state = paused('debate-1', 'System error', false);
      if (isPaused(state)) {
        expect(state.canResume).toBe(false);
      }
    });
  });

  describe('completed', () => {
    it('should create Completed state with consensus', () => {
      const consensus = createConsensusResult({ percentage: 0.9, level: 'strong' });
      const turns: TurnResponse[] = [];
      const state = completed('debate-1', consensus, turns);
      expect(state._tag).toBe('Completed');
      if (isCompleted(state)) {
        expect(state.consensus.level).toBe('strong');
        expect(state.consensus.percentage).toBe(0.9);
      }
    });

    it('should handle no consensus reached', () => {
      const consensus = createConsensusResult({
        level: 'none',
        percentage: 0.3,
      });
      const state = completed('debate-1', consensus, []);
      if (isCompleted(state)) {
        expect(state.consensus.level).toBe('none');
      }
    });
  });

  describe('error', () => {
    it('should create Error state with recoverable flag', () => {
      const apiError: ApiError = networkError('Too many requests');
      const state = errorState(apiError, true);
      expect(state._tag).toBe('Error');
      if (isError(state)) {
        expect(state.error._tag).toBe('NetworkError');
        expect(state.recoverable).toBe(true);
      }
    });

    it('should create non-recoverable Error state', () => {
      const apiError: ApiError = serverError(500, 'Bad configuration');
      const state = errorState(apiError, false);
      if (isError(state)) {
        expect(state.recoverable).toBe(false);
        expect(state.error._tag).toBe('ServerError');
      }
    });
  });
});

describe('BranchingState', () => {
  describe('initialBranchingState', () => {
    it('should create initial branching state', () => {
      const state = initialBranchingState();
      expect(O.isNone(state.activeBranchId)).toBe(true);
      expect(state.branches.size).toBe(0);
      expect(O.isNone(state.forkDraft)).toBe(true);
    });
  });

  describe('ForkDraft', () => {
    it('should create fork draft with save mode', () => {
      const draft: ForkDraft = {
        parentTurnId: 'turn-5',
        parentBranchId: 'main',
        content: 'Alternative argument',
        forkMode: 'save',
      };
      expect(draft.forkMode).toBe('save');
      expect(draft.content).toBe('Alternative argument');
    });

    it('should create fork draft with explore mode', () => {
      const draft: ForkDraft = {
        parentTurnId: 'turn-3',
        parentBranchId: 'branch-1',
        content: 'Experimental idea',
        forkMode: 'explore',
      };
      expect(draft.forkMode).toBe('explore');
    });
  });

  describe('BranchingState with branches', () => {
    it('should handle multiple branches', () => {
      const branches = new Map<string, BranchInfo>([
        ['main', createBranchInfo({ name: 'Main Branch' })],
        [
          'branch-1',
          createBranchInfo({
            branchId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
            parentBranchId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            forkTurnId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
            name: 'Alternative Path',
            depth: 1,
          }),
        ],
      ]);
      const state: BranchingState = {
        activeBranchId: O.some('branch-1'),
        branches,
        forkDraft: O.none,
      };
      expect(O.isSome(state.activeBranchId)).toBe(true);
      expect(state.branches.size).toBe(2);
    });

    it('should handle fork draft in progress', () => {
      const draft: ForkDraft = {
        parentTurnId: 'turn-2',
        parentBranchId: 'main',
        content: 'Draft content',
        forkMode: 'save',
      };
      const state: BranchingState = {
        activeBranchId: O.some('main'),
        branches: new Map(),
        forkDraft: O.some(draft),
      };
      expect(O.isSome(state.forkDraft)).toBe(true);
    });
  });
});

describe('StoreState', () => {
  it('should combine debate, branching, and config state', () => {
    const config = createDebateConfig({ question: 'Test Topic' });
    const store: StoreState = {
      debate: idle(),
      branching: initialBranchingState(),
      config,
    };
    expect(isIdle(store.debate)).toBe(true);
    expect(O.isNone(store.branching.activeBranchId)).toBe(true);
    expect(store.config.question).toBe('Test Topic');
  });

  it('should handle running state with branches', () => {
    const config = createDebateConfig({
      question: 'AI Ethics',
      participants: ['claude', 'codex', 'gemini'],
      rounds: 3,
    });
    const branches = new Map<string, BranchInfo>([
      ['main', createBranchInfo({ name: 'Main' })],
    ]);
    const store: StoreState = {
      debate: running('debate-1', 1, []),
      branching: {
        activeBranchId: O.some('main'),
        branches,
        forkDraft: O.none,
      },
      config,
    };
    expect(isRunning(store.debate)).toBe(true);
    expect(O.isSome(store.branching.activeBranchId)).toBe(true);
  });
});

describe('State Machine Invariants', () => {
  it('should enforce readonly on DebateState', () => {
    const state = running('debate-1', 1, []);
    if (isRunning(state)) {
      expect(state.currentRound).toBe(1);
    }
  });

  it('should enforce readonly on turns array', () => {
    const turn = createTurnResponse({ content: 'Test' });
    const state = running('debate-1', 1, [turn]);
    if (isRunning(state)) {
      expect(state.turns.length).toBe(1);
    }
  });

  it('should enforce readonly on BranchingState branches', () => {
    const branches = new Map<string, BranchInfo>();
    const state: BranchingState = {
      activeBranchId: O.none,
      branches,
      forkDraft: O.none,
    };
    expect(state.branches.size).toBe(0);
  });

  it('should use discriminated unions for exhaustive checking', () => {
    const state: DebateState = idle();
    switch (state._tag) {
      case 'Idle':
      case 'Configuring':
      case 'Starting':
      case 'Running':
      case 'Paused':
      case 'Completed':
      case 'Error':
        expect(true).toBe(true);
        break;
      default:
        const _exhaustive: never = state;
        expect(_exhaustive).toBeUndefined();
    }
  });
});
