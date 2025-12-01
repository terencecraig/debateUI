import { z } from 'zod';

/**
 * ConsensusLevel categorizes the strength of agreement
 * - 'strong': High agreement (typically 80%+)
 * - 'moderate': Moderate agreement (typically 65-79%)
 * - 'weak': Weak agreement (typically 51-64%)
 * - 'none': No consensus (50% or less)
 */
export type ConsensusLevel = 'strong' | 'moderate' | 'weak' | 'none';

/**
 * Zod schema for ConsensusLevel validation
 */
export const ConsensusLevelSchema = z.enum(['strong', 'moderate', 'weak', 'none']);

/**
 * Zod schema for ConsensusResult validation
 *
 * Business rules:
 * - Percentage represents agreement ratio (0.0-1.0)
 * - Supporting and dissenting must be non-negative integers
 * - Confidence represents measurement certainty (0.0-1.0)
 */
export const ConsensusResultSchema = z.object({
  level: ConsensusLevelSchema,
  percentage: z.number().min(0, 'Percentage must be at least 0').max(1, 'Percentage must not exceed 1'),
  supporting: z.number().int('Supporting count must be an integer').nonnegative('Supporting count must be non-negative'),
  dissenting: z.number().int('Dissenting count must be an integer').nonnegative('Dissenting count must be non-negative'),
  confidence: z.number().min(0, 'Confidence must be at least 0').max(1, 'Confidence must not exceed 1'),
});

/**
 * TypeScript type inferred from the Zod schema
 */
export type ConsensusResult = z.infer<typeof ConsensusResultSchema>;

/**
 * Calculate consensus level from percentage
 * Uses standard thresholds for categorization
 *
 * @param percentage - Agreement percentage (0.0-1.0)
 * @returns Appropriate ConsensusLevel
 *
 * @example
 * ```typescript
 * calculateConsensusLevel(0.85); // 'strong'
 * calculateConsensusLevel(0.70); // 'moderate'
 * calculateConsensusLevel(0.55); // 'weak'
 * calculateConsensusLevel(0.50); // 'none'
 * ```
 */
export const calculateConsensusLevel = (percentage: number): ConsensusLevel => {
  if (percentage >= 0.8) {
    return 'strong';
  } else if (percentage >= 0.65) {
    return 'moderate';
  } else if (percentage > 0.5) {
    return 'weak';
  } else {
    return 'none';
  }
};

/**
 * Create a ConsensusResult from counts
 * Automatically calculates percentage and determines level
 *
 * @param supporting - Number of participants in agreement
 * @param dissenting - Number of participants in disagreement
 * @param confidence - Confidence in the measurement (0.0-1.0)
 * @returns Validated ConsensusResult
 *
 * @example
 * ```typescript
 * const result = createConsensusResult(4, 1, 0.9);
 * // { level: 'strong', percentage: 0.8, supporting: 4, dissenting: 1, confidence: 0.9 }
 * ```
 */
export const createConsensusResult = (
  supporting: number,
  dissenting: number,
  confidence: number
): ConsensusResult => {
  const total = supporting + dissenting;
  const percentage = total === 0 ? 0 : supporting / total;
  const level = calculateConsensusLevel(percentage);

  return ConsensusResultSchema.parse({
    level,
    percentage,
    supporting,
    dissenting,
    confidence,
  });
};

/**
 * Check if consensus meets a threshold
 *
 * @param result - ConsensusResult to check
 * @param threshold - Minimum percentage required (0.0-1.0)
 * @returns true if consensus percentage meets or exceeds threshold
 *
 * @example
 * ```typescript
 * const result = createConsensusResult(4, 1, 0.9);
 * meetsThreshold(result, 0.75); // true (0.8 >= 0.75)
 * meetsThreshold(result, 0.85); // false (0.8 < 0.85)
 * ```
 */
export const meetsThreshold = (result: ConsensusResult, threshold: number): boolean => {
  return result.percentage >= threshold;
};

/**
 * Check if consensus result indicates strong agreement
 */
export const isStrongConsensus = (result: ConsensusResult): boolean => {
  return result.level === 'strong';
};

/**
 * Check if consensus result indicates any level of agreement
 */
export const hasConsensus = (result: ConsensusResult): boolean => {
  return result.level !== 'none';
};
