import { describe, it, expect } from 'vitest';
import {
  type DebateAction,
  type BranchingAction,
  updateConfig,
  startDebate,
  debateStarted,
  receiveTurn,
  roundComplete,
  pauseDebate,
  resumeDebate,
  debateComplete,
  error,
  reset,
  selectBranch,
  startFork,
  updateForkDraft,
  submitFork,
  forkCreated,
  cancelFork,
  canTransition,
} from './actions';
import {
  type DebateState,
  idle,
  configuring,
  starting,
  running,
  paused,
  completed,
  error as errorState,
} from './state';
import type { DebateConfig } from './debate';
import type { TurnResponse } from './api-responses';
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

describe('Debate Action Creators', () => {
  describe('updateConfig', () => {
    it('should create UPDATE_CONFIG action', () => {
      const partial: Partial<DebateConfig> = { question: 'New Question' };
      const action = updateConfig(partial);
      expect(action.type).toBe('UPDATE_CONFIG');
      if (action.type === 'UPDATE_CONFIG') {
        expect(action.payload).toEqual({ question: 'New Question' });
      }
    });

    it('should handle multiple config fields', () => {
      const partial: Partial<DebateConfig> = {
        question: 'What is AI Safety?',
        participants: ['claude', 'gpt4'],
        rounds: 5,
      };
      const action = updateConfig(partial);
      if (action.type === 'UPDATE_CONFIG') {
        expect(action.payload.question).toBe('What is AI Safety?');
        expect(action.payload.participants).toEqual(['claude', 'gpt4']);
        expect(action.payload.rounds).toBe(5);
      }
    });

    it('should handle consensus threshold', () => {
      const partial: Partial<DebateConfig> = {
        consensusThreshold: 0.9,
        forkMode: 'explore',
      };
      const action = updateConfig(partial);
      if (action.type === 'UPDATE_CONFIG') {
        expect(action.payload.consensusThreshold).toBe(0.9);
        expect(action.payload.forkMode).toBe('explore');
      }
    });
  });

  describe('startDebate', () => {
    it('should create START_DEBATE action', () => {
      const action = startDebate();
      expect(action.type).toBe('START_DEBATE');
    });
  });

  describe('debateStarted', () => {
    it('should create DEBATE_STARTED action', () => {
      const action = debateStarted('debate-123');
      expect(action.type).toBe('DEBATE_STARTED');
      if (action.type === 'DEBATE_STARTED') {
        expect(action.payload).toEqual({ debateId: 'debate-123' });
      }
    });
  });

  describe('receiveTurn', () => {
    it('should create RECEIVE_TURN action', () => {
      const turn = createTurnResponse();
      const action = receiveTurn(turn);
      expect(action.type).toBe('RECEIVE_TURN');
      if (action.type === 'RECEIVE_TURN') {
        expect(action.payload).toEqual(turn);
      }
    });
  });

  describe('roundComplete', () => {
    it('should create ROUND_COMPLETE action', () => {
      const action = roundComplete(3);
      expect(action.type).toBe('ROUND_COMPLETE');
      if (action.type === 'ROUND_COMPLETE') {
        expect(action.payload).toEqual({ round: 3 });
      }
    });
  });

  describe('pauseDebate', () => {
    it('should create PAUSE_DEBATE action', () => {
      const action = pauseDebate('User requested pause');
      expect(action.type).toBe('PAUSE_DEBATE');
      if (action.type === 'PAUSE_DEBATE') {
        expect(action.payload).toEqual({ reason: 'User requested pause' });
      }
    });
  });

  describe('resumeDebate', () => {
    it('should create RESUME_DEBATE action', () => {
      const action = resumeDebate();
      expect(action.type).toBe('RESUME_DEBATE');
    });
  });

  describe('debateComplete', () => {
    it('should create DEBATE_COMPLETE action', () => {
      const consensus = createConsensusResult();
      const action = debateComplete(consensus);
      expect(action.type).toBe('DEBATE_COMPLETE');
      if (action.type === 'DEBATE_COMPLETE') {
        expect(action.payload).toEqual({ consensus });
      }
    });
  });

  describe('error', () => {
    it('should create ERROR action with recoverable flag', () => {
      const apiError: ApiError = networkError('Connection failed');
      const action = error(apiError, true);
      expect(action.type).toBe('ERROR');
      if (action.type === 'ERROR') {
        expect(action.payload.error).toEqual(apiError);
        expect(action.payload.recoverable).toBe(true);
      }
    });

    it('should create ERROR action with non-recoverable flag', () => {
      const apiError: ApiError = serverError(500, 'Internal server error');
      const action = error(apiError, false);
      if (action.type === 'ERROR') {
        expect(action.payload.recoverable).toBe(false);
      }
    });
  });

  describe('reset', () => {
    it('should create RESET action', () => {
      const action = reset();
      expect(action.type).toBe('RESET');
    });
  });
});

