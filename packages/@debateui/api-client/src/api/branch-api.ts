import * as TE from 'fp-ts/TaskEither';
import type { ApiError, BranchInfo, TurnResponse, ForkMode } from '@debateui/core';
import type { HttpClient } from './debate-api';

/**
 * Options for creating a fork
 */
export interface CreateForkOptions {
  /** Content for the fork's first turn */
  readonly content: string;
  /** Fork mode: 'save' persists the branch, 'explore' is temporary */
  readonly forkMode: ForkMode;
  /** Optional name for the branch */
  readonly name?: string;
}

/**
 * Branch API client for managing debate branches and forks
 */
export interface BranchApiClient {
  /**
   * List all branches for a debate
   * @param debateId - The debate ID
   * @returns TaskEither with list of branch information
   */
  readonly listBranches: (debateId: string) => TE.TaskEither<ApiError, readonly BranchInfo[]>;

  /**
   * Get a specific branch
   * @param debateId - The debate ID
   * @param branchId - The branch ID
   * @returns TaskEither with branch information
   */
  readonly getBranch: (debateId: string, branchId: string) => TE.TaskEither<ApiError, BranchInfo>;

  /**
   * Create a fork from a specific turn
   * @param debateId - The debate ID
   * @param turnId - The turn ID to fork from
   * @param options - Fork creation options
   * @returns TaskEither with created branch information
   */
  readonly createFork: (
    debateId: string,
    turnId: string,
    options: CreateForkOptions
  ) => TE.TaskEither<ApiError, BranchInfo>;

  /**
   * Get turns in a specific branch
   * @param debateId - The debate ID
   * @param branchId - The branch ID
   * @returns TaskEither with list of turns
   */
  readonly getBranchTurns: (
    debateId: string,
    branchId: string
  ) => TE.TaskEither<ApiError, readonly TurnResponse[]>;

  /**
   * Delete a branch (only 'explore' mode branches)
   * @param debateId - The debate ID
   * @param branchId - The branch ID
   * @returns TaskEither with void on success
   */
  readonly deleteBranch: (debateId: string, branchId: string) => TE.TaskEither<ApiError, void>;

  /**
   * Merge a branch back (only 'save' mode branches)
   * @param debateId - The debate ID
   * @param branchId - The branch ID
   * @returns TaskEither with void on success
   */
  readonly mergeBranch: (debateId: string, branchId: string) => TE.TaskEither<ApiError, void>;
}

/**
 * Create a Branch API client
 * @param httpClient - The HTTP client to use for requests
 * @returns BranchApiClient instance
 */
export const createBranchApi = (httpClient: HttpClient): BranchApiClient => {
  return {
    listBranches: (debateId: string) => {
      return httpClient.get<readonly BranchInfo[]>(
        `/api/debates/${debateId}/branches`
      );
    },

    getBranch: (debateId: string, branchId: string) => {
      return httpClient.get<BranchInfo>(
        `/api/debates/${debateId}/branches/${branchId}`
      );
    },

    createFork: (debateId: string, turnId: string, options: CreateForkOptions) => {
      const body: Record<string, unknown> = {
        content: options.content,
        forkMode: options.forkMode,
      };

      // Only include name if provided
      if (options.name !== undefined) {
        body['name'] = options.name;
      }

      return httpClient.post<BranchInfo>(
        `/api/debates/${debateId}/turns/${turnId}/fork`,
        body
      );
    },

    getBranchTurns: (debateId: string, branchId: string) => {
      return httpClient.get<readonly TurnResponse[]>(
        `/api/debates/${debateId}/branches/${branchId}/turns`
      );
    },

    deleteBranch: (debateId: string, branchId: string) => {
      return httpClient.delete<void>(
        `/api/debates/${debateId}/branches/${branchId}`
      );
    },

    mergeBranch: (debateId: string, branchId: string) => {
      return httpClient.post<void>(
        `/api/debates/${debateId}/branches/${branchId}/merge`
      );
    },
  };
};
