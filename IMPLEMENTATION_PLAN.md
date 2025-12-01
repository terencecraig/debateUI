# DebateUI Implementation Plan

**Version:** 1.0
**Date:** 2025-12-01
**Branch:** `feature/debate-ui-standalone` (CCR)
**Status:** Ready for Execution

---

## Executive Summary

Build a standalone multi-agent debate UI using React 18 + TypeScript + Vite, integrating with CCR's Conversation API and HyperWeave for fork concurrency coordination. This plan follows **TDD-first**, **FP-first** development with wave-based parallel agent execution.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      debateUI (Frontend)                         │
│  React 18 + TypeScript + Vite + Tailwind + Zustand + fp-ts      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Domain Types │  │ State Store  │  │ UI Components        │   │
│  │ (fp-ts)      │  │ (Zustand)    │  │ (React + Tailwind)   │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Client Layer (TaskEither)                │   │
│  │  - Conversation API client                                │   │
│  │  - HyperWeave fork coordination client                    │   │
│  │  - WebSocket real-time client                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CCR Backend                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ Conversation │  │ HyperWeave   │  │ Debate Workflow      │   │
│  │ API          │  │ (Fork Coord) │  │ (5-participant)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Development Constraints (NON-NEGOTIABLE)

### TDD Protocol
```
RED    → Write failing test first (Vitest + React Testing Library)
GREEN  → Implement minimum code to pass
REFACTOR → Clean up while tests pass
```

### FP-First Patterns (TypeScript)
- **fp-ts** for Result types: `Either<Error, T>`, `Option<T>`, `TaskEither<Error, T>`
- **Immutable state** with Zustand (no mutations)
- **Pure functions** for all business logic
- **Discriminated unions** for state machines
- **Zod** for runtime validation with type inference

### Type Safety
- **TypeScript strict mode** (`"strict": true`)
- **No `any` types** - use `unknown` with narrowing
- **ESLint strict rules** + Prettier
- **100% type coverage** for exported functions

### Parallel Agent Rules
- **NEVER** have multiple agents edit same file
- **Wave pattern**: Sequential waves, parallel within each wave
- **Read-Consolidate**: Parallel reads → single consolidation write
- **File ownership**: Each agent owns distinct files/directories

---

## Wave Structure

### Wave 0: Project Scaffolding [Sequential - Foundation]
**Duration:** 30 min | **Agents:** 1 (setup)

#### 0.1 Initialize Monorepo
```bash
# Project structure
debateUI/
├── packages/
│   ├── @debateui/core/          # Shared types + utilities
│   ├── @debateui/api-client/    # CCR API client (fp-ts)
│   ├── @debateui/state/         # Zustand store
│   └── @debateui/app/           # React application
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── .eslintrc.cjs
```

#### 0.2 Dependencies
```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "zustand": "^4.5.0",
    "fp-ts": "^2.16.0",
    "io-ts": "^2.2.21",
    "zod": "^3.23.0",
    "tailwindcss": "^3.4.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0"
  }
}
```

#### 0.3 TypeScript Config (Strict)
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

**Deliverables:**
- [ ] pnpm workspace initialized
- [ ] TypeScript strict mode configured
- [ ] Vitest + RTL configured
- [ ] ESLint + Prettier configured
- [ ] Tailwind CSS configured
- [ ] CI pipeline (lint + type-check + test)

---

### Wave 1: Domain Types & Validation [Parallel - 3 Agents]
**Duration:** 1 hour | **Agents:** 3 (separate files)

#### Agent 1A: Core Domain Types (`@debateui/core/src/types/`)
**File ownership:** `debate.ts`, `participant.ts`, `consensus.ts`