describe('Branching Action Creators', () => {
  describe('selectBranch', () => {
    it('should create SELECT_BRANCH action', () => {
      const action = selectBranch('branch-2');
      expect(action.type).toBe('SELECT_BRANCH');
      if (action.type === 'SELECT_BRANCH') {
        expect(action.payload).toEqual({ branchId: 'branch-2' });
      }
    });
  });

  describe('startFork', () => {
    it('should create START_FORK action', () => {
      const action = startFork('turn-5', 'main');
      expect(action.type).toBe('START_FORK');
      if (action.type === 'START_FORK') {
        expect(action.payload).toEqual({ turnId: 'turn-5', branchId: 'main' });
      }
    });
  });

  describe('updateForkDraft', () => {
    it('should create UPDATE_FORK_DRAFT action', () => {
      const action = updateForkDraft('New draft content');
      expect(action.type).toBe('UPDATE_FORK_DRAFT');
      if (action.type === 'UPDATE_FORK_DRAFT') {
        expect(action.payload).toEqual({ content: 'New draft content' });
      }
    });
  });

  describe('submitFork', () => {
    it('should create SUBMIT_FORK action', () => {
      const action = submitFork();
      expect(action.type).toBe('SUBMIT_FORK');
    });
  });

  describe('forkCreated', () => {
    it('should create FORK_CREATED action', () => {
      const action = forkCreated('branch-new');
      expect(action.type).toBe('FORK_CREATED');
      if (action.type === 'FORK_CREATED') {
        expect(action.payload).toEqual({ branchId: 'branch-new' });
      }
    });
  });

  describe('cancelFork', () => {
    it('should create CANCEL_FORK action', () => {
      const action = cancelFork();
      expect(action.type).toBe('CANCEL_FORK');
    });
  });
});

describe('State Transition Validation', () => {
  describe('canTransition from Idle', () => {
    const state = idle();

    it('should allow UPDATE_CONFIG', () => {
      const action = updateConfig({ question: 'Test question here' });
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow START_DEBATE', () => {
      const action = startDebate();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow DEBATE_STARTED', () => {
      const action = debateStarted('debate-1');
      expect(canTransition(state, action)).toBe(false);
    });

    it('should not allow RECEIVE_TURN', () => {
      const turn = createTurnResponse();
      const action = receiveTurn(turn);
      expect(canTransition(state, action)).toBe(false);
    });

    it('should allow RESET', () => {
      const action = reset();
      expect(canTransition(state, action)).toBe(true);
    });
  });

  describe('canTransition from Configuring', () => {
    const state = configuring({ question: 'Test question' });

    it('should allow UPDATE_CONFIG', () => {
      const action = updateConfig({ rounds: 3 });
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow START_DEBATE', () => {
      const action = startDebate();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow RESET', () => {
      const action = reset();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow RESUME_DEBATE', () => {
      const action = resumeDebate();
      expect(canTransition(state, action)).toBe(false);
    });
  });

  describe('canTransition from Starting', () => {
    const config = createDebateConfig();
    const state = starting(config);

    it('should allow DEBATE_STARTED', () => {
      const action = debateStarted('debate-1');
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow ERROR', () => {
      const apiError: ApiError = networkError('Failed to start');
      const action = error(apiError, false);
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow UPDATE_CONFIG', () => {
      const action = updateConfig({ question: 'New question here' });
      expect(canTransition(state, action)).toBe(false);
    });

    it('should not allow RECEIVE_TURN', () => {
      const turn = createTurnResponse();
      const action = receiveTurn(turn);
      expect(canTransition(state, action)).toBe(false);
    });
  });

  describe('canTransition from Running', () => {
    const state = running('debate-1', 1, []);

    it('should allow RECEIVE_TURN', () => {
      const turn = createTurnResponse();
      const action = receiveTurn(turn);
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow ROUND_COMPLETE', () => {
      const action = roundComplete(1);
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow PAUSE_DEBATE', () => {
      const action = pauseDebate('User pause');
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow DEBATE_COMPLETE', () => {
      const consensus = createConsensusResult();
      const action = debateComplete(consensus);
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow ERROR', () => {
      const apiError: ApiError = networkError('Runtime error');
      const action = error(apiError, true);
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow START_DEBATE', () => {
      const action = startDebate();
      expect(canTransition(state, action)).toBe(false);
    });

    it('should not allow UPDATE_CONFIG', () => {
      const action = updateConfig({ question: 'New question here' });
      expect(canTransition(state, action)).toBe(false);
    });
  });

  describe('canTransition from Paused', () => {
    it('should allow RESUME_DEBATE when resumable', () => {
      const state = paused('debate-1', 'User pause', true);
      const action = resumeDebate();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow RESUME_DEBATE when not resumable', () => {
      const state = paused('debate-1', 'Critical error', false);
      const action = resumeDebate();
      expect(canTransition(state, action)).toBe(false);
    });

    it('should allow RESET', () => {
      const state = paused('debate-1', 'Pause', true);
      const action = reset();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow RECEIVE_TURN', () => {
      const state = paused('debate-1', 'Pause', true);
      const turn = createTurnResponse();
      const action = receiveTurn(turn);
      expect(canTransition(state, action)).toBe(false);
    });
  });

  describe('canTransition from Completed', () => {
    const consensus = createConsensusResult();
    const state = completed('debate-1', consensus, []);

    it('should allow RESET', () => {
      const action = reset();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow RECEIVE_TURN', () => {
      const turn = createTurnResponse();
      const action = receiveTurn(turn);
      expect(canTransition(state, action)).toBe(false);
    });

    it('should not allow START_DEBATE', () => {
      const action = startDebate();
      expect(canTransition(state, action)).toBe(false);
    });
  });

  describe('canTransition from Error', () => {
    it('should allow RESET from recoverable error', () => {
      const apiError: ApiError = networkError('Recoverable error');
      const state = errorState(apiError, true);
      const action = reset();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should allow RESET from non-recoverable error', () => {
      const apiError: ApiError = serverError(500, 'Fatal error');
      const state = errorState(apiError, false);
      const action = reset();
      expect(canTransition(state, action)).toBe(true);
    });

    it('should not allow START_DEBATE', () => {
      const apiError: ApiError = networkError('Error');
      const state = errorState(apiError, true);
      const action = startDebate();
      expect(canTransition(state, action)).toBe(false);
    });

    it('should not allow RECEIVE_TURN', () => {
      const apiError: ApiError = networkError('Error');
      const state = errorState(apiError, true);
      const turn = createTurnResponse();
      const action = receiveTurn(turn);
      expect(canTransition(state, action)).toBe(false);
    });
  });
});

