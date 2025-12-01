import * as O from 'fp-ts/Option';
import type { DebateConfig } from './debate';
import type { TurnResponse, BranchInfo } from './api-responses';
import type { ConsensusResult } from './consensus';
import type { ApiError } from './errors';

/**
 * Debate state machine using discriminated unions for type-safe state transitions.
 * Each state has a unique _tag that enables exhaustive pattern matching.
 */
export type DebateState =
  | { readonly _tag: 'Idle' }
  | { readonly _tag: 'Configuring'; readonly draft: Partial<DebateConfig> }
  | { readonly _tag: 'Starting'; readonly config: DebateConfig }
  | { readonly _tag: 'Running'; readonly debateId: string; readonly currentRound: number; readonly turns: readonly TurnResponse[] }
  | { readonly _tag: 'Paused'; readonly debateId: string; readonly reason: string; readonly canResume: boolean }
  | { readonly _tag: 'Completed'; readonly debateId: string; readonly consensus: ConsensusResult; readonly turns: readonly TurnResponse[] }
  | { readonly _tag: 'Error'; readonly error: ApiError; readonly recoverable: boolean };

/**
 * Type guards for DebateState variants.
 * These enable type narrowing in conditional branches.
 */
export const isIdle = (s: DebateState): s is Extract<DebateState, { _tag: 'Idle' }> => s._tag === 'Idle';
export const isConfiguring = (s: DebateState): s is Extract<DebateState, { _tag: 'Configuring' }> => s._tag === 'Configuring';
export const isStarting = (s: DebateState): s is Extract<DebateState, { _tag: 'Starting' }> => s._tag === 'Starting';
export const isRunning = (s: DebateState): s is Extract<DebateState, { _tag: 'Running' }> => s._tag === 'Running';
export const isPaused = (s: DebateState): s is Extract<DebateState, { _tag: 'Paused' }> => s._tag === 'Paused';
export const isCompleted = (s: DebateState): s is Extract<DebateState, { _tag: 'Completed' }> => s._tag === 'Completed';
export const isError = (s: DebateState): s is Extract<DebateState, { _tag: 'Error' }> => s._tag === 'Error';

/**
 * State constructors (smart constructors pattern).
 * These are the only way to create valid DebateState instances.
 */
export const idle = (): DebateState => ({ _tag: 'Idle' });

export const configuring = (draft: Partial<DebateConfig>): DebateState => ({
  _tag: 'Configuring',
  draft,
});

export const starting = (config: DebateConfig): DebateState => ({
  _tag: 'Starting',
  config,
});

export const running = (
  debateId: string,
  currentRound: number,
  turns: readonly TurnResponse[]
): DebateState => ({
  _tag: 'Running',
  debateId,
  currentRound,
  turns,
});

export const paused = (
  debateId: string,
  reason: string,
  canResume: boolean
): DebateState => ({
  _tag: 'Paused',
  debateId,
  reason,
  canResume,
});

export const completed = (
  debateId: string,
  consensus: ConsensusResult,
  turns: readonly TurnResponse[]
): DebateState => ({
  _tag: 'Completed',
  debateId,
  consensus,
  turns,
});

export const error = (apiError: ApiError, recoverable: boolean): DebateState => ({
  _tag: 'Error',
  error: apiError,
  recoverable,
});

/**
 * Fork draft for creating alternative debate branches.
 */
export type ForkDraft = {
  readonly parentTurnId: string;
  readonly parentBranchId: string;
  readonly content: string;
  readonly forkMode: 'save' | 'explore';
};

/**
 * Branching state manages multiple debate timelines.
 * Uses fp-ts Option for nullable fields to enforce null safety.
 */
export type BranchingState = {
  readonly activeBranchId: O.Option<string>;
  readonly branches: ReadonlyMap<string, BranchInfo>;
  readonly forkDraft: O.Option<ForkDraft>;
};

/**
 * Creates initial branching state with no active branch.
 */
export const initialBranchingState = (): BranchingState => ({
  activeBranchId: O.none,
  branches: new Map(),
  forkDraft: O.none,
});

/**
 * Combined store state containing all application state.
 */
export type StoreState = {
  readonly debate: DebateState;
  readonly branching: BranchingState;
  readonly config: DebateConfig;
};
