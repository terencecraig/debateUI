// @debateui/api-client - CCR API clients

import { createDebateApi, type DebateApiClient } from './api/debate-api';
import { createBranchApi, type BranchApiClient } from './api/branch-api';
import type { HttpClient } from './client/http-client';

// Export version
export const VERSION = '0.1.0';

// Export HTTP client
export {
  createHttpClient,
  type HttpClient,
  type HttpClientConfig,
} from './client/http-client';

// Export Debate API
export {
  createDebateApi,
  type DebateApiClient,
} from './api/debate-api';

// Export Branch API
export {
  createBranchApi,
  type BranchApiClient,
  type CreateForkOptions,
} from './api/branch-api';

// Export SSE Streaming client
export {
  createSSEClient,
  isTurnEvent,
  isConsensusEvent,
  isErrorEvent,
  isCompleteEvent,
  isCCREvent,
  type StreamEvent,
  type StreamEventHandler,
  type SSEClient,
  type SSEClientOptions,
  type CCREventType,
  type CCREventData,
} from './streaming/sse-client';

/**
 * Combined API client interface
 */
export interface ApiClient {
  readonly debate: DebateApiClient;
  readonly branch: BranchApiClient;
}

/**
 * Create a combined API client with both debate and branch APIs
 * @param httpClient - The HTTP client to use for all API calls
 * @returns ApiClient with debate and branch API methods
 *
 * @example
 * ```typescript
 * import { createApiClient, type HttpClient } from '@debateui/api-client';
 * import * as TE from 'fp-ts/TaskEither';
 *
 * // Create a simple HTTP client
 * const httpClient: HttpClient = {
 *   get: (url) => TE.tryCatch(...),
 *   post: (url, body) => TE.tryCatch(...),
 *   put: (url, body) => TE.tryCatch(...),
 *   delete: (url) => TE.tryCatch(...),
 * };
 *
 * const apiClient = createApiClient(httpClient);
 *
 * // Use the debate API
 * const result = await apiClient.debate.createDebate({
 *   question: 'Is AI beneficial?',
 *   participants: ['claude', 'gpt-4'],
 *   rounds: 3,
 *   consensusThreshold: 0.8,
 *   forkMode: 'save',
 * })();
 *
 * // Use the branch API
 * const branches = await apiClient.branch.listBranches('debate-123')();
 * ```
 */
export const createApiClient = (httpClient: HttpClient): ApiClient => {
  return {
    debate: createDebateApi(httpClient),
    branch: createBranchApi(httpClient),
  };
};