```typescript
// packages/core/src/types/debate.ts
import { z } from 'zod';
import * as E from 'fp-ts/Either';

// Branded types for type safety
export type DebateId = string & { readonly _brand: unique symbol };
export type BranchId = string & { readonly _brand: unique symbol };
export type TurnId = string & { readonly _brand: unique symbol };

// Zod schemas with fp-ts integration
export const DebateConfigSchema = z.object({
  question: z.string().min(10).max(500),
  participants: z.array(z.string()).min(2).max(7),
  rounds: z.number().int().min(1).max(10).default(4),
  consensusThreshold: z.number().min(0.5).max(1.0).default(0.8),
  forkMode: z.enum(['save', 'explore']).default('save'),
});

export type DebateConfig = z.infer<typeof DebateConfigSchema>;

// Result type wrapper
export const parseDebateConfig = (input: unknown): E.Either<z.ZodError, DebateConfig> =>
  E.tryCatch(
    () => DebateConfigSchema.parse(input),
    (e) => e as z.ZodError
  );
```

#### Agent 1B: API Response Types (`@debateui/core/src/types/`)
**File ownership:** `api-responses.ts`, `errors.ts`

```typescript
// packages/core/src/types/api-responses.ts
import { z } from 'zod';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';

export const TurnResponseSchema = z.object({
  turnId: z.string().uuid(),
  branchId: z.string().uuid(),
  participantId: z.string(),
  participantType: z.enum(['model', 'human']),
  content: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  tokensUsed: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
});

export type TurnResponse = z.infer<typeof TurnResponseSchema>;

// Error types (discriminated union)
export type ApiError =
  | { _tag: 'NetworkError'; message: string }
  | { _tag: 'ValidationError'; errors: z.ZodError }
  | { _tag: 'AuthError'; message: string }
  | { _tag: 'RateLimitError'; retryAfterMs: number }
  | { _tag: 'ServerError'; statusCode: number; message: string };
```

#### Agent 1C: State Types (`@debateui/core/src/types/`)
**File ownership:** `state.ts`, `actions.ts`

```typescript
// packages/core/src/types/state.ts
import * as O from 'fp-ts/Option';
import type { DebateConfig, TurnResponse } from './debate';

// State machine with discriminated union
export type DebateState =
  | { _tag: 'Idle' }
  | { _tag: 'Configuring'; draft: Partial<DebateConfig> }
  | { _tag: 'Running'; debateId: string; currentRound: number; turns: TurnResponse[] }
  | { _tag: 'Paused'; debateId: string; reason: string }
  | { _tag: 'Completed'; debateId: string; consensus: ConsensusResult }
  | { _tag: 'Error'; error: ApiError };

// Branching state for fork visualization
export type BranchingState = {
  activeBranchId: O.Option<string>;
  branches: ReadonlyMap<string, BranchInfo>;
  forkDraft: O.Option<ForkDraft>;
};
```

**TDD Requirement:** Each agent writes tests FIRST in `*.test.ts` files.

**Deliverables:**
- [ ] All domain types with Zod schemas
- [ ] fp-ts Either/Option wrappers for all parsers
- [ ] 100% test coverage for validation functions
- [ ] Exported from `@debateui/core`

---

### Wave 2: API Client Layer [Parallel - 3 Agents]
**Duration:** 2 hours | **Agents:** 3 (separate modules)

#### Agent 2A: Conversation API Client (`@debateui/api-client/src/`)
**File ownership:** `conversation-client.ts`, `conversation-client.test.ts`

```typescript
// packages/api-client/src/conversation-client.ts
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import type { DebateConfig, TurnResponse, ApiError } from '@debateui/core';

export interface ConversationClient {
  readonly createDebate: (config: DebateConfig) => TE.TaskEither<ApiError, { debateId: string }>;
  readonly getTurns: (debateId: string) => TE.TaskEither<ApiError, readonly TurnResponse[]>;
  readonly submitHumanTurn: (debateId: string, content: string) => TE.TaskEither<ApiError, TurnResponse>;
  readonly pause: (debateId: string) => TE.TaskEither<ApiError, void>;
  readonly resume: (debateId: string) => TE.TaskEither<ApiError, void>;
}

export const createConversationClient = (baseUrl: string): ConversationClient => ({
  createDebate: (config) => pipe(
    TE.tryCatch(
      async () => {
        const res = await fetch(`${baseUrl}/v1/debates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      },
      (e): ApiError => ({ _tag: 'NetworkError', message: String(e) })
    ),
    TE.chainEitherK((data) =>
      E.tryCatch(
        () => ({ debateId: z.object({ debate_id: z.string() }).parse(data).debate_id }),
        (e): ApiError => ({ _tag: 'ValidationError', errors: e as z.ZodError })
      )
    )
  ),
  // ... other methods
});
```

#### Agent 2B: HyperWeave Fork Client (`@debateui/api-client/src/`)
**File ownership:** `hyperweave-client.ts`, `hyperweave-client.test.ts`

```typescript
// packages/api-client/src/hyperweave-client.ts
import * as TE from 'fp-ts/TaskEither';
import type { BranchId, TurnId, ApiError } from '@debateui/core';

