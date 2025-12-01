import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  type ApiError,
  isNetworkError,
  isValidationError,
  isAuthError,
  isRateLimitError,
  isNotFoundError,
  isConflictError,
  isServerError,
  networkError,
  validationError,
  authError,
  rateLimitError,
  notFoundError,
  conflictError,
  serverError,
  formatApiError,
} from './errors.js';

describe('errors.ts - Type Guards', () => {
  it('isNetworkError identifies NetworkError', () => {
    const error: ApiError = networkError('Connection failed');
    expect(isNetworkError(error)).toBe(true);
    expect(isValidationError(error)).toBe(false);
    expect(isAuthError(error)).toBe(false);
  });

  it('isValidationError identifies ValidationError', () => {
    const zodError = z.string().safeParse(123).error!;
    const error: ApiError = validationError(zodError);
    expect(isValidationError(error)).toBe(true);
    expect(isNetworkError(error)).toBe(false);
  });

  it('isAuthError identifies AuthError', () => {
    const error: ApiError = authError('Unauthorized', 401);
    expect(isAuthError(error)).toBe(true);
    expect(isNetworkError(error)).toBe(false);
  });

  it('isRateLimitError identifies RateLimitError', () => {
    const error: ApiError = rateLimitError(5000);
    expect(isRateLimitError(error)).toBe(true);
    expect(isAuthError(error)).toBe(false);
  });

  it('isNotFoundError identifies NotFoundError', () => {
    const error: ApiError = notFoundError('debate', '123');
    expect(isNotFoundError(error)).toBe(true);
    expect(isConflictError(error)).toBe(false);
  });

  it('isConflictError identifies ConflictError', () => {
    const error: ApiError = conflictError('Resource already exists');
    expect(isConflictError(error)).toBe(true);
    expect(isNotFoundError(error)).toBe(false);
  });

  it('isServerError identifies ServerError', () => {
    const error: ApiError = serverError(500, 'Internal server error');
    expect(isServerError(error)).toBe(true);
    expect(isNetworkError(error)).toBe(false);
  });
});

describe('errors.ts - Error Constructors', () => {
  it('networkError creates NetworkError without cause', () => {
    const error = networkError('Connection timeout');
    expect(error._tag).toBe('NetworkError');
    if (isNetworkError(error)) {
      expect(error.message).toBe('Connection timeout');
      expect(error.cause).toBeUndefined();
    }
  });

  it('networkError creates NetworkError with cause', () => {
    const cause = new Error('Socket closed');
    const error = networkError('Connection failed', cause);
    expect(error._tag).toBe('NetworkError');
    if (isNetworkError(error)) {
      expect(error.message).toBe('Connection failed');
      expect(error.cause).toBe(cause);
    }
  });

  it('validationError creates ValidationError', () => {
    const zodError = z.string().safeParse(123).error!;
    const error = validationError(zodError);
    expect(error._tag).toBe('ValidationError');
    if (isValidationError(error)) {
      expect(error.errors).toBe(zodError);
    }
  });

  it('authError creates AuthError with 401', () => {
    const error = authError('Invalid token', 401);
    expect(error._tag).toBe('AuthError');
    if (isAuthError(error)) {
      expect(error.message).toBe('Invalid token');
      expect(error.statusCode).toBe(401);
    }
  });

  it('authError creates AuthError with 403', () => {
    const error = authError('Forbidden resource', 403);
    expect(error._tag).toBe('AuthError');
    if (isAuthError(error)) {
      expect(error.message).toBe('Forbidden resource');
      expect(error.statusCode).toBe(403);
    }
  });

  it('rateLimitError creates RateLimitError', () => {
    const error = rateLimitError(3000);
    expect(error._tag).toBe('RateLimitError');
    if (isRateLimitError(error)) {
      expect(error.retryAfterMs).toBe(3000);
    }
  });

  it('notFoundError creates NotFoundError', () => {
    const error = notFoundError('user', 'abc-123');
    expect(error._tag).toBe('NotFoundError');
    if (isNotFoundError(error)) {
      expect(error.resource).toBe('user');
      expect(error.id).toBe('abc-123');
    }
  });

  it('conflictError creates ConflictError without conflicting resource', () => {
    const error = conflictError('Debate already started');
    expect(error._tag).toBe('ConflictError');
    if (isConflictError(error)) {
      expect(error.message).toBe('Debate already started');
      expect(error.conflictingResource).toBeUndefined();
    }
  });

  it('conflictError creates ConflictError with conflicting resource', () => {
    const error = conflictError('Branch name taken', 'branch-main');
    expect(error._tag).toBe('ConflictError');
    if (isConflictError(error)) {
      expect(error.message).toBe('Branch name taken');
      expect(error.conflictingResource).toBe('branch-main');
    }
  });

  it('serverError creates ServerError', () => {
    const error = serverError(503, 'Service unavailable');
    expect(error._tag).toBe('ServerError');
    if (isServerError(error)) {
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service unavailable');
    }
  });
});

