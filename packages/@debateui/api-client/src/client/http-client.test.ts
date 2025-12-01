import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHttpClient } from './http-client';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import { pipe } from 'fp-ts/function';
import type { HTTPError, TimeoutError } from 'ky';

// Mock ky
vi.mock('ky', () => {
  const mockKy = {
    create: vi.fn(),
    extend: vi.fn(),
  };
  return {
    default: mockKy,
  };
});

// Import mocked ky
import ky from 'ky';

interface TestResponse {
  id: string;
  name: string;
}

interface CreateRequest {
  name: string;
  value: number;
}

describe('HttpClient', () => {
  let mockKyInstance: any;

  beforeEach(() => {
    mockKyInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      extend: vi.fn(),
    };
    (ky.create as any).mockReturnValue(mockKyInstance);
    mockKyInstance.extend.mockReturnValue(mockKyInstance);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createHttpClient', () => {
    it('should create a client with baseUrl', () => {
      createHttpClient('https://api.example.com');
      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          prefixUrl: 'https://api.example.com',
        })
      );
    });

    it('should apply custom timeout configuration', () => {
      createHttpClient('https://api.example.com', { timeout: 10000 });
      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 10000,
        })
      );
    });

    it('should use default timeout when not specified', () => {
      createHttpClient('https://api.example.com');
      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000, // 30 second default
        })
      );
    });

    it('should apply custom headers', () => {
      createHttpClient('https://api.example.com', {
        headers: {
          'X-Custom-Header': 'value',
        },
      });
      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'value',
          }),
        })
      );
    });
  });

  describe('GET requests', () => {
    it('should return Right with data on successful GET request', async () => {
      const mockData: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(mockKyInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.any(String),
          }),
        })
      );
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockData);
      }
    });

    it('should pass query parameters in GET request', async () => {
      const mockData: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const client = createHttpClient('https://api.example.com');
      await client.get<TestResponse>('/test', {
        searchParams: { filter: 'active', limit: '10' },
      })();

      expect(mockKyInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          searchParams: { filter: 'active', limit: '10' },
        })
      );
    });
  });

  describe('POST requests', () => {
    it('should return Right with data on successful POST request', async () => {
      const mockRequest: CreateRequest = { name: 'test', value: 42 };
      const mockResponse: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.post.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = createHttpClient('https://api.example.com');
      const result = await client.post<TestResponse>('/test', mockRequest)();

      expect(mockKyInstance.post).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          json: mockRequest,
          headers: expect.objectContaining({
            'X-Request-ID': expect.any(String),
          }),
        })
      );
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockResponse);
      }
    });

    it('should handle POST request without body', async () => {
      const mockResponse: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.post.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = createHttpClient('https://api.example.com');
      const result = await client.post<TestResponse>('/test')();

      expect(mockKyInstance.post).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          json: undefined,
        })
      );
      expect(E.isRight(result)).toBe(true);
    });
  });

  describe('PUT requests', () => {
    it('should return Right with data on successful PUT request', async () => {
      const mockRequest: CreateRequest = { name: 'updated', value: 99 };
      const mockResponse: TestResponse = { id: '123', name: 'updated' };
      mockKyInstance.put.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = createHttpClient('https://api.example.com');
      const result = await client.put<TestResponse>('/test/123', mockRequest)();

      expect(mockKyInstance.put).toHaveBeenCalledWith(
        '/test/123',
        expect.objectContaining({
          json: mockRequest,
          headers: expect.objectContaining({
            'X-Request-ID': expect.any(String),
          }),
        })
      );
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockResponse);
      }
    });
  });

  describe('DELETE requests', () => {
    it('should return Right with data on successful DELETE request', async () => {
      const mockResponse = { success: true };
      mockKyInstance.delete.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockResponse),
      });

      const client = createHttpClient('https://api.example.com');
      const result = await client.delete<{ success: boolean }>('/test/123')();

      expect(mockKyInstance.delete).toHaveBeenCalledWith(
        '/test/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': expect.any(String),
          }),
        })
      );
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toEqual(mockResponse);
      }
    });
  });

  describe('Error handling - Network errors', () => {
    it('should return Left with NetworkError on network failure', async () => {
      const networkError = new TypeError('Failed to fetch');
      mockKyInstance.get.mockRejectedValue(networkError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NetworkError');
        if ('message' in result.left) {
          expect(result.left.message).toContain('Network request failed');
        }
        if ('cause' in result.left) {
          expect(result.left.cause).toBe(networkError);
        }
      }
    });

    it('should return Left with NetworkError on timeout', async () => {
      const timeoutError: Partial<TimeoutError> = {
        name: 'TimeoutError',
        message: 'Request timed out',
      };
      mockKyInstance.get.mockRejectedValue(timeoutError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NetworkError');
        if ('message' in result.left) {
          expect(result.left.message).toContain('Request timed out');
        }
      }
    });
  });

  describe('Error handling - 4xx errors', () => {
    it('should return Left with ValidationError on 400 Bad Request', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 400,
          statusText: 'Bad Request',
          json: vi.fn().mockResolvedValue({
            message: 'Invalid input',
            errors: [{ field: 'name', message: 'Required' }],
          }),
        } as any,
      };
      mockKyInstance.post.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.post<TestResponse>('/test', { name: '' })();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ValidationError');
        if ('errors' in result.left) {
          expect(result.left.errors.issues[0]?.message).toContain('Invalid input');
        }
      }
    });

    it('should return Left with AuthError on 401 Unauthorized', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 401,
          statusText: 'Unauthorized',
          json: vi.fn().mockResolvedValue({
            message: 'Invalid credentials',
          }),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('AuthError');
        if ('statusCode' in result.left) {
          expect(result.left.statusCode).toBe(401);
        }
      }
    });

    it('should return Left with NotFoundError on 404 Not Found', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 404,
          statusText: 'Not Found',
          json: vi.fn().mockResolvedValue({
            message: 'Resource not found',
          }),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test/999')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
        if ('resource' in result.left) {
          expect(result.left.resource).toBeTruthy();
        }
      }
    });

    it('should return Left with ConflictError on 409 Conflict', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 409,
          statusText: 'Conflict',
          json: vi.fn().mockResolvedValue({
            message: 'Resource already exists',
          }),
        } as any,
      };
      mockKyInstance.post.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.post<TestResponse>('/test', { name: 'duplicate' })();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ConflictError');
        if ('message' in result.left) {
          expect(result.left.message).toContain('Resource already exists');
        }
      }
    });

    it('should return Left with RateLimitError on 429 Too Many Requests', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            get: vi.fn((header: string) => {
              if (header === 'Retry-After') return '60';
              return null;
            }),
          } as any,
          json: vi.fn().mockResolvedValue({
            message: 'Rate limit exceeded',
          }),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('RateLimitError');
        if ('retryAfterMs' in result.left) {
          expect(result.left.retryAfterMs).toBe(60000); // 60 seconds in ms
        }
      }
    });

    it('should handle RateLimitError without Retry-After header', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            get: vi.fn().mockReturnValue(null),
          } as any,
          json: vi.fn().mockResolvedValue({
            message: 'Rate limit exceeded',
          }),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('RateLimitError');
        if ('retryAfterMs' in result.left) {
          expect(result.left.retryAfterMs).toBe(60000); // Default 60s
        }
      }
    });
  });

  describe('Error handling - 5xx errors', () => {
    it('should return Left with ServerError on 500 Internal Server Error', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          json: vi.fn().mockResolvedValue({
            message: 'Server error',
          }),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ServerError');
        if ('statusCode' in result.left) {
          expect(result.left.statusCode).toBe(500);
        }
      }
    });

    it('should return Left with ServerError on 503 Service Unavailable', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 503,
          statusText: 'Service Unavailable',
          json: vi.fn().mockResolvedValue({
            message: 'Service temporarily unavailable',
          }),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ServerError');
        if ('statusCode' in result.left) {
          expect(result.left.statusCode).toBe(503);
        }
      }
    });
  });

  describe('Error handling - Response parsing', () => {
    it('should handle error response without JSON body', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 404,
          statusText: 'Not Found',
          json: vi.fn().mockRejectedValue(new Error('No JSON body')),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NotFoundError');
      }
    });

    it('should use statusText when response JSON parsing fails', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 400,
          statusText: 'Bad Request',
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('ValidationError');
        if ('errors' in result.left) {
          expect(result.left.errors.issues[0]?.message).toBe('Bad Request');
        }
      }
    });
  });

  describe('Request interceptors', () => {
    it('should apply request interceptor', async () => {
      const mockData: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const client = createHttpClient('https://api.example.com', {
        hooks: {
          beforeRequest: [
            (request: Request) => {
              request.headers.set('X-Custom-Auth', 'Bearer token123');
            },
          ],
        },
      });

      await client.get<TestResponse>('/test')();

      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hooks: expect.objectContaining({
            beforeRequest: expect.any(Array),
          }),
        })
      );
    });

    it('should apply response interceptor', async () => {
      const mockData: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const afterResponseHook = vi.fn();
      const client = createHttpClient('https://api.example.com', {
        hooks: {
          afterResponse: [afterResponseHook as any],
        },
      });

      await client.get<TestResponse>('/test')();

      expect(ky.create).toHaveBeenCalledWith(
        expect.objectContaining({
          hooks: expect.objectContaining({
            afterResponse: expect.arrayContaining([afterResponseHook]),
          }),
        })
      );
    });
  });

  describe('Request ID generation', () => {
    it('should generate unique request IDs for each request', async () => {
      const mockData: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const client = createHttpClient('https://api.example.com');

      await client.get<TestResponse>('/test1')();
      await client.get<TestResponse>('/test2')();

      const calls = mockKyInstance.get.mock.calls;
      const requestId1 = calls[0][1].headers['X-Request-ID'];
      const requestId2 = calls[1][1].headers['X-Request-ID'];

      expect(requestId1).toBeTruthy();
      expect(requestId2).toBeTruthy();
      expect(requestId1).not.toBe(requestId2);
    });

    it('should allow overriding request ID', async () => {
      const mockData: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const client = createHttpClient('https://api.example.com');
      const customRequestId = 'custom-id-123';

      await client.get<TestResponse>('/test', {
        headers: { 'X-Request-ID': customRequestId },
      })();

      expect(mockKyInstance.get).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Request-ID': customRequestId,
          }),
        })
      );
    });
  });

  describe('FP-style composition', () => {
    it('should compose with fp-ts operators', async () => {
      const mockData: TestResponse = { id: '123', name: 'test' };
      mockKyInstance.get.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
      });

      const client = createHttpClient('https://api.example.com');

      const result = await pipe(
        client.get<TestResponse>('/test'),
        TE.map((data) => data.name),
        TE.map((name) => name.toUpperCase())
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right).toBe('TEST');
      }
    });

    it('should handle errors in composed pipeline', async () => {
      const httpError: Partial<HTTPError> = {
        name: 'HTTPError',
        response: {
          status: 404,
          statusText: 'Not Found',
          json: vi.fn().mockResolvedValue({
            message: 'Not found',
          }),
        } as any,
      };
      mockKyInstance.get.mockRejectedValue(httpError);

      const client = createHttpClient('https://api.example.com');

      const result = await pipe(
        client.get<TestResponse>('/test'),
        TE.map((data) => data.name),
        TE.mapLeft((error) => ({
          ...error,
          message: `Failed: ${('message' in error ? error.message : 'Unknown error')}`,
        }))
      )();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        if ('message' in result.left) {
          expect(result.left.message).toContain('Failed:');
        }
      }
    });
  });

  describe('Generic unknown errors', () => {
    it('should handle unknown error types', async () => {
      const unknownError = { foo: 'bar', weird: 'error' };
      mockKyInstance.get.mockRejectedValue(unknownError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NetworkError');
        if ('message' in result.left) {
          expect(result.left.message).toContain('An unexpected error occurred');
        }
      }
    });

    it('should handle errors without message property', async () => {
      const unknownError = new Error();
      delete (unknownError as any).message;
      mockKyInstance.get.mockRejectedValue(unknownError);

      const client = createHttpClient('https://api.example.com');
      const result = await client.get<TestResponse>('/test')();

      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left._tag).toBe('NetworkError');
        if ('message' in result.left) {
          expect(result.left.message).toBeTruthy();
        }
      }
    });
  });
});
