// @debateui/state - Zustand store and selectors
// This file exports the store, selectors, and related utilities

export const VERSION = '0.1.0';

// Export the main store
export { useDebateStore } from './store/debate-store';

// Export all selectors
export {
  useDebateState,
  useConfig,
  useBranchingState,
  useIsDebateRunning,
  useCurrentRound,
  useTurns,
  useActiveBranch,
  useCanFork,
  useForkDraft,
  useDebateError,
  useConsensus,
  useDebateId,
  useIsDebateTerminal,
  useIsDebatePaused,
  useCanResume,
  useBranchCount,
  useAllBranches,
  useBranch,
  useHasTurns,
  useTurnCount,
  useLastTurn,
  useIsConfigValid,
} from './store/selectors';

// Re-export types from core for convenience
export type {
  DebateState,
  BranchingState,
  ForkDraft,
  StoreState,
  DebateConfig,
  TurnResponse,
  ConsensusResult,
  ApiError,
  BranchInfo,
} from '@debateui/core';