describe('Action Type Safety', () => {
  it('should enforce readonly on action payloads', () => {
    const action = updateConfig({ question: 'Test question here' });
    if (action.type === 'UPDATE_CONFIG') {
      expect(action.payload.question).toBe('Test question here');
    }
  });

  it('should enforce readonly on TurnResponse in action', () => {
    const turn = createTurnResponse({ content: 'Test content' });
    const action = receiveTurn(turn);
    if (action.type === 'RECEIVE_TURN') {
      expect(action.payload.content).toBe('Test content');
    }
  });

  it('should allow discriminated union pattern matching', () => {
    const action: DebateAction = startDebate();
    switch (action.type) {
      case 'UPDATE_CONFIG':
      case 'START_DEBATE':
      case 'DEBATE_STARTED':
      case 'RECEIVE_TURN':
      case 'ROUND_COMPLETE':
      case 'PAUSE_DEBATE':
      case 'RESUME_DEBATE':
      case 'DEBATE_COMPLETE':
      case 'ERROR':
      case 'RESET':
        expect(true).toBe(true);
        break;
      default:
        const _exhaustive: never = action;
        expect(_exhaustive).toBeUndefined();
    }
  });

  it('should allow discriminated union for branching actions', () => {
    const action: BranchingAction = selectBranch('main');
    switch (action.type) {
      case 'SELECT_BRANCH':
      case 'START_FORK':
      case 'UPDATE_FORK_DRAFT':
      case 'SUBMIT_FORK':
      case 'FORK_CREATED':
      case 'CANCEL_FORK':
        expect(true).toBe(true);
        break;
      default:
        const _exhaustive: never = action;
        expect(_exhaustive).toBeUndefined();
    }
  });
});

describe('Complex State Transitions', () => {
  it('should validate complete debate workflow', () => {
    // Idle -> Configuring
    let state: DebateState = idle();
    expect(canTransition(state, updateConfig({ question: 'Test question' }))).toBe(true);

    // Configuring -> Starting
    state = configuring({ question: 'Test question' });
    expect(canTransition(state, startDebate())).toBe(true);

    // Starting -> Running
    const config = createDebateConfig();
    state = starting(config);
    expect(canTransition(state, debateStarted('debate-1'))).toBe(true);

    // Running -> Completed
    state = running('debate-1', 1, []);
    const consensus = createConsensusResult();
    expect(canTransition(state, debateComplete(consensus))).toBe(true);

    // Completed -> Idle (via RESET)
    state = completed('debate-1', consensus, []);
    expect(canTransition(state, reset())).toBe(true);
  });

  it('should validate pause/resume workflow', () => {
    // Running -> Paused
    let state: DebateState = running('debate-1', 1, []);
    expect(canTransition(state, pauseDebate('User pause'))).toBe(true);

    // Paused -> Running (via RESUME)
    state = paused('debate-1', 'User pause', true);
    expect(canTransition(state, resumeDebate())).toBe(true);
  });

  it('should validate error recovery workflow', () => {
    // Running -> Error
    let state: DebateState = running('debate-1', 1, []);
    const apiError: ApiError = networkError('Network error');
    expect(canTransition(state, error(apiError, true))).toBe(true);

    // Error -> Idle (via RESET)
    state = errorState(apiError, true);
    expect(canTransition(state, reset())).toBe(true);
  });
});
