import type { DebateConfig } from './debate';
import type { TurnResponse } from './api-responses';
import type { ConsensusResult } from './consensus';
import type { ApiError } from './errors';
import type { DebateState } from './state';

/**
 * Action discriminated union for debate state transitions.
 * Each action type corresponds to a specific state transition.
 */
export type DebateAction =
  | { readonly type: 'UPDATE_CONFIG'; readonly payload: Partial<DebateConfig> }
  | { readonly type: 'START_DEBATE' }
  | { readonly type: 'DEBATE_STARTED'; readonly payload: { debateId: string } }
  | { readonly type: 'RECEIVE_TURN'; readonly payload: TurnResponse }
  | { readonly type: 'ROUND_COMPLETE'; readonly payload: { round: number } }
  | { readonly type: 'PAUSE_DEBATE'; readonly payload: { reason: string } }
  | { readonly type: 'RESUME_DEBATE' }
  | { readonly type: 'DEBATE_COMPLETE'; readonly payload: { consensus: ConsensusResult } }
  | { readonly type: 'ERROR'; readonly payload: { error: ApiError; recoverable: boolean } }
  | { readonly type: 'RESET' };

/**
 * Action discriminated union for branching operations.
 */
export type BranchingAction =
  | { readonly type: 'SELECT_BRANCH'; readonly payload: { branchId: string } }
  | { readonly type: 'START_FORK'; readonly payload: { turnId: string; branchId: string } }
  | { readonly type: 'UPDATE_FORK_DRAFT'; readonly payload: { content: string } }
  | { readonly type: 'SUBMIT_FORK' }
  | { readonly type: 'FORK_CREATED'; readonly payload: { branchId: string } }
  | { readonly type: 'CANCEL_FORK' };

/**
 * Action creators for debate actions.
 * These are type-safe constructors for creating action objects.
 */
export const updateConfig = (payload: Partial<DebateConfig>): DebateAction => ({
  type: 'UPDATE_CONFIG',
  payload,
});

export const startDebate = (): DebateAction => ({
  type: 'START_DEBATE',
});

export const debateStarted = (debateId: string): DebateAction => ({
  type: 'DEBATE_STARTED',
  payload: { debateId },
});

export const receiveTurn = (payload: TurnResponse): DebateAction => ({
  type: 'RECEIVE_TURN',
  payload,
});

export const roundComplete = (round: number): DebateAction => ({
  type: 'ROUND_COMPLETE',
  payload: { round },
});

export const pauseDebate = (reason: string): DebateAction => ({
  type: 'PAUSE_DEBATE',
  payload: { reason },
});

export const resumeDebate = (): DebateAction => ({
  type: 'RESUME_DEBATE',
});

export const debateComplete = (consensus: ConsensusResult): DebateAction => ({
  type: 'DEBATE_COMPLETE',
  payload: { consensus },
});

export const error = (error: ApiError, recoverable: boolean): DebateAction => ({
  type: 'ERROR',
  payload: { error, recoverable },
});

export const reset = (): DebateAction => ({
  type: 'RESET',
});

/**
 * Action creators for branching actions.
 */
export const selectBranch = (branchId: string): BranchingAction => ({
  type: 'SELECT_BRANCH',
  payload: { branchId },
});

export const startFork = (turnId: string, branchId: string): BranchingAction => ({
  type: 'START_FORK',
  payload: { turnId, branchId },
});

export const updateForkDraft = (content: string): BranchingAction => ({
  type: 'UPDATE_FORK_DRAFT',
  payload: { content },
});

export const submitFork = (): BranchingAction => ({
  type: 'SUBMIT_FORK',
});

export const forkCreated = (branchId: string): BranchingAction => ({
  type: 'FORK_CREATED',
  payload: { branchId },
});

export const cancelFork = (): BranchingAction => ({
  type: 'CANCEL_FORK',
});

/**
 * State transition validator (pure function).
 * Validates whether a given action is valid from the current state.
 *
 * @param from - Current debate state
 * @param action - Action to validate
 * @returns true if transition is valid, false otherwise
 */
export const canTransition = (from: DebateState, action: DebateAction): boolean => {
  // Define valid state transitions
  switch (from._tag) {
    case 'Idle':
      return (
        action.type === 'UPDATE_CONFIG' ||
        action.type === 'START_DEBATE' ||
        action.type === 'RESET'
      );

    case 'Configuring':
      return (
        action.type === 'UPDATE_CONFIG' ||
        action.type === 'START_DEBATE' ||
        action.type === 'RESET'
      );

    case 'Starting':
      return (
        action.type === 'DEBATE_STARTED' ||
        action.type === 'ERROR'
      );

    case 'Running':
      return (
        action.type === 'RECEIVE_TURN' ||
        action.type === 'ROUND_COMPLETE' ||
        action.type === 'PAUSE_DEBATE' ||
        action.type === 'DEBATE_COMPLETE' ||
        action.type === 'ERROR'
      );

    case 'Paused':
      // Can only resume if the state indicates it's resumable
      if (action.type === 'RESUME_DEBATE') {
        return from.canResume;
      }
      return action.type === 'RESET';

    case 'Completed':
      return action.type === 'RESET';

    case 'Error':
      return action.type === 'RESET';

    default:
      // Exhaustive check - should never reach here
      const _exhaustive: never = from;
      void _exhaustive;
      return false;
  }
};
