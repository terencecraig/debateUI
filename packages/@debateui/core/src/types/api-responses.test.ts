import { describe, it, expect } from 'vitest';
import * as E from 'fp-ts/Either';
import {
  TurnResponseSchema,
  DebateStatusSchema,
  DebateResponseSchema,
  BranchInfoSchema,
  parseTurnResponse,
  parseDebateResponse,
  parseBranchInfo,
  type TurnResponse,
  type DebateStatus,
} from './api-responses.js';

describe('api-responses.ts - TurnResponseSchema', () => {
  it('validates valid TurnResponse', () => {
    const validTurn = {
      turnId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'claude-3-opus',
      participantType: 'model' as const,
      content: 'This is my argument',
      confidence: 0.85,
      tokensUsed: 150,
      costUsd: 0.0025,
      latencyMs: 1200,
      createdAt: '2025-12-01T10:30:00Z',
    };

    const result = TurnResponseSchema.safeParse(validTurn);
    expect(result.success).toBe(true);
  });

  it('validates TurnResponse with optional confidence missing', () => {
    const turnWithoutConfidence = {
      turnId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'human-user',
      participantType: 'human' as const,
      content: 'Human input',
      tokensUsed: 50,
      costUsd: 0,
      latencyMs: 100,
      createdAt: '2025-12-01T10:30:00Z',
    };

    const result = TurnResponseSchema.safeParse(turnWithoutConfidence);
    expect(result.success).toBe(true);
  });

  it('rejects invalid UUID for turnId', () => {
    const invalidTurn = {
      turnId: 'not-a-uuid',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'model-1',
      participantType: 'model',
      content: 'test',
      tokensUsed: 10,
      costUsd: 0.001,
      latencyMs: 100,
      createdAt: '2025-12-01T10:30:00Z',
    };

    const result = TurnResponseSchema.safeParse(invalidTurn);
    expect(result.success).toBe(false);
  });

  it('rejects invalid participantType', () => {
    const invalidTurn = {
      turnId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'bot',
      participantType: 'bot', // Invalid: only 'model' or 'human'
      content: 'test',
      tokensUsed: 10,
      costUsd: 0.001,
      latencyMs: 100,
      createdAt: '2025-12-01T10:30:00Z',
    };

    const result = TurnResponseSchema.safeParse(invalidTurn);
    expect(result.success).toBe(false);
  });

  it('rejects confidence outside [0, 1] range', () => {
    const invalidConfidence = {
      turnId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'model-1',
      participantType: 'model',
      content: 'test',
      confidence: 1.5, // Invalid: > 1
      tokensUsed: 10,
      costUsd: 0.001,
      latencyMs: 100,
      createdAt: '2025-12-01T10:30:00Z',
    };

    const result = TurnResponseSchema.safeParse(invalidConfidence);
    expect(result.success).toBe(false);
  });

  it('rejects negative tokensUsed', () => {
    const invalidTokens = {
      turnId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'model-1',
      participantType: 'model',
      content: 'test',
      tokensUsed: -10,
      costUsd: 0.001,
      latencyMs: 100,
      createdAt: '2025-12-01T10:30:00Z',
    };

    const result = TurnResponseSchema.safeParse(invalidTokens);
    expect(result.success).toBe(false);
  });

  it('rejects invalid datetime format', () => {
    const invalidDatetime = {
      turnId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'model-1',
      participantType: 'model',
      content: 'test',
      tokensUsed: 10,
      costUsd: 0.001,
      latencyMs: 100,
      createdAt: '2025-12-01', // Invalid: not ISO datetime
    };

    const result = TurnResponseSchema.safeParse(invalidDatetime);
    expect(result.success).toBe(false);
  });
});

