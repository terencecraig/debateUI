import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type {
  DebateConfig,
  DebateResponse,
  TurnResponse,
  ApiError,
} from '@debateui/core';
import {
  parseDebateResponse,
  parseTurnResponse,
  validationError,
} from '@debateui/core';
import { z } from 'zod';

/**
 * HttpClient interface for dependency injection
 * Provides type-safe HTTP operations with fp-ts TaskEither
 */
export interface HttpClient {
  get<T>(url: string): TE.TaskEither<ApiError, T>;
  post<T>(url: string, body?: unknown): TE.TaskEither<ApiError, T>;
  put<T>(url: string, body?: unknown): TE.TaskEither<ApiError, T>;
  delete<T>(url: string): TE.TaskEither<ApiError, T>;
}

/**
 * Debate API client interface
 * All methods return TaskEither for composable error handling
 */
export interface DebateApiClient {
  /**
   * Create a new debate with the given configuration
   * @param config - Debate configuration (question, participants, rounds, etc.)
   * @returns TaskEither with debate ID on success, ApiError on failure
   */
  createDebate(config: DebateConfig): TE.TaskEither<ApiError, { debateId: string }>;

  /**
   * Get a debate by ID
   * @param debateId - UUID of the debate to retrieve
   * @returns TaskEither with DebateResponse on success, ApiError on failure
   */
  getDebate(debateId: string): TE.TaskEither<ApiError, DebateResponse>;

  /**
   * Start a debate (begin executing turns)
   * @param debateId - UUID of the debate to start
   * @returns TaskEither with void on success, ApiError on failure
   */
  startDebate(debateId: string): TE.TaskEither<ApiError, void>;

  /**
   * Pause a running debate
   * @param debateId - UUID of the debate to pause
   * @returns TaskEither with void on success, ApiError on failure
   */
  pauseDebate(debateId: string): TE.TaskEither<ApiError, void>;

  /**
   * Resume a paused debate
   * @param debateId - UUID of the debate to resume
   * @returns TaskEither with void on success, ApiError on failure
   */
  resumeDebate(debateId: string): TE.TaskEither<ApiError, void>;

  /**
   * Get all turns for a debate, optionally filtered by branch
   * @param debateId - UUID of the debate
   * @param branchId - Optional UUID of specific branch to retrieve turns from
   * @returns TaskEither with array of TurnResponse on success, ApiError on failure
   */
  getTurns(debateId: string, branchId?: string): TE.TaskEither<ApiError, TurnResponse[]>;

  /**
   * Submit a human turn to a debate
   * @param debateId - UUID of the debate
   * @param content - Text content of the turn
   * @param branchId - Optional UUID of branch to submit turn to
   * @returns TaskEither with TurnResponse on success, ApiError on failure
   */
  submitTurn(debateId: string, content: string, branchId?: string): TE.TaskEither<ApiError, TurnResponse>;
}

/**
 * Schema for create debate response
 */
const CreateDebateResponseSchema = z.object({
  debateId: z.string().min(1),
}).strict();

/**
 * Schema for array of turn responses
 */
const TurnResponseArraySchema = z.array(z.unknown());

/**
 * Factory function to create a DebateApiClient
 * @param httpClient - HTTP client dependency for making API calls
 * @returns DebateApiClient instance
 *
 * @example
 * ```typescript
 * const httpClient = createHttpClient({ baseUrl: 'https://api.example.com' });
 * const debateApi = createDebateApi(httpClient);
 *
 * // Create a debate
 * const result = await debateApi.createDebate({
 *   question: 'Is AI beneficial?',
 *   participants: ['claude', 'gpt-4'],
 *   rounds: 3,
 *   consensusThreshold: 0.8,
 *   forkMode: 'save'
 * })();
 * ```
 */
export const createDebateApi = (httpClient: HttpClient): DebateApiClient => {
  return {
    createDebate: (config: DebateConfig): TE.TaskEither<ApiError, { debateId: string }> => {
      return pipe(
        httpClient.post<unknown>('/api/debates', config),
        TE.chainW((response) => {
          const parseResult = CreateDebateResponseSchema.safeParse(response);
          if (parseResult.success) {
            return TE.right(parseResult.data);
          }
          return TE.left(validationError(parseResult.error));
        })
      );
    },

    getDebate: (debateId: string): TE.TaskEither<ApiError, DebateResponse> => {
      return pipe(
        httpClient.get<unknown>(`/api/debates/${debateId}`),
        TE.chainW((response) => {
          const parseResult = parseDebateResponse(response);
          if (parseResult._tag === 'Right') {
            return TE.right(parseResult.right);
          }
          return TE.left(validationError(parseResult.left));
        })
      );
    },

    startDebate: (debateId: string): TE.TaskEither<ApiError, void> => {
      return pipe(
        httpClient.post<void>(`/api/debates/${debateId}/start`),
        TE.map(() => undefined)
      );
    },

    pauseDebate: (debateId: string): TE.TaskEither<ApiError, void> => {
      return pipe(
        httpClient.post<void>(`/api/debates/${debateId}/pause`),
        TE.map(() => undefined)
      );
    },

    resumeDebate: (debateId: string): TE.TaskEither<ApiError, void> => {
      return pipe(
        httpClient.post<void>(`/api/debates/${debateId}/resume`),
        TE.map(() => undefined)
      );
    },

    getTurns: (debateId: string, branchId?: string): TE.TaskEither<ApiError, TurnResponse[]> => {
      const url = branchId
        ? `/api/debates/${debateId}/turns?branchId=${branchId}`
        : `/api/debates/${debateId}/turns`;

      return pipe(
        httpClient.get<unknown>(url),
        TE.chainW((response) => {
          // First validate it's an array
          const arrayParseResult = TurnResponseArraySchema.safeParse(response);
          if (!arrayParseResult.success) {
            return TE.left(validationError(arrayParseResult.error));
          }

          // Then parse each turn
          const turns: TurnResponse[] = [];
          for (const item of arrayParseResult.data) {
            const turnParseResult = parseTurnResponse(item);
            if (turnParseResult._tag === 'Right') {
              turns.push(turnParseResult.right);
            } else {
              return TE.left(validationError(turnParseResult.left));
            }
          }

          return TE.right(turns);
        })
      );
    },

    submitTurn: (debateId: string, content: string, branchId?: string): TE.TaskEither<ApiError, TurnResponse> => {
      const body = branchId ? { content, branchId } : { content };

      return pipe(
        httpClient.post<unknown>(`/api/debates/${debateId}/turns`, body),
        TE.chainW((response) => {
          const parseResult = parseTurnResponse(response);
          if (parseResult._tag === 'Right') {
            return TE.right(parseResult.right);
          }
          return TE.left(validationError(parseResult.left));
        })
      );
    },
  };
};
