import { z } from 'zod';
import * as E from 'fp-ts/Either';

/**
 * Schema for a single turn response from the API.
 */
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
  createdAt: z.string().datetime(),
});

/**
 * TypeScript type inferred from TurnResponseSchema.
 */
export type TurnResponse = z.infer<typeof TurnResponseSchema>;

/**
 * Schema for debate status enum.
 */
export const DebateStatusSchema = z.enum(['pending', 'running', 'paused', 'completed', 'error']);

/**
 * TypeScript type for debate status.
 */
export type DebateStatus = z.infer<typeof DebateStatusSchema>;

/**
 * Schema for a debate response from the API.
 */
export const DebateResponseSchema = z.object({
  debateId: z.string().uuid(),
  status: DebateStatusSchema,
  question: z.string(),
  currentRound: z.number().int().nonnegative(),
  totalRounds: z.number().int().positive(),
  turns: z.array(TurnResponseSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * TypeScript type inferred from DebateResponseSchema.
 */
export type DebateResponse = z.infer<typeof DebateResponseSchema>;

/**
 * Schema for branch information.
 */
export const BranchInfoSchema = z.object({
  branchId: z.string().uuid(),
  parentBranchId: z.string().uuid().nullable(),
  forkTurnId: z.string().uuid().nullable(),
  name: z.string(),
  forkMode: z.enum(['save', 'explore']),
  depth: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

/**
 * TypeScript type inferred from BranchInfoSchema.
 */
export type BranchInfo = z.infer<typeof BranchInfoSchema>;

/**
 * Parse an unknown value into a TurnResponse using fp-ts Either.
 * Returns Right(TurnResponse) on success, Left(ZodError) on failure.
 */
export const parseTurnResponse = (input: unknown): E.Either<z.ZodError, TurnResponse> => {
  const result = TurnResponseSchema.safeParse(input);
  if (result.success) {
    return E.right(result.data);
  }
  return E.left(result.error);
};

/**
 * Parse an unknown value into a DebateResponse using fp-ts Either.
 * Returns Right(DebateResponse) on success, Left(ZodError) on failure.
 */
export const parseDebateResponse = (input: unknown): E.Either<z.ZodError, DebateResponse> => {
  const result = DebateResponseSchema.safeParse(input);
  if (result.success) {
    return E.right(result.data);
  }
  return E.left(result.error);
};

/**
 * Parse an unknown value into a BranchInfo using fp-ts Either.
 * Returns Right(BranchInfo) on success, Left(ZodError) on failure.
 */
export const parseBranchInfo = (input: unknown): E.Either<z.ZodError, BranchInfo> => {
  const result = BranchInfoSchema.safeParse(input);
  if (result.success) {
    return E.right(result.data);
  }
  return E.left(result.error);
};
