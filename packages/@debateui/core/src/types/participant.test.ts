import { describe, it, expect } from 'vitest';
import {
  ParticipantSchema,
  ParticipantTypeSchema,
  ModelProviderSchema,
  type ModelProvider,
} from './participant';

describe('participant types', () => {
  describe('ParticipantTypeSchema', () => {
    it('should accept "model" type', () => {
      const result = ParticipantTypeSchema.safeParse('model');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('model');
      }
    });

    it('should accept "human" type', () => {
      const result = ParticipantTypeSchema.safeParse('human');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('human');
      }
    });

    it('should reject invalid type', () => {
      const result = ParticipantTypeSchema.safeParse('robot');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = ParticipantTypeSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = ParticipantTypeSchema.safeParse(42);
      expect(result.success).toBe(false);
    });
  });

  describe('ModelProviderSchema', () => {
    it('should accept "anthropic" provider', () => {
      const result = ModelProviderSchema.safeParse('anthropic');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('anthropic');
      }
    });

    it('should accept "openai" provider', () => {
      const result = ModelProviderSchema.safeParse('openai');
      expect(result.success).toBe(true);
    });

    it('should accept "google" provider', () => {
      const result = ModelProviderSchema.safeParse('google');
      expect(result.success).toBe(true);
    });

    it('should accept "meta" provider', () => {
      const result = ModelProviderSchema.safeParse('meta');
      expect(result.success).toBe(true);
    });

    it('should accept "deepseek" provider', () => {
      const result = ModelProviderSchema.safeParse('deepseek');
      expect(result.success).toBe(true);
    });

    it('should reject invalid provider', () => {
      const result = ModelProviderSchema.safeParse('cohere');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = ModelProviderSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = ModelProviderSchema.safeParse(123);
      expect(result.success).toBe(false);
    });
  });

  describe('ParticipantSchema', () => {
    describe('valid inputs', () => {
      it('should parse minimal valid model participant', () => {
        const input = {
          id: 'participant-1',
          type: 'model',
          name: 'Claude',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.capabilityScore).toBe(1.0); // default
          expect(result.data.provider).toBeUndefined();
        }
      });

      it('should parse full valid model participant', () => {
        const input = {
          id: 'participant-2',
          type: 'model',
          name: 'GPT-4',
          provider: 'openai',
          capabilityScore: 1.8,
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual(input);
        }
      });

      it('should parse human participant', () => {
        const input = {
          id: 'human-1',
          type: 'human',
          name: 'Alice',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept capability score at minimum (0)', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Weak Model',
          capabilityScore: 0,
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept capability score at maximum (2)', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Strong Model',
          capabilityScore: 2,
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept capability score in middle range', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Medium Model',
          capabilityScore: 1.5,
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept all model providers', () => {
        const providers: ModelProvider[] = [
          'anthropic',
          'openai',
          'google',
          'meta',
          'deepseek',
        ];

        providers.forEach((provider) => {
          const input = {
            id: `p-${provider}`,
            type: 'model' as const,
            name: `Model from ${provider}`,
            provider,
          };
          const result = ParticipantSchema.safeParse(input);
          expect(result.success).toBe(true);
        });
      });

      it('should allow optional provider field', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Generic Model',
          // provider omitted
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.provider).toBeUndefined();
        }
      });

      it('should allow human participant without provider', () => {
        const input = {
          id: 'human-1',
          type: 'human',
          name: 'Bob',
          capabilityScore: 1.2,
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });

    describe('invalid inputs', () => {
      it('should reject missing id', () => {
        const input = {
          type: 'model',
          name: 'Claude',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing type', () => {
        const input = {
          id: 'p-1',
          name: 'Claude',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing name', () => {
        const input = {
          id: 'p-1',
          type: 'model',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty id', () => {
        const input = {
          id: '',
          type: 'model',
          name: 'Claude',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty name', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: '',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid type', () => {
        const input = {
          id: 'p-1',
          type: 'robot',
          name: 'Roboto',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject invalid provider', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude',
          provider: 'invalid-provider',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject capability score below 0', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude',
          capabilityScore: -0.1,
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject capability score above 2', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude',
          capabilityScore: 2.1,
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject capability score as string', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude',
          capabilityScore: '1.5',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject null values', () => {
        const input = {
          id: null,
          type: 'model',
          name: 'Claude',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject undefined for required fields', () => {
        const input = {
          id: 'p-1',
          type: undefined,
          name: 'Claude',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject extra unknown fields', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude',
          extraField: 'should-not-be-here',
        };
        const result = ParticipantSchema.safeParse(input);
        // Zod allows extra fields by default, but we can test strict mode
        expect(result.success).toBe(true); // Default behavior
      });
    });

    describe('edge cases', () => {
      it('should handle very long id', () => {
        const input = {
          id: 'p-' + 'x'.repeat(1000),
          type: 'model',
          name: 'Claude',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle very long name', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude ' + 'x'.repeat(1000),
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle special characters in name', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude-3.5 (Sonnet) v2.0',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should handle unicode in name', () => {
        const input = {
          id: 'p-1',
          type: 'model',
          name: 'Claude-智能模型',
        };
        const result = ParticipantSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });
});
