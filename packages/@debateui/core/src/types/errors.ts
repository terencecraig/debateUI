import { z } from 'zod';

/**
 * Discriminated union for type-safe API error handling.
 * Each error variant has a unique _tag for exhaustive pattern matching.
 */
export type ApiError =
  | { readonly _tag: 'NetworkError'; readonly message: string; readonly cause?: Error }
  | { readonly _tag: 'ValidationError'; readonly errors: z.ZodError }
  | { readonly _tag: 'AuthError'; readonly message: string; readonly statusCode: 401 | 403 }
  | { readonly _tag: 'RateLimitError'; readonly retryAfterMs: number }
  | { readonly _tag: 'NotFoundError'; readonly resource: string; readonly id: string }
  | { readonly _tag: 'ConflictError'; readonly message: string; readonly conflictingResource?: string }
  | { readonly _tag: 'ServerError'; readonly statusCode: number; readonly message: string };

/**
 * Type guard for NetworkError.
 */
export const isNetworkError = (e: ApiError): e is Extract<ApiError, { _tag: 'NetworkError' }> => {
  return e._tag === 'NetworkError';
};

/**
 * Type guard for ValidationError.
 */
export const isValidationError = (e: ApiError): e is Extract<ApiError, { _tag: 'ValidationError' }> => {
  return e._tag === 'ValidationError';
};

/**
 * Type guard for AuthError.
 */
export const isAuthError = (e: ApiError): e is Extract<ApiError, { _tag: 'AuthError' }> => {
  return e._tag === 'AuthError';
};

/**
 * Type guard for RateLimitError.
 */
export const isRateLimitError = (e: ApiError): e is Extract<ApiError, { _tag: 'RateLimitError' }> => {
  return e._tag === 'RateLimitError';
};

/**
 * Type guard for NotFoundError.
 */
export const isNotFoundError = (e: ApiError): e is Extract<ApiError, { _tag: 'NotFoundError' }> => {
  return e._tag === 'NotFoundError';
};

/**
 * Type guard for ConflictError.
 */
export const isConflictError = (e: ApiError): e is Extract<ApiError, { _tag: 'ConflictError' }> => {
  return e._tag === 'ConflictError';
};

/**
 * Type guard for ServerError.
 */
export const isServerError = (e: ApiError): e is Extract<ApiError, { _tag: 'ServerError' }> => {
  return e._tag === 'ServerError';
};

/**
 * Constructor for NetworkError.
 */
export const networkError = (message: string, cause?: Error): ApiError => {
  if (cause === undefined) {
    return { _tag: 'NetworkError', message };
  }
  return { _tag: 'NetworkError', message, cause };
};

/**
 * Constructor for ValidationError.
 */
export const validationError = (errors: z.ZodError): ApiError => {
  return { _tag: 'ValidationError', errors };
};

/**
 * Constructor for AuthError.
 */
export const authError = (message: string, statusCode: 401 | 403): ApiError => {
  return { _tag: 'AuthError', message, statusCode };
};

/**
 * Constructor for RateLimitError.
 */
export const rateLimitError = (retryAfterMs: number): ApiError => {
  return { _tag: 'RateLimitError', retryAfterMs };
};

/**
 * Constructor for NotFoundError.
 */
export const notFoundError = (resource: string, id: string): ApiError => {
  return { _tag: 'NotFoundError', resource, id };
};

/**
 * Constructor for ConflictError.
 */
export const conflictError = (message: string, conflictingResource?: string): ApiError => {
  if (conflictingResource === undefined) {
    return { _tag: 'ConflictError', message };
  }
  return { _tag: 'ConflictError', message, conflictingResource };
};

/**
 * Constructor for ServerError.
 */
export const serverError = (statusCode: number, message: string): ApiError => {
  return { _tag: 'ServerError', statusCode, message };
};

/**
 * Format an ApiError into a human-readable string.
 * Uses pattern matching on the discriminated union.
 */
export const formatApiError = (error: ApiError): string => {
  switch (error._tag) {
    case 'NetworkError':
      return error.cause
        ? `Network Error: ${error.message} (Cause: ${error.cause.message})`
        : `Network Error: ${error.message}`;

    case 'ValidationError': {
      const issueCount = error.errors.issues.length;
      if (issueCount === 1) {
        const issue = error.errors.issues[0];
        return `Validation Error: ${issue?.message ?? 'Unknown validation error'}`;
      }
      return `Validation Error (${issueCount} issues): ${error.errors.issues.map(i => i.message).join(', ')}`;
    }

    case 'AuthError':
      return `Auth Error (${error.statusCode}): ${error.message}`;

    case 'RateLimitError':
      return `Rate Limit Error: Retry after ${error.retryAfterMs}ms`;

    case 'NotFoundError':
      return `Not Found Error: ${error.resource} with id ${error.id} not found`;

    case 'ConflictError':
      return error.conflictingResource
        ? `Conflict Error: ${error.message} (Conflicting: ${error.conflictingResource})`
        : `Conflict Error: ${error.message}`;

    case 'ServerError':
      return `Server Error (${error.statusCode}): ${error.message}`;

    default:
      // Exhaustiveness check: TypeScript will error if a case is missing
      const _exhaustive: never = error;
      return `Unknown Error: ${JSON.stringify(_exhaustive)}`;
  }
};
