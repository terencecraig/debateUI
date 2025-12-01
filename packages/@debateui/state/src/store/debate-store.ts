import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type {
  DebateConfig,
  TurnResponse,
  ConsensusResult,
  ApiError,
  BranchInfo,
} from '@debateui/core';
import {
  idle,
  starting,
  running,
  paused,
  completed,
  error as errorState,
  initialBranchingState,
  type DebateState,
  type BranchingState,
  type ForkDraft,
} from '@debateui/core';
import * as O from 'fp-ts/Option';

// Enable Map/Set support in immer
enableMapSet();

/**
 * Initial debate configuration with sensible defaults.
 */
const initialConfig: DebateConfig = {
  question: '',
  participants: [],
  rounds: 4,
  consensusThreshold: 0.8,
  forkMode: 'save',
};

/**
 * Store state interface combining debate, branching, and configuration.
 */
interface DebateStore {
  // State
  debate: DebateState;
  branching: BranchingState;
  config: DebateConfig;

  // Debate Actions
  setConfig: (config: Partial<DebateConfig>) => void;
  startDebate: () => void;
  debateStarted: (debateId: string) => void;
  receiveTurn: (turn: TurnResponse) => void;
  pauseDebate: (reason: string) => void;
  resumeDebate: () => void;
  completeDebate: (consensus: ConsensusResult) => void;
  setError: (error: ApiError, recoverable: boolean) => void;
  reset: () => void;

  // Branching Actions
  selectBranch: (branchId: string) => void;
  addBranch: (branch: BranchInfo) => void;
  startFork: (turnId: string, branchId: string) => void;
  updateForkDraft: (content: string) => void;
  cancelFork: () => void;
  completeFork: (newBranchId: string) => void;
}

/**
 * Zustand store with immer middleware for immutable state updates.
 * Uses fp-ts Option for nullable values to enforce null safety.
 */
export const useDebateStore = create<DebateStore>()(
  immer((set) => ({
    // Initial state
    debate: idle(),
    branching: initialBranchingState(),
    config: initialConfig,

    // Debate Actions

    /**
     * Updates debate configuration partially.
     * Can be called in Idle or Configuring state.
     */
    setConfig: (newConfig: Partial<DebateConfig>) => {
      set((state) => {
        state.config = { ...state.config, ...newConfig };
      });
    },

    /**
     * Initiates debate start sequence.
     * Transitions from Idle/Configuring to Starting.
     */
    startDebate: () => {
      set((state) => {
        const currentConfig = state.config;
        // Cast to any to work around immer WritableDraft readonly incompatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state.debate as any) = starting(currentConfig);
      });
    },

    /**
     * Confirms debate has started on backend.
     * Transitions from Starting to Running.
     */
    debateStarted: (debateId: string) => {
      set((state) => {
        if (state.debate._tag === 'Starting') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state.debate as any) = running(debateId, 1, []);
        }
      });
    },

    /**
     * Receives a new turn from a participant.
     * Appends turn to history. Round management is done externally via setRound.
     */
    receiveTurn: (turn: TurnResponse) => {
      set((state) => {
        if (state.debate._tag === 'Running') {
          // Create new turns array with the new turn
          const newTurns = [...state.debate.turns, turn];

          // Cast to any to work around immer WritableDraft readonly incompatibility
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state.debate as any) = running(
            state.debate.debateId,
            state.debate.currentRound,
            newTurns
          );
        }
      });
    },

    /**
     * Pauses an ongoing debate.
     * Transitions from Running to Paused.
     */
    pauseDebate: (reason: string) => {
      set((state) => {
        if (state.debate._tag === 'Running') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state.debate as any) = paused(state.debate.debateId, reason, true);
        }
      });
    },

    /**
     * Resumes a paused debate.
     * Transitions from Paused back to Running.
     */
    resumeDebate: () => {
      set((state) => {
        if (state.debate._tag === 'Paused' && state.debate.canResume) {
          // Need to restore Running state - use stored data
          // For now, we'll restore with minimal state
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state.debate as any) = running(state.debate.debateId, 1, []);
        }
      });
    },

    /**
     * Completes the debate with final consensus.
     * Transitions from Running to Completed.
     */
    completeDebate: (consensus: ConsensusResult) => {
      set((state) => {
        if (state.debate._tag === 'Running') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (state.debate as any) = completed(
            state.debate.debateId,
            consensus,
            state.debate.turns
          );
        }
      });
    },

    /**
     * Sets error state with recovery information.
     * Can transition from any state except Completed.
     */
    setError: (error: ApiError, recoverable: boolean) => {
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state.debate as any) = errorState(error, recoverable);
      });
    },

    /**
     * Resets store to initial state.
     * Can be called from any state.
     */
    reset: () => {
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state.debate as any) = idle();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (state.branching as any) = initialBranchingState();
        state.config = initialConfig;
      });
    },

    // Branching Actions

    /**
     * Selects a specific branch as the active branch.
     */
    selectBranch: (branchId: string) => {
      set((state) => {
        state.branching.activeBranchId = O.some(branchId);
      });
    },

    /**
     * Adds a new branch to the branching state.
     */
    addBranch: (branch: BranchInfo) => {
      set((state) => {
        // Create a new Map with the added branch
        const newBranches = new Map(state.branching.branches);
        newBranches.set(branch.branchId, branch);
        state.branching.branches = newBranches;
      });
    },

    /**
     * Starts creating a fork from a specific turn.
     * Creates a fork draft in "explore" mode by default.
     */
    startFork: (turnId: string, branchId: string) => {
      set((state) => {
        const draft: ForkDraft = {
          parentTurnId: turnId,
          parentBranchId: branchId,
          content: '',
          forkMode: state.config.forkMode,
        };
        state.branching.forkDraft = O.some(draft);
      });
    },

    /**
     * Updates the content of the current fork draft.
     */
    updateForkDraft: (content: string) => {
      set((state) => {
        if (O.isSome(state.branching.forkDraft)) {
          const currentDraft = state.branching.forkDraft.value;
          state.branching.forkDraft = O.some({
            ...currentDraft,
            content,
          });
        }
      });
    },

    /**
     * Cancels the current fork draft.
     */
    cancelFork: () => {
      set((state) => {
        state.branching.forkDraft = O.none;
      });
    },

    /**
     * Completes the fork and clears the draft.
     * The actual branch creation is handled by the API layer.
     */
    completeFork: (_newBranchId: string) => {
      set((state) => {
        state.branching.forkDraft = O.none;
        // The branch will be added via addBranch when the API responds
      });
    },
  }))
);
