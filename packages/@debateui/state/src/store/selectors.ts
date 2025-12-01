import { useDebateStore } from './debate-store';
import * as O from 'fp-ts/Option';
import type { DebateState, BranchingState, DebateConfig, TurnResponse, BranchInfo, ConsensusResult, ApiError, ForkDraft } from '@debateui/core';

/**
 * Selectors for deriving state from the debate store.
 * These are memoized by Zustand and only re-render when the selected value changes.
 */

/**
 * Returns the current debate state.
 */
export const useDebateState = (): DebateState =>
  useDebateStore((state) => state.debate);

/**
 * Returns the current debate configuration.
 */
export const useConfig = (): DebateConfig =>
  useDebateStore((state) => state.config);

/**
 * Returns the current branching state.
 */
export const useBranchingState = (): BranchingState =>
  useDebateStore((state) => state.branching);

/**
 * Returns true if a debate is currently running.
 */
export const useIsDebateRunning = (): boolean =>
  useDebateStore((state) => state.debate._tag === 'Running');

/**
 * Returns the current round number, or 0 if not running.
 */
export const useCurrentRound = (): number =>
  useDebateStore((state) =>
    state.debate._tag === 'Running' ? state.debate.currentRound : 0
  );

/**
 * Empty turns array - stable reference for when no turns exist.
 */
const EMPTY_TURNS: readonly TurnResponse[] = [];

/**
 * Returns the list of turns for the current debate.
 * Returns empty array if debate is not running or completed.
 */
export const useTurns = (): readonly TurnResponse[] =>
  useDebateStore((state) =>
    state.debate._tag === 'Running' || state.debate._tag === 'Completed'
      ? state.debate.turns
      : EMPTY_TURNS
  );

/**
 * Returns the currently active branch, if any.
 * Uses fp-ts Option to safely handle nullable branch lookup.
 */
export const useActiveBranch = (): O.Option<BranchInfo> =>
  useDebateStore((state) => {
    if (O.isNone(state.branching.activeBranchId)) {
      return O.none;
    }
    const branch = state.branching.branches.get(state.branching.activeBranchId.value);
    return branch ? O.some(branch) : O.none;
  });

/**
 * Returns true if a fork can be created (debate is running and no fork draft exists).
 */
export const useCanFork = (): boolean =>
  useDebateStore(
    (state) =>
      state.debate._tag === 'Running' && O.isNone(state.branching.forkDraft)
  );

/**
 * Returns the current fork draft, if any.
 */
export const useForkDraft = (): O.Option<ForkDraft> =>
  useDebateStore((state) => state.branching.forkDraft);

/**
 * Returns the current debate error, if any.
 * Returns None if debate is not in error state.
 */
export const useDebateError = (): O.Option<ApiError> =>
  useDebateStore((state) =>
    state.debate._tag === 'Error' ? O.some(state.debate.error) : O.none
  );

/**
 * Returns the consensus result if debate is completed.
 * Returns None if debate is not completed.
 */
export const useConsensus = (): O.Option<ConsensusResult> =>
  useDebateStore((state) =>
    state.debate._tag === 'Completed' ? O.some(state.debate.consensus) : O.none
  );

/**
 * Returns the debate ID if debate has started.
 * Returns None if debate is idle or starting.
 */
export const useDebateId = (): O.Option<string> =>
  useDebateStore((state) => {
    switch (state.debate._tag) {
      case 'Running':
      case 'Paused':
      case 'Completed':
        return O.some(state.debate.debateId);
      default:
        return O.none;
    }
  });

/**
 * Returns true if the debate is in a terminal state (Completed or Error).
 */
export const useIsDebateTerminal = (): boolean =>
  useDebateStore(
    (state) =>
      state.debate._tag === 'Completed' || state.debate._tag === 'Error'
  );

/**
 * Returns true if the debate is paused.
 */
export const useIsDebatePaused = (): boolean =>
  useDebateStore((state) => state.debate._tag === 'Paused');

/**
 * Returns true if the debate can be resumed (is paused and resumable).
 */
export const useCanResume = (): boolean =>
  useDebateStore(
    (state) =>
      state.debate._tag === 'Paused' && state.debate.canResume
  );

/**
 * Returns the number of branches currently tracked.
 */
export const useBranchCount = (): number =>
  useDebateStore((state) => state.branching.branches.size);

/**
 * Returns the number of branches (for change detection).
 */
const selectBranchCount = (state: { branching: BranchingState }) =>
  state.branching.branches.size;

/**
 * Returns all branches as an array.
 * Uses branch count to detect changes and avoid infinite loops.
 */
export const useAllBranches = (): BranchInfo[] => {
  // Subscribe to branch count for change detection
  const branchCount = useDebateStore(selectBranchCount);
  // Get branches from current state (not subscribed to avoid loop)
  const branches = useDebateStore.getState().branching.branches;

  // Only recompute array when count changes
  if (branchCount === 0) return [];
  return Array.from(branches.values());
};

/**
 * Returns a specific branch by ID, if it exists.
 */
export const useBranch = (branchId: string): O.Option<BranchInfo> =>
  useDebateStore((state) =>
    O.fromNullable(state.branching.branches.get(branchId))
  );

/**
 * Returns true if there are any turns in the current debate.
 */
export const useHasTurns = (): boolean =>
  useDebateStore((state) => {
    if (state.debate._tag === 'Running' || state.debate._tag === 'Completed') {
      return state.debate.turns.length > 0;
    }
    return false;
  });

/**
 * Returns the total number of turns in the current debate.
 */
export const useTurnCount = (): number =>
  useDebateStore((state) => {
    if (state.debate._tag === 'Running' || state.debate._tag === 'Completed') {
      return state.debate.turns.length;
    }
    return 0;
  });

/**
 * Returns the last turn in the debate, if any.
 */
export const useLastTurn = (): O.Option<TurnResponse | undefined> =>
  useDebateStore((state) => {
    if (state.debate._tag === 'Running' || state.debate._tag === 'Completed') {
      const turns = state.debate.turns;
      return turns.length > 0 ? O.some(turns[turns.length - 1]) : O.none;
    }
    return O.none;
  });

/**
 * Returns true if the debate configuration is complete and valid.
 */
export const useIsConfigValid = (): boolean =>
  useDebateStore((state) => {
    const { question, participants } = state.config;
    return question.length >= 10 && participants.length >= 2;
  });
