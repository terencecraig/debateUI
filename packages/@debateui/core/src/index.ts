// @debateui/core - Domain types and utilities
// This file exports all types and utilities

export const VERSION = '0.1.0';

// Debate types
export {
  DebateConfigSchema,
  parseDebateConfig,
  type DebateId,
  type BranchId,
  type TurnId,
  type ForkMode,
  type DebateConfig,
  type Turn,
  type Branch,
  type DebateTranscript,
} from './types/debate';

// Participant types
export {
  ParticipantSchema,
  ParticipantTypeSchema,
  ModelProviderSchema,
  createModelParticipant,
  createHumanParticipant,
  isModelParticipant,
  isHumanParticipant,
  type Participant,
  type ParticipantType,
  type ModelProvider,
} from './types/participant';

// Consensus types
export {
  ConsensusLevelSchema,
  ConsensusResultSchema,
  calculateConsensusLevel,
  createConsensusResult,
  meetsThreshold,
  isStrongConsensus,
  hasConsensus,
  type ConsensusLevel,
  type ConsensusResult,
} from './types/consensus';

// API Response types
export {
  TurnResponseSchema,
  DebateStatusSchema,
  DebateResponseSchema,
  BranchInfoSchema,
  parseTurnResponse,
  parseDebateResponse,
  parseBranchInfo,
  type TurnResponse,
  type DebateStatus,
  type DebateResponse,
  type BranchInfo,
} from './types/api-responses';

// API Error types
export {
  type ApiError,
  isNetworkError,
  isValidationError,
  isAuthError,
  isRateLimitError,
  isNotFoundError,
  isConflictError,
  isServerError,
  networkError,
  validationError,
  authError,
  rateLimitError,
  notFoundError,
  conflictError,
  serverError,
  formatApiError,
} from './types/errors';

// State types
export {
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
  error,
  initialBranchingState,
} from './types/state';

// Action types
export {
  type DebateAction,
  type BranchingAction,
  updateConfig,
  startDebate as startDebateAction,
  debateStarted as debateStartedAction,
  receiveTurn as receiveTurnAction,
  roundComplete,
  pauseDebate as pauseDebateAction,
  resumeDebate as resumeDebateAction,
  debateComplete as debateCompleteAction,
  error as errorAction,
  reset as resetAction,
  selectBranch as selectBranchAction,
  startFork as startForkAction,
  updateForkDraft as updateForkDraftAction,
  submitFork,
  forkCreated,
  cancelFork as cancelForkAction,
  canTransition,
} from './types/actions';