export interface HyperWeaveClient {
  // Fork coordination with leasing
  readonly acquireForkLease: (turnId: TurnId) => TE.TaskEither<ApiError, LeaseHandle>;
  readonly createFork: (lease: LeaseHandle, config: ForkConfig) => TE.TaskEither<ApiError, BranchId>;
  readonly releaseLease: (lease: LeaseHandle) => TE.TaskEither<ApiError, void>;

  // Branch queries
  readonly getBranches: (debateId: string) => TE.TaskEither<ApiError, readonly BranchInfo[]>;
  readonly getBranchTree: (debateId: string) => TE.TaskEither<ApiError, BranchTree>;
}

// Lease handle for atomic fork operations
export interface LeaseHandle {
  readonly leaseId: string;
  readonly turnId: TurnId;
  readonly expiresAt: Date;
}
```

#### Agent 2C: WebSocket Client (`@debateui/api-client/src/`)
**File ownership:** `websocket-client.ts`, `websocket-client.test.ts`

```typescript
// packages/api-client/src/websocket-client.ts
import * as O from 'fp-ts/Option';
import * as E from 'fp-ts/Either';
import { Subject, Observable } from 'rxjs';

export type DebateEvent =
  | { _tag: 'RoundStart'; round: number; type: string }
  | { _tag: 'ModelResponse'; participantId: string; content: string; cost: number }
  | { _tag: 'ConsensusUpdate'; percentage: number; supporting: number; dissenting: number }
  | { _tag: 'CostUpdate'; turnCost: number; cumulative: number }
  | { _tag: 'DebateComplete'; consensus: ConsensusResult }
  | { _tag: 'Error'; error: ApiError };

export interface WebSocketClient {
  readonly connect: (debateId: string) => E.Either<ApiError, void>;
  readonly disconnect: () => void;
  readonly events$: Observable<DebateEvent>;
  readonly connectionState$: Observable<ConnectionState>;
}
```

**TDD Requirement:** Mock fetch/WebSocket, test all error paths.

**Deliverables:**
- [ ] ConversationClient with full CRUD
- [ ] HyperWeaveClient for fork coordination
- [ ] WebSocketClient for real-time events
- [ ] All methods return TaskEither<ApiError, T>
- [ ] 100% test coverage

---

### Wave 3: State Management [Sequential - Single Agent]
**Duration:** 2 hours | **Agents:** 1 (single store file)

#### Agent 3A: Zustand Store (`@debateui/state/src/`)
**File ownership:** `store.ts`, `selectors.ts`, `actions.ts`, `store.test.ts`

```typescript
// packages/state/src/store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import * as O from 'fp-ts/Option';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { DebateState, BranchingState, DebateConfig } from '@debateui/core';

interface DebateStore {
  // State (immutable via immer)
  readonly debate: DebateState;
  readonly branching: BranchingState;
  readonly config: DebateConfig;

  // Pure action dispatchers (return new state)
  readonly actions: {
    readonly updateConfig: (partial: Partial<DebateConfig>) => void;
    readonly startDebate: () => TE.TaskEither<ApiError, void>;
    readonly handleEvent: (event: DebateEvent) => void;
    readonly selectBranch: (branchId: string) => void;
    readonly startFork: (turnId: string) => void;
    readonly submitFork: (content: string) => TE.TaskEither<ApiError, void>;
    readonly cancelFork: () => void;
  };