describe('api-responses.ts - DebateStatusSchema', () => {
  it('validates all valid statuses', () => {
    const validStatuses = ['pending', 'running', 'paused', 'completed', 'error'];
    validStatuses.forEach(status => {
      const result = DebateStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid status', () => {
    const result = DebateStatusSchema.safeParse('cancelled');
    expect(result.success).toBe(false);
  });
});

describe('api-responses.ts - DebateResponseSchema', () => {
  it('validates valid DebateResponse', () => {
    const validDebate = {
      debateId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'running' as const,
      question: 'Is AI beneficial for humanity?',
      currentRound: 2,
      totalRounds: 5,
      turns: [
        {
          turnId: '323e4567-e89b-12d3-a456-426614174000',
          branchId: '423e4567-e89b-12d3-a456-426614174000',
          participantId: 'claude-3-opus',
          participantType: 'model' as const,
          content: 'Yes, because...',
          confidence: 0.9,
          tokensUsed: 100,
          costUsd: 0.002,
          latencyMs: 800,
          createdAt: '2025-12-01T10:30:00Z',
        },
      ],
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: '2025-12-01T10:30:00Z',
    };

    const result = DebateResponseSchema.safeParse(validDebate);
    expect(result.success).toBe(true);
  });

  it('validates DebateResponse with empty turns array', () => {
    const debateNoTurns = {
      debateId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'pending' as const,
      question: 'Should we proceed?',
      currentRound: 0,
      totalRounds: 3,
      turns: [],
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: '2025-12-01T10:00:00Z',
    };

    const result = DebateResponseSchema.safeParse(debateNoTurns);
    expect(result.success).toBe(true);
  });

  it('rejects totalRounds of 0', () => {
    const invalidDebate = {
      debateId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'pending',
      question: 'Test?',
      currentRound: 0,
      totalRounds: 0, // Invalid: must be positive
      turns: [],
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: '2025-12-01T10:00:00Z',
    };

    const result = DebateResponseSchema.safeParse(invalidDebate);
    expect(result.success).toBe(false);
  });

  it('rejects negative currentRound', () => {
    const invalidDebate = {
      debateId: '123e4567-e89b-12d3-a456-426614174000',
      status: 'running',
      question: 'Test?',
      currentRound: -1,
      totalRounds: 3,
      turns: [],
      createdAt: '2025-12-01T10:00:00Z',
      updatedAt: '2025-12-01T10:00:00Z',
    };

    const result = DebateResponseSchema.safeParse(invalidDebate);
    expect(result.success).toBe(false);
  });
});

describe('api-responses.ts - BranchInfoSchema', () => {
  it('validates root branch (no parent)', () => {
    const rootBranch = {
      branchId: '123e4567-e89b-12d3-a456-426614174000',
      parentBranchId: null,
      forkTurnId: null,
      name: 'main',
      forkMode: 'save' as const,
      depth: 0,
      createdAt: '2025-12-01T10:00:00Z',
    };

    const result = BranchInfoSchema.safeParse(rootBranch);
    expect(result.success).toBe(true);
  });

  it('validates child branch with parent', () => {
    const childBranch = {
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
      forkTurnId: '323e4567-e89b-12d3-a456-426614174000',
      name: 'exploration-1',
      forkMode: 'explore' as const,
      depth: 1,
      createdAt: '2025-12-01T10:15:00Z',
    };

    const result = BranchInfoSchema.safeParse(childBranch);
    expect(result.success).toBe(true);
  });

  it('rejects invalid forkMode', () => {
    const invalidBranch = {
      branchId: '123e4567-e89b-12d3-a456-426614174000',
      parentBranchId: null,
      forkTurnId: null,
      name: 'main',
      forkMode: 'invalid', // Invalid: only 'save' or 'explore'
      depth: 0,
      createdAt: '2025-12-01T10:00:00Z',
    };

    const result = BranchInfoSchema.safeParse(invalidBranch);
    expect(result.success).toBe(false);
  });

  it('rejects negative depth', () => {
    const invalidBranch = {
      branchId: '123e4567-e89b-12d3-a456-426614174000',
      parentBranchId: null,
      forkTurnId: null,
      name: 'main',
      forkMode: 'save',
      depth: -1,
      createdAt: '2025-12-01T10:00:00Z',
    };

    const result = BranchInfoSchema.safeParse(invalidBranch);
    expect(result.success).toBe(false);
  });
});

describe('api-responses.ts - fp-ts Parsers', () => {
  describe('parseTurnResponse', () => {
    it('returns Right for valid input', () => {
      const validInput = {
        turnId: '123e4567-e89b-12d3-a456-426614174000',
        branchId: '223e4567-e89b-12d3-a456-426614174000',
        participantId: 'model-1',
        participantType: 'model',
        content: 'test',
        tokensUsed: 10,
        costUsd: 0.001,
        latencyMs: 100,
        createdAt: '2025-12-01T10:30:00Z',
      };

      const result = parseTurnResponse(validInput);
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.turnId).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('returns Left for invalid input', () => {
      const invalidInput = {
        turnId: 'invalid-uuid',
        branchId: '223e4567-e89b-12d3-a456-426614174000',
        participantId: 'model-1',
        participantType: 'model',
        content: 'test',
        tokensUsed: 10,
        costUsd: 0.001,
        latencyMs: 100,
        createdAt: '2025-12-01T10:30:00Z',
      };

      const result = parseTurnResponse(invalidInput);
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.issues.length).toBeGreaterThan(0);
      }
    });

    it('handles null input', () => {
      const result = parseTurnResponse(null);
      expect(E.isLeft(result)).toBe(true);
    });

    it('handles undefined input', () => {
      const result = parseTurnResponse(undefined);
      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('parseDebateResponse', () => {
    it('returns Right for valid input', () => {
      const validInput = {
        debateId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'running',
        question: 'Test question?',
        currentRound: 1,
        totalRounds: 3,
        turns: [],
        createdAt: '2025-12-01T10:00:00Z',
        updatedAt: '2025-12-01T10:00:00Z',
      };

      const result = parseDebateResponse(validInput);
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.debateId).toBe('123e4567-e89b-12d3-a456-426614174000');
      }
    });

    it('returns Left for invalid input', () => {
      const invalidInput = {
        debateId: 'invalid-uuid',
        status: 'running',
        question: 'Test?',
        currentRound: 1,
        totalRounds: 3,
        turns: [],
        createdAt: '2025-12-01T10:00:00Z',
        updatedAt: '2025-12-01T10:00:00Z',
      };

      const result = parseDebateResponse(invalidInput);
      expect(E.isLeft(result)).toBe(true);
    });

    it('validates nested turns array', () => {
      const inputWithInvalidTurn = {
        debateId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'running',
        question: 'Test?',
        currentRound: 1,
        totalRounds: 3,
        turns: [
          {
            turnId: 'invalid-uuid',
            branchId: '223e4567-e89b-12d3-a456-426614174000',
            participantId: 'model-1',
            participantType: 'model',
            content: 'test',
            tokensUsed: 10,
            costUsd: 0.001,
            latencyMs: 100,
            createdAt: '2025-12-01T10:30:00Z',
          },
        ],
        createdAt: '2025-12-01T10:00:00Z',
        updatedAt: '2025-12-01T10:00:00Z',
      };

      const result = parseDebateResponse(inputWithInvalidTurn);
      expect(E.isLeft(result)).toBe(true);
    });
  });

  describe('parseBranchInfo', () => {
    it('returns Right for valid input', () => {
      const validInput = {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2025-12-01T10:00:00Z',
      };

      const result = parseBranchInfo(validInput);
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.name).toBe('main');
      }
    });

    it('returns Left for invalid input', () => {
      const invalidInput = {
        branchId: 'invalid-uuid',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2025-12-01T10:00:00Z',
      };

      const result = parseBranchInfo(invalidInput);
      expect(E.isLeft(result)).toBe(true);
    });
  });
});

describe('api-responses.ts - Type Inference', () => {
  it('infers correct TypeScript types from schemas', () => {
    const turn: TurnResponse = {
      turnId: '123e4567-e89b-12d3-a456-426614174000',
      branchId: '223e4567-e89b-12d3-a456-426614174000',
      participantId: 'model-1',
      participantType: 'model',
      content: 'test',
      tokensUsed: 10,
      costUsd: 0.001,
      latencyMs: 100,
      createdAt: '2025-12-01T10:30:00Z',
    };

    // Type check: confidence is optional
    const turnWithConfidence: TurnResponse = { ...turn, confidence: 0.8 };

    // Type check: these should compile
    expect(turn.participantType).toBe('model');
    expect(turnWithConfidence.confidence).toBe(0.8);
  });

  it('enforces DebateStatus enum', () => {
    const status1: DebateStatus = 'pending';
    const status2: DebateStatus = 'running';
    const status3: DebateStatus = 'paused';
    const status4: DebateStatus = 'completed';
    const status5: DebateStatus = 'error';

    // This should not compile (commented out for test):
    // const invalidStatus: DebateStatus = 'invalid';

    expect([status1, status2, status3, status4, status5]).toHaveLength(5);
  });
});