describe('errors.ts - formatApiError', () => {
  it('formats NetworkError without cause', () => {
    const error = networkError('Connection timeout');
    const formatted = formatApiError(error);
    expect(formatted).toBe('Network Error: Connection timeout');
  });

  it('formats NetworkError with cause', () => {
    const cause = new Error('ECONNREFUSED');
    const error = networkError('Failed to connect', cause);
    const formatted = formatApiError(error);
    expect(formatted).toBe('Network Error: Failed to connect (Cause: ECONNREFUSED)');
  });

  it('formats ValidationError with single issue', () => {
    const zodError = z.string().safeParse(123).error!;
    const error = validationError(zodError);
    const formatted = formatApiError(error);
    expect(formatted).toContain('Validation Error');
    expect(formatted).toContain('Expected string, received number');
  });

  it('formats ValidationError with multiple issues', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const zodError = schema.safeParse({ name: 123, age: 'invalid' }).error!;
    const error = validationError(zodError);
    const formatted = formatApiError(error);
    expect(formatted).toContain('Validation Error (2 issues)');
  });

  it('formats AuthError', () => {
    const error = authError('Missing authentication token', 401);
    const formatted = formatApiError(error);
    expect(formatted).toBe('Auth Error (401): Missing authentication token');
  });

  it('formats RateLimitError', () => {
    const error = rateLimitError(5000);
    const formatted = formatApiError(error);
    expect(formatted).toBe('Rate Limit Error: Retry after 5000ms');
  });

  it('formats NotFoundError', () => {
    const error = notFoundError('debate', 'deb-123');
    const formatted = formatApiError(error);
    expect(formatted).toBe('Not Found Error: debate with id deb-123 not found');
  });

  it('formats ConflictError without conflicting resource', () => {
    const error = conflictError('Resource already exists');
    const formatted = formatApiError(error);
    expect(formatted).toBe('Conflict Error: Resource already exists');
  });

  it('formats ConflictError with conflicting resource', () => {
    const error = conflictError('Branch name taken', 'branch-123');
    const formatted = formatApiError(error);
    expect(formatted).toBe('Conflict Error: Branch name taken (Conflicting: branch-123)');
  });

  it('formats ServerError', () => {
    const error = serverError(500, 'Database connection failed');
    const formatted = formatApiError(error);
    expect(formatted).toBe('Server Error (500): Database connection failed');
  });
});

describe('errors.ts - Type Safety', () => {
  it('type guards enable exhaustive pattern matching', () => {
    const error: ApiError = networkError('test');

    let handled = false;
    if (isNetworkError(error)) {
      // TypeScript should narrow the type here
      const message: string = error.message;
      handled = true;
      expect(message).toBe('test');
    }

    expect(handled).toBe(true);
  });

  it('discriminated union allows switch-case exhaustiveness', () => {
    const errors: ApiError[] = [
      networkError('net'),
      validationError(z.string().safeParse(1).error!),
      authError('auth', 401),
      rateLimitError(1000),
      notFoundError('res', 'id'),
      conflictError('conflict'),
      serverError(500, 'server'),
    ];

    errors.forEach(error => {
      let handled = false;
      switch (error._tag) {
        case 'NetworkError':
          handled = true;
          break;
        case 'ValidationError':
          handled = true;
          break;
        case 'AuthError':
          handled = true;
          break;
        case 'RateLimitError':
          handled = true;
          break;
        case 'NotFoundError':
          handled = true;
          break;
        case 'ConflictError':
          handled = true;
          break;
        case 'ServerError':
          handled = true;
          break;
        default:
          // TypeScript should error here if case is missing
          const _exhaustive: never = error;
          void _exhaustive;
          break;
      }
      expect(handled).toBe(true);
    });
  });
});
