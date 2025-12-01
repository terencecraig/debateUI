import { z } from 'zod';

/**
 * ParticipantType distinguishes between AI models and human participants
 */
export type ParticipantType = 'model' | 'human';

/**
 * ModelProvider identifies the organization providing the AI model
 */
export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'meta' | 'deepseek';

/**
 * Zod schema for ParticipantType validation
 */
export const ParticipantTypeSchema = z.enum(['model', 'human']);

/**
 * Zod schema for ModelProvider validation
 * Covers major LLM providers as of 2025
 */
export const ModelProviderSchema = z.enum(['anthropic', 'openai', 'google', 'meta', 'deepseek']);

/**
 * Zod schema for Participant validation
 *
 * Business rules:
 * - All participants must have unique IDs
 * - Names must be non-empty strings
 * - Capability scores range from 0 (weakest) to 2 (strongest), default 1.0
 * - Provider is optional (not required for human participants)
 */
export const ParticipantSchema = z.object({
  id: z.string().min(1, 'Participant ID must not be empty'),
  type: ParticipantTypeSchema,
  name: z.string().min(1, 'Participant name must not be empty'),
  provider: ModelProviderSchema.optional(),
  capabilityScore: z.number().min(0, 'Capability score must be at least 0').max(2, 'Capability score must not exceed 2').default(1.0),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type Participant = z.infer<typeof ParticipantSchema>;

/**
 * Helper function to create a model participant
 *
 * @example
 * ```typescript
 * const claude = createModelParticipant({
 *   id: 'claude-1',
 *   name: 'Claude 3.5 Sonnet',
 *   provider: 'anthropic',
 *   capabilityScore: 1.8
 * });
 * ```
 */
export const createModelParticipant = (params: {
  id: string;
  name: string;
  provider: ModelProvider;
  capabilityScore?: number;
}): Participant => {
  return ParticipantSchema.parse({
    ...params,
    type: 'model' as const,
  });
};

/**
 * Helper function to create a human participant
 *
 * @example
 * ```typescript
 * const alice = createHumanParticipant({
 *   id: 'human-1',
 *   name: 'Alice',
 *   capabilityScore: 1.2
 * });
 * ```
 */
export const createHumanParticipant = (params: {
  id: string;
  name: string;
  capabilityScore?: number;
}): Participant => {
  return ParticipantSchema.parse({
    ...params,
    type: 'human' as const,
  });
};

/**
 * Type guard to check if a participant is a model
 */
export const isModelParticipant = (participant: Participant): participant is Participant & { type: 'model' } => {
  return participant.type === 'model';
};

/**
 * Type guard to check if a participant is a human
 */
export const isHumanParticipant = (participant: Participant): participant is Participant & { type: 'human' } => {
  return participant.type === 'human';
};
