import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as TE from 'fp-ts/TaskEither';
import {
  createDebateApi,
  type DebateApiClient,
} from './debate-api';
import type {
  DebateConfig,
  DebateResponse,
  TurnResponse,
  ApiError,
} from '@debateui/core';
import { validationError, notFoundError, serverError } from '@debateui/core';
import { z } from 'zod';

/**
 * Mock HttpClient interface for testing
 */
interface HttpClient {
  get<T>(url: string): TE.TaskEither<ApiError, T>;
  post<T>(url: string, body?: unknown): TE.TaskEither<ApiError, T>;
  put<T>(url: string, body?: unknown): TE.TaskEither<ApiError, T>;
  delete<T>(url: string): TE.TaskEither<ApiError, T>;
}

describe('DebateApiClient', () => {
  let mockHttpClient: HttpClient;
  let debateApi: DebateApiClient;

  beforeEach(() => {
    // Create fresh mock for each test
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };
    debateApi = createDebateApi(mockHttpClient);
  });

  describe('createDebate', () => {
    const validConfig: DebateConfig = {
      question: 'What is the meaning of life?',
      participants: ['claude-3.5-sonnet', 'gpt-4'],
      rounds: 3,
      consensusThreshold: 0.7,
      forkMode: 'save',
    };

    it('should successfully create a debate with valid config', async () => {
      const expectedResponse = { debateId: '123e4567-e89b-12d3-a456-426614174000' };
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.right(expectedResponse));

      const result = await debateApi.createDebate(validConfig)();

      expect(result).toEqual({ _tag: 'Right', right: expectedResponse });
      expect(mockHttpClient.post).toHaveBeenCalledWith('/api/debates', validConfig);
    });

    it('should return validation error for invalid config', async () => {
      const zodError = new z.ZodError([
        {
          code: 'too_small',
          minimum: 2,
          type: 'array',
          inclusive: true,
          exact: false,
          message: 'At least 2 participants required',
          path: ['participants'],
        },
      ]);
      const error = validationError(zodError);
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.createDebate(validConfig)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });

    it('should return server error on API failure', async () => {
      const error = serverError(500, 'Internal server error');
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.createDebate(validConfig)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });
  });

  describe('getDebate', () => {
    const debateId = '123e4567-e89b-12d3-a456-426614174000';

    it('should successfully fetch a debate by ID', async () => {
      const expectedResponse: DebateResponse = {
        debateId,
        status: 'running',
        question: 'What is the meaning of life?',
        currentRound: 2,
        totalRounds: 3,
        turns: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T01:00:00Z',
      };
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.right(expectedResponse));

      const result = await debateApi.getDebate(debateId)();

      expect(result).toEqual({ _tag: 'Right', right: expectedResponse });
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/api/debates/${debateId}`);
    });

    it('should return not found error for non-existent debate', async () => {
      const error = notFoundError('debate', debateId);
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await debateApi.getDebate(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });

    it('should handle validation errors in response parsing', async () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['debateId'],
          message: 'Expected string, received number',
        },
      ]);
      const error = validationError(zodError);
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await debateApi.getDebate(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });
  });

  describe('startDebate', () => {
    const debateId = '123e4567-e89b-12d3-a456-426614174000';

    it('should successfully start a debate', async () => {
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.right(undefined));

      const result = await debateApi.startDebate(debateId)();

      expect(result).toEqual({ _tag: 'Right', right: undefined });
      expect(mockHttpClient.post).toHaveBeenCalledWith(`/api/debates/${debateId}/start`);
    });

    it('should return not found error for non-existent debate', async () => {
      const error = notFoundError('debate', debateId);
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.startDebate(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });

    it('should return server error on API failure', async () => {
      const error = serverError(500, 'Failed to start debate');
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.startDebate(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });
  });

  describe('pauseDebate', () => {
    const debateId = '123e4567-e89b-12d3-a456-426614174000';

    it('should successfully pause a debate', async () => {
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.right(undefined));

      const result = await debateApi.pauseDebate(debateId)();

      expect(result).toEqual({ _tag: 'Right', right: undefined });
      expect(mockHttpClient.post).toHaveBeenCalledWith(`/api/debates/${debateId}/pause`);
    });

    it('should return not found error for non-existent debate', async () => {
      const error = notFoundError('debate', debateId);
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.pauseDebate(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });
  });

  describe('resumeDebate', () => {
    const debateId = '123e4567-e89b-12d3-a456-426614174000';

    it('should successfully resume a debate', async () => {
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.right(undefined));

      const result = await debateApi.resumeDebate(debateId)();

      expect(result).toEqual({ _tag: 'Right', right: undefined });
      expect(mockHttpClient.post).toHaveBeenCalledWith(`/api/debates/${debateId}/resume`);
    });

    it('should return not found error for non-existent debate', async () => {
      const error = notFoundError('debate', debateId);
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.resumeDebate(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });
  });

  describe('getTurns', () => {
    const debateId = '123e4567-e89b-12d3-a456-426614174000';
    const branchId = '987fcdeb-51a2-43f1-b789-123456789abc';

    it('should successfully fetch turns without branch ID', async () => {
      const expectedTurns: TurnResponse[] = [
        {
          turnId: '11111111-1111-1111-1111-111111111111',
          branchId: '22222222-2222-2222-2222-222222222222',
          participantId: 'claude-3.5-sonnet',
          participantType: 'model',
          content: 'My perspective is...',
          confidence: 0.85,
          tokensUsed: 150,
          costUsd: 0.001,
          latencyMs: 1200,
          createdAt: '2024-01-01T00:00:00Z',
        },
      ];
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.right(expectedTurns));

      const result = await debateApi.getTurns(debateId)();

      expect(result).toEqual({ _tag: 'Right', right: expectedTurns });
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/api/debates/${debateId}/turns`);
    });

    it('should successfully fetch turns with branch ID', async () => {
      const expectedTurns: TurnResponse[] = [];
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.right(expectedTurns));

      const result = await debateApi.getTurns(debateId, branchId)();

      expect(result).toEqual({ _tag: 'Right', right: expectedTurns });
      expect(mockHttpClient.get).toHaveBeenCalledWith(`/api/debates/${debateId}/turns?branchId=${branchId}`);
    });

    it('should return not found error for non-existent debate', async () => {
      const error = notFoundError('debate', debateId);
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await debateApi.getTurns(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });

    it('should handle validation errors in turn response parsing', async () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'array',
          received: 'object',
          path: [],
          message: 'Expected array, received object',
        },
      ]);
      const error = validationError(zodError);
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await debateApi.getTurns(debateId)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });
  });

  describe('submitTurn', () => {
    const debateId = '123e4567-e89b-12d3-a456-426614174000';
    const branchId = '987fcdeb-51a2-43f1-b789-123456789abc';
    const content = 'I disagree with that premise because...';

    it('should successfully submit a turn without branch ID', async () => {
      const expectedResponse: TurnResponse = {
        turnId: '33333333-3333-3333-3333-333333333333',
        branchId: '22222222-2222-2222-2222-222222222222',
        participantId: 'human-user',
        participantType: 'human',
        content,
        tokensUsed: 50,
        costUsd: 0,
        latencyMs: 0,
        createdAt: '2024-01-01T00:01:00Z',
      };
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.right(expectedResponse));

      const result = await debateApi.submitTurn(debateId, content)();

      expect(result).toEqual({ _tag: 'Right', right: expectedResponse });
      expect(mockHttpClient.post).toHaveBeenCalledWith(`/api/debates/${debateId}/turns`, { content });
    });

    it('should successfully submit a turn with branch ID', async () => {
      const expectedResponse: TurnResponse = {
        turnId: '44444444-4444-4444-4444-444444444444',
        branchId,
        participantId: 'human-user',
        participantType: 'human',
        content,
        tokensUsed: 50,
        costUsd: 0,
        latencyMs: 0,
        createdAt: '2024-01-01T00:02:00Z',
      };
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.right(expectedResponse));

      const result = await debateApi.submitTurn(debateId, content, branchId)();

      expect(result).toEqual({ _tag: 'Right', right: expectedResponse });
      expect(mockHttpClient.post).toHaveBeenCalledWith(`/api/debates/${debateId}/turns`, { content, branchId });
    });

    it('should return not found error for non-existent debate', async () => {
      const error = notFoundError('debate', debateId);
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.submitTurn(debateId, content)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });

    it('should handle validation errors in response', async () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_string',
          validation: 'uuid',
          path: ['turnId'],
          message: 'Invalid UUID',
        },
      ]);
      const error = validationError(zodError);
      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await debateApi.submitTurn(debateId, content)();

      expect(result).toEqual({ _tag: 'Left', left: error });
    });
  });

  describe('Integration: Real workflow', () => {
    it('should handle a complete debate lifecycle', async () => {
      const config: DebateConfig = {
        question: 'Is AI beneficial or harmful?',
        participants: ['claude-3.5-sonnet', 'gpt-4'],
        rounds: 2,
        consensusThreshold: 0.75,
        forkMode: 'save',
      };

      // Create debate
      const debateId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(mockHttpClient.post).mockReturnValueOnce(TE.right({ debateId }));

      const createResult = await debateApi.createDebate(config)();
      expect(createResult._tag).toBe('Right');

      // Start debate
      vi.mocked(mockHttpClient.post).mockReturnValueOnce(TE.right(undefined));
      const startResult = await debateApi.startDebate(debateId)();
      expect(startResult._tag).toBe('Right');

      // Get debate status
      const debateResponse: DebateResponse = {
        debateId,
        status: 'running',
        question: config.question,
        currentRound: 1,
        totalRounds: 2,
        turns: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:01:00Z',
      };
      vi.mocked(mockHttpClient.get).mockReturnValueOnce(TE.right(debateResponse));
      const getResult = await debateApi.getDebate(debateId)();
      expect(getResult._tag).toBe('Right');

      // Submit turn
      const turnResponse: TurnResponse = {
        turnId: '55555555-5555-5555-5555-555555555555',
        branchId: '22222222-2222-2222-2222-222222222222',
        participantId: 'human-user',
        participantType: 'human',
        content: 'I think AI is beneficial because...',
        tokensUsed: 50,
        costUsd: 0,
        latencyMs: 0,
        createdAt: '2024-01-01T00:02:00Z',
      };
      vi.mocked(mockHttpClient.post).mockReturnValueOnce(TE.right(turnResponse));
      const submitResult = await debateApi.submitTurn(debateId, turnResponse.content)();
      expect(submitResult._tag).toBe('Right');

      // Pause debate
      vi.mocked(mockHttpClient.post).mockReturnValueOnce(TE.right(undefined));
      const pauseResult = await debateApi.pauseDebate(debateId)();
      expect(pauseResult._tag).toBe('Right');

      // Resume debate
      vi.mocked(mockHttpClient.post).mockReturnValueOnce(TE.right(undefined));
      const resumeResult = await debateApi.resumeDebate(debateId)();
      expect(resumeResult._tag).toBe('Right');
    });
  });
});
