import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import {
  DebateConfigSchema,
  parseDebateConfig,
  type DebateId,
  type BranchId,
  type TurnId,
} from './debate';

describe('debate types', () => {
  describe('DebateConfigSchema', () => {
    describe('valid inputs', () => {
      it('should parse minimal valid config', () => {
        const input = {
          question: 'Should we use TypeScript?',
          participants: ['claude', 'gpt4'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.rounds).toBe(4); // default
          expect(result.data.consensusThreshold).toBe(0.8); // default
          expect(result.data.forkMode).toBe('save'); // default
        }
      });

      it('should parse full valid config', () => {
        const input = {
          question: 'What is the best database?',
          participants: ['claude', 'gpt4', 'gemini'],
          rounds: 6,
          consensusThreshold: 0.75,
          forkMode: 'explore' as const,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should accept question at minimum length', () => {
        const input = {
          question: '1234567890', // exactly 10 chars
          participants: ['a', 'b'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept question at maximum length', () => {
        const input = {
          question: 'a'.repeat(500), // exactly 500 chars
          participants: ['a', 'b'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept minimum participants (2)', () => {
        const input = {
          question: 'What is truth?',
          participants: ['alice', 'bob'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept maximum participants (7)', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept minimum rounds (1)', () => {
        const input = {
          question: 'Quick question?',
          participants: ['a', 'b'],
          rounds: 1,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept maximum rounds (10)', () => {
        const input = {
          question: 'Long debate question?',
          participants: ['a', 'b'],
          rounds: 10,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept consensus threshold at minimum (0.5)', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          consensusThreshold: 0.5,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept consensus threshold at maximum (1.0)', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          consensusThreshold: 1.0,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept save fork mode', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          forkMode: 'save' as const,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept explore fork mode', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          forkMode: 'explore' as const,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('should reject empty question', () => {
        const input = {
          question: '',
          participants: ['a', 'b'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject question shorter than 10 chars', () => {
        const input = {
          question: 'short',
          participants: ['a', 'b'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject question longer than 500 chars', () => {
        const input = {
          question: 'a'.repeat(501),
          participants: ['a', 'b'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject fewer than 2 participants', () => {
        const input = {
          question: 'What is truth?',
          participants: ['alice'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject more than 7 participants', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty participants array', () => {
        const input = {
          question: 'What is truth?',
          participants: [],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject zero rounds', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          rounds: 0,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject more than 10 rounds', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          rounds: 11,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject negative rounds', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          rounds: -1,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject fractional rounds', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          rounds: 3.5,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject consensus threshold below 0.5', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          consensusThreshold: 0.49,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject consensus threshold above 1.0', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          consensusThreshold: 1.01,
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid fork mode', () => {
        const input = {
          question: 'What is truth?',
          participants: ['a', 'b'],
          forkMode: 'invalid',
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing question', () => {
        const input = {
          participants: ['a', 'b'],
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing participants', () => {
        const input = {
          question: 'What is truth?',
        };
        const result = DebateConfigSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('parseDebateConfig', () => {
    it('should return Right for valid input', () => {
      const input = {
        question: 'What is truth?',
        participants: ['alice', 'bob'],
      };
      const result = parseDebateConfig(input);
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.question).toBe('What is truth?');
        expect(result.right.participants).toEqual(['alice', 'bob']);
        expect(result.right.rounds).toBe(4);
      }
    });

    it('should return Left for invalid input', () => {
      const input = {
        question: 'short',
        participants: ['a', 'b'],
      };
      const result = parseDebateConfig(input);
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.issues.length).toBeGreaterThan(0);
      }
    });

    it('should return Left for empty object', () => {
      const input = {};
      const result = parseDebateConfig(input);
      expect(E.isLeft(result)).toBe(true);
    });

    it('should return Left for null', () => {
      const input = null;
      const result = parseDebateConfig(input);
      expect(E.isLeft(result)).toBe(true);
    });

    it('should return Left for undefined', () => {
      const input = undefined;
      const result = parseDebateConfig(input);
      expect(E.isLeft(result)).toBe(true);
    });

    it('should preserve all valid fields', () => {
      const input = {
        question: 'What is the best approach?',
        participants: ['claude', 'gpt4', 'gemini'],
        rounds: 5,
        consensusThreshold: 0.7,
        forkMode: 'explore' as const,
      };
      const result = parseDebateConfig(input);
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(input);
      }
    });
  });

  describe('branded types', () => {
    it('should allow DebateId assignment from string', () => {
      const id: DebateId = 'debate-123' as DebateId;
      expect(typeof id).toBe('string');
    });

    it('should allow BranchId assignment from string', () => {
      const id: BranchId = 'branch-456' as BranchId;
      expect(typeof id).toBe('string');
    });

    it('should allow TurnId assignment from string', () => {
      const id: TurnId = 'turn-789' as TurnId;
      expect(typeof id).toBe('string');
    });

    // Type-level test: these should not compile if uncommented
    // const debateId: DebateId = 'debate-123' as DebateId;
    // const branchId: BranchId = debateId; // Should error: different brands
  });
});