  // Selectors (memoized)
  readonly selectors: {
    readonly currentTurns: () => readonly TurnResponse[];
    readonly consensusPercentage: () => O.Option<number>;
    readonly totalCost: () => number;
    readonly canFork: () => boolean;
  };
}

export const useDebateStore = create<DebateStore>()(
  immer((set, get) => ({
    debate: { _tag: 'Idle' },
    branching: {
      activeBranchId: O.none,
      branches: new Map(),
      forkDraft: O.none,
    },
    config: {
      question: '',
      participants: [],
      rounds: 4,
      consensusThreshold: 0.8,
      forkMode: 'save',
    },

    actions: {
      updateConfig: (partial) => set((state) => {
        Object.assign(state.config, partial);
      }),

      startDebate: () => pipe(
        get().conversationClient.createDebate(get().config),
        TE.tap((result) => TE.fromIO(() => {
          set((state) => {
            state.debate = { _tag: 'Running', debateId: result.debateId, currentRound: 1, turns: [] };
          });
        }))
      ),

      // ... other actions
    },

    selectors: {
      currentTurns: () => {
        const { debate, branching } = get();
        if (debate._tag !== 'Running') return [];
        return pipe(
          branching.activeBranchId,
          O.fold(
            () => debate.turns,
            (branchId) => debate.turns.filter(t => t.branchId === branchId)
          )
        );
      },
      // ... other selectors
    },
  }))
);
```

**TDD Requirement:** Test all state transitions, ensure immutability.

**Deliverables:**
- [ ] Zustand store with immer middleware
- [ ] All actions return TaskEither for async ops
- [ ] Memoized selectors
- [ ] State machine transitions tested
- [ ] No mutations (enforced by immer)

---

### Wave 4: Core UI Components [Parallel - 5 Agents]
**Duration:** 3 hours | **Agents:** 5 (separate component files)

#### Agent 4A: ConversationTimeline (`@debateui/app/src/components/`)
**File ownership:** `ConversationTimeline.tsx`, `ConversationTimeline.test.tsx`

#### Agent 4B: ModelCard (`@debateui/app/src/components/`)
**File ownership:** `ModelCard.tsx`, `ModelCard.test.tsx`

#### Agent 4C: ConsensusMeter (`@debateui/app/src/components/`)
**File ownership:** `ConsensusMeter.tsx`, `ConsensusMeter.test.tsx`

#### Agent 4D: CostTracker (`@debateui/app/src/components/`)
**File ownership:** `CostTracker.tsx`, `CostTracker.test.tsx`

#### Agent 4E: ConfigPanel (`@debateui/app/src/components/`)
**File ownership:** `ConfigPanel.tsx`, `ConfigPanel.test.tsx`

**Component Pattern (all agents follow):**
```typescript
// Example: ConsensusMeter.tsx
import { FC, memo } from 'react';
import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { useDebateStore } from '@debateui/state';

interface ConsensusMeterProps {
  readonly threshold: number;
  readonly className?: string;
}

export const ConsensusMeter: FC<ConsensusMeterProps> = memo(({ threshold, className }) => {
  const consensus = useDebateStore((s) => s.selectors.consensusPercentage());

  return pipe(
    consensus,
    O.fold(
      () => <ConsensusMeterSkeleton className={className} />,
      (percentage) => (
        <div className={cn('relative h-4 bg-gray-200 rounded-full', className)}>
          <div
            className={cn(
              'absolute h-full rounded-full transition-all duration-300',
              percentage >= threshold ? 'bg-green-500' : 'bg-yellow-500'
            )}
            style={{ width: `${percentage * 100}%` }}
          />
          <div
            className="absolute top-0 h-full w-0.5 bg-gray-600"
            style={{ left: `${threshold * 100}%` }}
          />
        </div>
      )
    )
  );
});

