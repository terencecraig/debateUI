import { z } from 'zod';
import * as E from 'fp-ts/Either';

/**
 * Branded type for Debate identifiers
 * Provides compile-time type safety to prevent mixing different ID types
 */
export type DebateId = string & { readonly _brand: unique symbol };

/**
 * Branded type for Branch identifiers
 * Used when debates fork into parallel exploration paths
 */
export type BranchId = string & { readonly _brand: unique symbol };

/**
 * Branded type for Turn identifiers
 * Represents individual speaking turns within a debate
 */
export type TurnId = string & { readonly _brand: unique symbol };

/**
 * Fork mode determines how debate branches are handled
 * - 'save': Branches are persisted for later review
 * - 'explore': Branches are temporary exploration only
 */
export type ForkMode = 'save' | 'explore';

/**
 * Zod schema for DebateConfig validation
 * Enforces business rules:
 * - Questions must be meaningful (10-500 chars)
 * - Debates require 2-7 participants
 * - Rounds are limited to 1-10
 * - Consensus threshold between 50-100%
 */
export const DebateConfigSchema = z.object({
  question: z.string().min(10, 'Question must be at least 10 characters').max(500, 'Question must not exceed 500 characters'),
  participants: z.array(z.string()).min(2, 'At least 2 participants required').max(7, 'Maximum 7 participants allowed'),
  rounds: z.number().int('Rounds must be an integer').min(1, 'At least 1 round required').max(10, 'Maximum 10 rounds allowed').default(4),
  consensusThreshold: z.number().min(0.5, 'Consensus threshold must be at least 0.5').max(1.0, 'Consensus threshold must not exceed 1.0').default(0.8),
  forkMode: z.enum(['save', 'explore']).default('save'),
});

/**
 * TypeScript type inferred from the Zod schema
 * Ensures compile-time and runtime type consistency
 */
export type DebateConfig = z.infer<typeof DebateConfigSchema>;

/**
 * FP-first parser for DebateConfig
 * Returns Either<ZodError, DebateConfig> for composable error handling
 *
 * @param input - Unknown input to validate
 * @returns Right(DebateConfig) on success, Left(ZodError) on validation failure
 *
 * @example
 * ```typescript
 * const result = parseDebateConfig({ question: "What is truth?", participants: ["alice", "bob"] });
 * pipe(
 *   result,
 *   E.fold(
 *     (error) => console.error("Validation failed:", error),
 *     (config) => console.log("Valid config:", config)
 *   )
 * );
 * ```
 */
export const parseDebateConfig = (input: unknown): E.Either<z.ZodError, DebateConfig> => {
  const result = DebateConfigSchema.safeParse(input);

  if (result.success) {
    return E.right(result.data);
  } else {
    return E.left(result.error);
  }
};

/**
 * Turn represents a single speaking turn in a debate
 */
export interface Turn {
  id: TurnId;
  participantId: string;
  content: string;
  timestamp: Date;
  round: number;
}

/**
 * Branch represents a fork in the debate exploration tree
 */
export interface Branch {
  id: BranchId;
  parentBranchId?: BranchId;
  turns: Turn[];
  createdAt: Date;
}

/**
 * DebateTranscript represents the complete history of a debate
 */
export interface DebateTranscript {
  id: DebateId;
  config: DebateConfig;
  mainBranch: Branch;
  explorationBranches: Branch[];
  createdAt: Date;
  updatedAt: Date;
}
