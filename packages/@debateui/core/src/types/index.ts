// Core domain types for debate system - Re-exports from source modules

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
} from './debate';

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
} from './participant';

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
} from './consensus';

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
} from './api-responses';

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
} from './errors';

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
} from './state';

// Action types
export {
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
  error as errorAction,
  reset,
  selectBranch,
  startFork,
  updateForkDraft,
  submitFork,
  forkCreated,
  cancelFork,
  canTransition,
} from './actions';