ConsensusMeter.displayName = 'ConsensusMeter';
```

**TDD Requirement:** RTL tests for all states, accessibility tests.

**Deliverables:**
- [ ] 5 core components with tests
- [ ] Tailwind CSS styling
- [ ] Accessible (ARIA labels, keyboard nav)
- [ ] Memoized with `memo()`
- [ ] fp-ts Option handling for loading states

---

### Wave 5: Fork System [Sequential - Critical Path]
**Duration:** 3 hours | **Agents:** 2 (coordinated)

#### Agent 5A: ForkEditor Component
**File ownership:** `ForkEditor.tsx`, `ForkEditor.test.tsx`

#### Agent 5B: BranchSelector + BranchTree
**File ownership:** `BranchSelector.tsx`, `BranchTree.tsx`, `*.test.tsx`

```typescript
// ForkEditor.tsx - Draft-then-execute pattern with HyperWeave lease
export const ForkEditor: FC = () => {
  const { startFork, submitFork, cancelFork } = useDebateStore((s) => s.actions);
  const forkDraft = useDebateStore((s) => s.branching.forkDraft);
  const hyperweave = useHyperWeaveClient();

  const handleSubmit = useCallback(async (content: string) => {
    // 1. Acquire HyperWeave lease for atomic fork
    const leaseResult = await pipe(
      hyperweave.acquireForkLease(forkDraft.turnId),
      TE.chain((lease) =>
        // 2. Create fork with lease (atomic)
        pipe(
          submitFork(content),
          TE.tap(() => hyperweave.releaseLease(lease))
        )
      )
    )();

    // Handle result
    pipe(
      leaseResult,
      E.fold(
        (error) => toast.error(`Fork failed: ${error.message}`),
        () => toast.success('Fork created')
      )
    );
  }, [forkDraft, submitFork, hyperweave]);

  return pipe(
    forkDraft,
    O.fold(
      () => null,
      (draft) => (
        <Dialog open onClose={cancelFork}>
          <ForkEditorForm
            parentTurn={draft.parentTurn}
            onSubmit={handleSubmit}
            onCancel={cancelFork}
          />
        </Dialog>
      )
    )
  );
};
```

**HyperWeave Integration Points:**
1. **Lease acquisition** before fork (prevents concurrent forks at same turn)
2. **Atomic fork creation** with lease validation
3. **Lease release** after fork (success or failure)
4. **Conflict detection** (409 response if lease expired)

**Deliverables:**
- [ ] ForkEditor with draft-then-execute UX
- [ ] BranchSelector with tree visualization
- [ ] HyperWeave lease integration
- [ ] Conflict handling (stale fork detection)
- [ ] Tests for all fork scenarios

---

### Wave 6: Real-Time Integration [Sequential - Integration]
**Duration:** 2 hours | **Agents:** 1 (integration)

#### Agent 6A: WebSocket Integration + Live Updates
**File ownership:** `useDebateStream.ts`, `LiveDebateView.tsx`

```typescript
// hooks/useDebateStream.ts
export const useDebateStream = (debateId: string) => {
  const wsClient = useWebSocketClient();
  const { handleEvent } = useDebateStore((s) => s.actions);

  useEffect(() => {
    const subscription = wsClient.events$.subscribe({
      next: (event) => {
        // Dispatch to store (pure state update)
        handleEvent(event);
      },
      error: (err) => {
        console.error('WebSocket error:', err);
      },
    });

    pipe(
      wsClient.connect(debateId),
      E.fold(
        (error) => console.error('Connection failed:', error),
        () => console.log('Connected to debate stream')
      )
    );

    return () => {
      subscription.unsubscribe();
      wsClient.disconnect();
    };
  }, [debateId, wsClient, handleEvent]);

  return {
    connectionState: useObservable(wsClient.connectionState$),
  };
};
```

**Deliverables:**
- [ ] WebSocket connection management
- [ ] Event → Store dispatch
- [ ] Reconnection logic
- [ ] Connection state UI indicators
- [ ] Integration tests with mock WS

---

### Wave 7: Polish & Accessibility [Parallel - 3 Agents]
**Duration:** 2 hours | **Agents:** 3 (separate concerns)

#### Agent 7A: Accessibility Audit
**File ownership:** `a11y.test.tsx` (global), `AccessibilityProvider.tsx`

#### Agent 7B: Error Boundaries + Loading States
**File ownership:** `ErrorBoundary.tsx`, `LoadingStates.tsx`

#### Agent 7C: Responsive Design
**File ownership:** `responsive.css`, update all component styles

**Deliverables:**
- [ ] WCAG 2.1 AA compliance
- [ ] Error boundaries with recovery
- [ ] Skeleton loaders
- [ ] Mobile responsive (<768px)
- [ ] Keyboard navigation

---

## Validation Gates (BLOCKING)

### Pre-Commit (Every Wave)
```bash
# Must pass before marking wave complete
pnpm run typecheck        # tsc --noEmit
pnpm run lint            # eslint --max-warnings 0
pnpm run test            # vitest run --coverage
pnpm run test:a11y       # axe-core accessibility
```

### Coverage Requirements
| Metric | Target |
|--------|--------|
| Line coverage | 80%+ |
| Branch coverage | 75%+ |
| Function coverage | 90%+ |
| Type coverage | 100% |

---

## Parallel Agent Execution Map

```
Wave 0 ──────────────────────────────────────────────────────────────►
        [Setup Agent]

