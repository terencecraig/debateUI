import ky, { type KyInstance, type Options, type HTTPError } from 'ky';
import * as TE from 'fp-ts/TaskEither';
import * as E from 'fp-ts/Either';
import { v4 as uuidv4 } from 'uuid';
import {
  type ApiError,
  networkError,
  authError,
  notFoundError,
  conflictError,
  rateLimitError,
  serverError,
} from '@debateui/core';

/**
 * HTTP client configuration options
 */
export interface HttpClientConfig {
  /**
   * Request timeout in milliseconds
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Request/response hooks for interceptors
   */
  hooks?: Options['hooks'];

  /**
   * Additional ky options (excluding prefixUrl which is set by baseUrl)
   */
  retry?: Options['retry'];
  throwHttpErrors?: boolean;
  signal?: AbortSignal;
}

/**
 * HTTP client interface with type-safe request methods
 */
export interface HttpClient {
  /**
   * Perform a GET request
   * @param path - Request path
   * @param options - Request options
   * @returns TaskEither with response data or ApiError
   */
  get: <T>(path: string, options?: Options) => TE.TaskEither<ApiError, T>;

  /**
   * Perform a POST request
   * @param path - Request path
   * @param body - Request body
   * @param options - Request options
   * @returns TaskEither with response data or ApiError
   */
  post: <T>(
    path: string,
    body?: unknown,
    options?: Options
  ) => TE.TaskEither<ApiError, T>;

  /**
   * Perform a PUT request
   * @param path - Request path
   * @param body - Request body
   * @param options - Request options
   * @returns TaskEither with response data or ApiError
   */
  put: <T>(
    path: string,
    body?: unknown,
    options?: Options
  ) => TE.TaskEither<ApiError, T>;

  /**
   * Perform a DELETE request
   * @param path - Request path
   * @param options - Request options
   * @returns TaskEither with response data or ApiError
   */
  delete: <T>(path: string, options?: Options) => TE.TaskEither<ApiError, T>;
}

/**
 * Extract error message from HTTP error response
 */
async function extractErrorMessage(
  response: Response
): Promise<string> {
  try {
    const json = await response.json();
    return json.message || response.statusText;
  } catch {
    return response.statusText;
  }
}

/**
 * Parse Retry-After header value to seconds
 */
function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? undefined : seconds;
}

/**
 * Convert HTTP error to appropriate ApiError variant
 */
async function handleHttpError(error: HTTPError): Promise<ApiError> {
  const { response } = error;
  const status = response.status;
  const message = await extractErrorMessage(response);

  switch (status) {
    case 400: {
      // For 400 errors, we need to create a ZodError
      // Since we don't have the actual validation errors, create a generic one
      const zodError = {
        issues: [{ code: 'custom' as const, path: [], message }],
        name: 'ZodError' as const,
        format: () => ({ _errors: [message] }),
      } as any;
      return { _tag: 'ValidationError', errors: zodError };
    }

    case 401:
    case 403:
      return authError(message, status as 401 | 403);

    case 404:
      // For 404, extract resource and id from path or use generic values
      return notFoundError('resource', 'unknown');

    case 409:
      return conflictError(message);

    case 429: {
      const retryAfter = parseRetryAfter(response.headers.get('Retry-After'));
      // Convert seconds to milliseconds, default to 60000ms (1 minute)
      const retryAfterMs = retryAfter ? retryAfter * 1000 : 60000;
      return rateLimitError(retryAfterMs);
    }

    case 500:
    case 502:
    case 503:
    case 504:
      return serverError(status, message);

    default:
      // For other 4xx errors, treat as validation errors
      if (status >= 400 && status < 500) {
        const zodError = {
          issues: [{ code: 'custom' as const, path: [], message }],
          name: 'ZodError' as const,
          format: () => ({ _errors: [message] }),
        } as any;
        return { _tag: 'ValidationError', errors: zodError };
      }
      // For other 5xx errors, treat as server errors
      return serverError(status, message);
  }
}

/**
 * Convert network/timeout error to NetworkError
 */
function handleNetworkError(error: unknown): ApiError {
  // Check if it's an error-like object with a name property
  if (error && typeof error === 'object' && 'name' in error) {
    const errorObj = error as { name: string; message?: string };

    // Check if it's a timeout error
    if (errorObj.name === 'TimeoutError') {
      const message = errorObj.message || 'Request timed out';
      return networkError(message, error instanceof Error ? error : undefined);
    }
  }

  if (error instanceof Error) {
    // Handle TypeError (network errors)
    if (error instanceof TypeError) {
      return networkError('Network request failed', error);
    }
    // Generic error
    return networkError(error.message || 'An unexpected error occurred', error);
  }

  // Unknown error type
  return networkError('An unexpected error occurred', undefined);
}

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return uuidv4();
}

/**
 * Add request ID header if not already present
 */
function addRequestIdHeader(
  options: Options = {}
): Options {
  const headers = {
    'X-Request-ID': generateRequestId(),
    ...(options.headers || {}),
  };

  return {
    ...options,
    headers,
  };
}

/**
 * Create a type-safe HTTP client wrapper around ky
 * @param baseUrl - Base URL for all requests
 * @param config - HTTP client configuration
 * @returns HTTP client with type-safe request methods
 */
export function createHttpClient(
  baseUrl: string,
  config: HttpClientConfig = {}
): HttpClient {
  const {
    timeout = 30000,
    headers = {},
    hooks,
    retry,
    throwHttpErrors,
    signal,
  } = config;

  // Build options object, only including defined properties
  const options: Options = {
    prefixUrl: baseUrl,
    timeout,
    headers,
    ...(hooks !== undefined && { hooks }),
    ...(retry !== undefined && { retry }),
    ...(throwHttpErrors !== undefined && { throwHttpErrors }),
    ...(signal !== undefined && { signal }),
  };

  // Create ky instance with configuration
  const kyInstance: KyInstance = ky.create(options);

  /**
   * Generic request handler
   */
  async function request<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    options: Options = {}
  ): Promise<T> {
    const optionsWithRequestId = addRequestIdHeader(options);
    const response = await kyInstance[method](path, optionsWithRequestId);
    return response.json<T>();
  }

  /**
   * Wrap request in TaskEither for error handling
   */
  function wrapRequest<T>(
    fn: () => Promise<T>
  ): TE.TaskEither<ApiError, T> {
    return async () => {
      try {
        const result = await fn();
        return E.right(result);
      } catch (error: unknown) {
        // Check if it's an HTTPError
        if (error && typeof error === 'object' && 'response' in error) {
          const apiError = await handleHttpError(error as HTTPError);
          return E.left(apiError);
        }
        // Handle network/timeout errors
        const apiError = handleNetworkError(error);
        return E.left(apiError);
      }
    };
  }

  return {
    get: <T>(path: string, options?: Options) =>
      wrapRequest(() => request<T>('get', path, options)),

    post: <T>(path: string, body?: unknown, options?: Options) =>
      wrapRequest(() =>
        request<T>('post', path, {
          ...options,
          json: body,
        })
      ),

    put: <T>(path: string, body?: unknown, options?: Options) =>
      wrapRequest(() =>
        request<T>('put', path, {
          ...options,
          json: body,
        })
      ),

    delete: <T>(path: string, options?: Options) =>
      wrapRequest(() => request<T>('delete', path, options)),
  };
}
