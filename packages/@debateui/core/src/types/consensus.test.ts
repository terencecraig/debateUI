import { describe, it, expect } from 'vitest';
import {
  ConsensusLevelSchema,
  ConsensusResultSchema,
  type ConsensusLevel,
} from './consensus';

describe('consensus types', () => {
  describe('ConsensusLevelSchema', () => {
    it('should accept "strong" level', () => {
      const result = ConsensusLevelSchema.safeParse('strong');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('strong');
      }
    });

    it('should accept "moderate" level', () => {
      const result = ConsensusLevelSchema.safeParse('moderate');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('moderate');
      }
    });

    it('should accept "weak" level', () => {
      const result = ConsensusLevelSchema.safeParse('weak');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('weak');
      }
    });

    it('should accept "none" level', () => {
      const result = ConsensusLevelSchema.safeParse('none');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('none');
      }
    });

    it('should reject invalid level', () => {
      const result = ConsensusLevelSchema.safeParse('medium');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = ConsensusLevelSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = ConsensusLevelSchema.safeParse(42);
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = ConsensusLevelSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });

  describe('ConsensusResultSchema', () => {
    describe('valid inputs', () => {
      it('should parse strong consensus', () => {
        const input = {
          level: 'strong',
          percentage: 0.95,
          supporting: 5,
          dissenting: 0,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should parse moderate consensus', () => {
        const input = {
          level: 'moderate',
          percentage: 0.7,
          supporting: 4,
          dissenting: 1,
          confidence: 0.75,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should parse weak consensus', () => {
        const input = {
          level: 'weak',
          percentage: 0.55,
          supporting: 3,
          dissenting: 2,
          confidence: 0.6,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should parse no consensus', () => {
        const input = {
          level: 'none',
          percentage: 0.5,
          supporting: 2,
          dissenting: 2,
          confidence: 0.8,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept percentage at minimum (0)', () => {
        const input = {
          level: 'none',
          percentage: 0,
          supporting: 0,
          dissenting: 5,
          confidence: 0.5,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept percentage at maximum (1)', () => {
        const input = {
          level: 'strong',
          percentage: 1,
          supporting: 5,
          dissenting: 0,
          confidence: 1.0,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept confidence at minimum (0)', () => {
        const input = {
          level: 'none',
          percentage: 0.5,
          supporting: 2,
          dissenting: 2,
          confidence: 0,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept confidence at maximum (1)', () => {
        const input = {
          level: 'strong',
          percentage: 0.9,
          supporting: 5,
          dissenting: 0,
          confidence: 1,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept zero supporting participants', () => {
        const input = {
          level: 'none',
          percentage: 0,
          supporting: 0,
          dissenting: 5,
          confidence: 0.8,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept zero dissenting participants', () => {
        const input = {
          level: 'strong',
          percentage: 1.0,
          supporting: 5,
          dissenting: 0,
          confidence: 0.95,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept large numbers of participants', () => {
        const input = {
          level: 'moderate',
          percentage: 0.65,
          supporting: 650,
          dissenting: 350,
          confidence: 0.7,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept all consensus levels', () => {
        const levels: ConsensusLevel[] = ['strong', 'moderate', 'weak', 'none'];

        levels.forEach((level) => {
          const input = {
            level,
            percentage: 0.7,
            supporting: 3,
            dissenting: 1,
            confidence: 0.8,
          };
          const result = ConsensusResultSchema.safeParse(input);
          expect(result.success).toBe(true);
        });
      });
    });

    describe('invalid inputs', () => {
      it('should reject missing level', () => {
        const input = {
          percentage: 0.8,
          supporting: 4,
          dissenting: 1,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing percentage', () => {
        const input = {
          level: 'strong',
          supporting: 4,
          dissenting: 1,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing supporting', () => {
        const input = {
          level: 'strong',
          percentage: 0.8,
          dissenting: 1,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing dissenting', () => {
        const input = {
          level: 'strong',
          percentage: 0.8,
          supporting: 4,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing confidence', () => {
        const input = {
          level: 'strong',
          percentage: 0.8,
          supporting: 4,
          dissenting: 1,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid level', () => {
        const input = {
          level: 'very-strong',
          percentage: 0.8,
          supporting: 4,
          dissenting: 1,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject percentage below 0', () => {
        const input = {
          level: 'none',
          percentage: -0.1,
          supporting: 2,
          dissenting: 3,
          confidence: 0.8,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject percentage above 1', () => {
        const input = {
          level: 'strong',
          percentage: 1.1,
          supporting: 5,
          dissenting: 0,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject negative supporting count', () => {
        const input = {
          level: 'weak',
          percentage: 0.6,
          supporting: -1,
          dissenting: 2,
          confidence: 0.7,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject negative dissenting count', () => {
        const input = {
          level: 'weak',
          percentage: 0.6,
          supporting: 3,
          dissenting: -1,
          confidence: 0.7,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject fractional supporting count', () => {
        const input = {
          level: 'weak',
          percentage: 0.6,
          supporting: 3.5,
          dissenting: 2,
          confidence: 0.7,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject fractional dissenting count', () => {
        const input = {
          level: 'weak',
          percentage: 0.6,
          supporting: 3,
          dissenting: 2.5,
          confidence: 0.7,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject confidence below 0', () => {
        const input = {
          level: 'weak',
          percentage: 0.6,
          supporting: 3,
          dissenting: 2,
          confidence: -0.1,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject confidence above 1', () => {
        const input = {
          level: 'strong',
          percentage: 0.9,
          supporting: 5,
          dissenting: 0,
          confidence: 1.1,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject string for percentage', () => {
        const input = {
          level: 'weak',
          percentage: '0.6',
          supporting: 3,
          dissenting: 2,
          confidence: 0.7,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject string for counts', () => {
        const input = {
          level: 'weak',
          percentage: 0.6,
          supporting: '3',
          dissenting: 2,
          confidence: 0.7,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject null values', () => {
        const input = {
          level: null,
          percentage: 0.8,
          supporting: 4,
          dissenting: 1,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject undefined for required fields', () => {
        const input = {
          level: 'strong',
          percentage: undefined,
          supporting: 4,
          dissenting: 1,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle unanimous agreement', () => {
        const input = {
          level: 'strong',
          percentage: 1.0,
          supporting: 7,
          dissenting: 0,
          confidence: 1.0,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle complete disagreement', () => {
        const input = {
          level: 'none',
          percentage: 0,
          supporting: 0,
          dissenting: 7,
          confidence: 1.0,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle exact split', () => {
        const input = {
          level: 'none',
          percentage: 0.5,
          supporting: 3,
          dissenting: 3,
          confidence: 0.9,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle minimal participation', () => {
        const input = {
          level: 'none',
          percentage: 0,
          supporting: 0,
          dissenting: 1,
          confidence: 0.5,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle very precise percentages', () => {
        const input = {
          level: 'moderate',
          percentage: 0.6666666666666666,
          supporting: 4,
          dissenting: 2,
          confidence: 0.777777777777,
        };
        const result = ConsensusResultSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });
});