Wave 1 ──────────────────────────────────────────────────────────────►
        [1A: Types]  [1B: API Types]  [1C: State Types]
        (parallel - separate files)

Wave 2 ──────────────────────────────────────────────────────────────►
        [2A: Conv API]  [2B: HW Client]  [2C: WS Client]
        (parallel - separate modules)

Wave 3 ──────────────────────────────────────────────────────────────►
        [3A: Store]
        (sequential - single file with many dependencies)

Wave 4 ──────────────────────────────────────────────────────────────►
        [4A: Timeline]  [4B: ModelCard]  [4C: Consensus]  [4D: Cost]  [4E: Config]
        (parallel - separate component files)

Wave 5 ──────────────────────────────────────────────────────────────►
        [5A: ForkEditor] → [5B: BranchSelector]
        (coordinated - 5A depends on store, 5B depends on 5A types)

Wave 6 ──────────────────────────────────────────────────────────────►
        [6A: Integration]
        (sequential - integrates all previous)

Wave 7 ──────────────────────────────────────────────────────────────►
        [7A: A11y]  [7B: Errors]  [7C: Responsive]
        (parallel - orthogonal concerns)
```

---

## Success Criteria

### Functional
- [ ] Create and run 5-participant debates
- [ ] Real-time consensus visualization
- [ ] Fork debates at any turn (HyperWeave coordinated)
- [ ] Branch navigation and comparison
- [ ] Export transcripts (JSON, Markdown)

### Technical
- [ ] TypeScript strict mode (no errors)
- [ ] 80%+ test coverage
- [ ] <2s initial page load
- [ ] <500ms event latency
- [ ] WCAG 2.1 AA compliant

### Integration
- [ ] CCR Conversation API connected
- [ ] HyperWeave fork coordination working
- [ ] WebSocket real-time updates
- [ ] Qdrant search integration (history)

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| HyperWeave latency | Cache branch tree, optimistic UI updates |
| WebSocket disconnects | Auto-reconnect with exponential backoff |
| Large debate transcripts | Virtual scrolling, lazy loading |
| Race conditions on fork | HyperWeave lease ensures atomicity |
| Type drift with backend | Shared Zod schemas, CI validation |

---

## Timeline Estimate

| Wave | Duration | Cumulative |
|------|----------|------------|
| Wave 0 | 30 min | 30 min |
| Wave 1 | 1 hour | 1.5 hours |
| Wave 2 | 2 hours | 3.5 hours |
| Wave 3 | 2 hours | 5.5 hours |
| Wave 4 | 3 hours | 8.5 hours |
| Wave 5 | 3 hours | 11.5 hours |
| Wave 6 | 2 hours | 13.5 hours |
| Wave 7 | 2 hours | **15.5 hours** |

**Total: ~16 hours** (2 full days with parallel execution)

---

## Next Steps

1. **Approve this plan** - Review with stakeholder
2. **Execute Wave 0** - Project scaffolding
3. **Launch Wave 1** - 3 parallel agents for types
4. **Iterate** - Complete waves sequentially

---

**Author:** Claude (Opus 4.5)
**Created:** 2025-12-01
**Status:** Pending Approval
