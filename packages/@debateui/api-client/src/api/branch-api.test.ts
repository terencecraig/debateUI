import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { createBranchApi, type BranchApiClient } from './branch-api';
import type { HttpClient } from './debate-api';
import type { BranchInfo, TurnResponse, ApiError } from '@debateui/core';
import { networkError, notFoundError, serverError } from '@debateui/core';

describe('BranchApiClient', () => {
  let mockHttpClient: HttpClient;
  let branchApi: BranchApiClient;

  const mockBranchInfo: BranchInfo = {
    branchId: '123e4567-e89b-12d3-a456-426614174000',
    parentBranchId: '123e4567-e89b-12d3-a456-426614174001',
    forkTurnId: '123e4567-e89b-12d3-a456-426614174002',
    name: 'Alternative Path',
    forkMode: 'save',
    depth: 1,
    createdAt: '2025-12-01T12:00:00Z',
  };

  const mockTurnResponse: TurnResponse = {
    turnId: '123e4567-e89b-12d3-a456-426614174003',
    branchId: '123e4567-e89b-12d3-a456-426614174000',
    participantId: 'claude',
    participantType: 'model',
    content: 'This is a response',
    confidence: 0.85,
    tokensUsed: 150,
    costUsd: 0.002,
    latencyMs: 250,
    createdAt: '2025-12-01T12:01:00Z',
  };

  beforeEach(() => {
    // Create mock HTTP client
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    branchApi = createBranchApi(mockHttpClient);
  });

  describe('listBranches', () => {
    it('should return list of branches for a debate', async () => {
      const debateId = 'debate-123';
      const mockBranches = [mockBranchInfo];

      vi.mocked(mockHttpClient.get).mockReturnValue(
        TE.right(mockBranches)
      );

      const result = await branchApi.listBranches(debateId)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockBranches);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/debates/${debateId}/branches`
      );
    });

    it('should handle empty branch list', async () => {
      const debateId = 'debate-123';
      vi.mocked(mockHttpClient.get).mockReturnValue(TE.right([]));

      const result = await branchApi.listBranches(debateId)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual([]);
      }
    });

    it('should handle network errors', async () => {
      const debateId = 'debate-123';
      const error = networkError('Connection failed');

      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await branchApi.listBranches(debateId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toEqual(error);
      }
    });

    it('should handle not found error', async () => {
      const debateId = 'nonexistent';
      const error = notFoundError('debate', debateId);

      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await branchApi.listBranches(debateId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
      }
    });
  });

  describe('getBranch', () => {
    it('should return a specific branch', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';

      vi.mocked(mockHttpClient.get).mockReturnValue(
        TE.right(mockBranchInfo)
      );

      const result = await branchApi.getBranch(debateId, branchId)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockBranchInfo);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/debates/${debateId}/branches/${branchId}`
      );
    });

    it('should handle not found error for specific branch', async () => {
      const debateId = 'debate-123';
      const branchId = 'nonexistent';
      const error = notFoundError('branch', branchId);

      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await branchApi.getBranch(debateId, branchId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
      }
    });
  });

  describe('createFork', () => {
    it('should create a fork in save mode with name', async () => {
      const debateId = 'debate-123';
      const turnId = 'turn-456';
      const options = {
        content: 'Alternative response',
        forkMode: 'save' as const,
        name: 'Exploration Branch',
      };

      vi.mocked(mockHttpClient.post).mockReturnValue(
        TE.right(mockBranchInfo)
      );

      const result = await branchApi.createFork(debateId, turnId, options)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockBranchInfo);
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/api/debates/${debateId}/turns/${turnId}/fork`,
        {
          content: options.content,
          forkMode: options.forkMode,
          name: options.name,
        }
      );
    });

    it('should create a fork in explore mode without name', async () => {
      const debateId = 'debate-123';
      const turnId = 'turn-456';
      const options = {
        content: 'Quick test',
        forkMode: 'explore' as const,
      };

      vi.mocked(mockHttpClient.post).mockReturnValue(
        TE.right({ ...mockBranchInfo, forkMode: 'explore', name: 'Untitled Fork' })
      );

      const result = await branchApi.createFork(debateId, turnId, options)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.forkMode).toBe('explore');
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/api/debates/${debateId}/turns/${turnId}/fork`,
        {
          content: options.content,
          forkMode: options.forkMode,
        }
      );
    });

    it('should handle server errors during fork creation', async () => {
      const debateId = 'debate-123';
      const turnId = 'turn-456';
      const options = {
        content: 'Test',
        forkMode: 'save' as const,
      };
      const error = serverError(500, 'Internal server error');

      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await branchApi.createFork(debateId, turnId, options)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ServerError');
      }
    });

    it('should handle not found error when turn does not exist', async () => {
      const debateId = 'debate-123';
      const turnId = 'nonexistent-turn';
      const options = {
        content: 'Test',
        forkMode: 'save' as const,
      };
      const error = notFoundError('turn', turnId);

      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await branchApi.createFork(debateId, turnId, options)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
      }
    });
  });

  describe('getBranchTurns', () => {
    it('should return turns for a specific branch', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';
      const mockTurns = [mockTurnResponse];

      vi.mocked(mockHttpClient.get).mockReturnValue(
        TE.right(mockTurns)
      );

      const result = await branchApi.getBranchTurns(debateId, branchId)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockTurns);
      }

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/debates/${debateId}/branches/${branchId}/turns`
      );
    });

    it('should handle empty turns list', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';

      vi.mocked(mockHttpClient.get).mockReturnValue(TE.right([]));

      const result = await branchApi.getBranchTurns(debateId, branchId)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual([]);
      }
    });

    it('should handle not found error', async () => {
      const debateId = 'debate-123';
      const branchId = 'nonexistent';
      const error = notFoundError('branch', branchId);

      vi.mocked(mockHttpClient.get).mockReturnValue(TE.left(error));

      const result = await branchApi.getBranchTurns(debateId, branchId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
      }
    });
  });

  describe('deleteBranch', () => {
    it('should delete an explore mode branch', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';

      vi.mocked(mockHttpClient.delete).mockReturnValue(
        TE.right(undefined)
      );

      const result = await branchApi.deleteBranch(debateId, branchId)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBeUndefined();
      }

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        `/api/debates/${debateId}/branches/${branchId}`
      );
    });

    it('should handle not found error', async () => {
      const debateId = 'debate-123';
      const branchId = 'nonexistent';
      const error = notFoundError('branch', branchId);

      vi.mocked(mockHttpClient.delete).mockReturnValue(TE.left(error));

      const result = await branchApi.deleteBranch(debateId, branchId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
      }
    });

    it('should handle conflict error for save mode branches', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';
      const error: ApiError = {
        _tag: 'ConflictError',
        message: 'Cannot delete save mode branches',
      };

      vi.mocked(mockHttpClient.delete).mockReturnValue(TE.left(error));

      const result = await branchApi.deleteBranch(debateId, branchId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ConflictError');
      }
    });
  });

  describe('mergeBranch', () => {
    it('should merge a save mode branch', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';

      vi.mocked(mockHttpClient.post).mockReturnValue(
        TE.right(undefined)
      );

      const result = await branchApi.mergeBranch(debateId, branchId)();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBeUndefined();
      }

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        `/api/debates/${debateId}/branches/${branchId}/merge`
      );
    });

    it('should handle not found error', async () => {
      const debateId = 'debate-123';
      const branchId = 'nonexistent';
      const error = notFoundError('branch', branchId);

      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await branchApi.mergeBranch(debateId, branchId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
      }
    });

    it('should handle conflict error for explore mode branches', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';
      const error: ApiError = {
        _tag: 'ConflictError',
        message: 'Cannot merge explore mode branches',
      };

      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await branchApi.mergeBranch(debateId, branchId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ConflictError');
      }
    });

    it('should handle server errors', async () => {
      const debateId = 'debate-123';
      const branchId = 'branch-456';
      const error = serverError(500, 'Merge failed');

      vi.mocked(mockHttpClient.post).mockReturnValue(TE.left(error));

      const result = await branchApi.mergeBranch(debateId, branchId)();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ServerError');
      }
    });
  });
});
