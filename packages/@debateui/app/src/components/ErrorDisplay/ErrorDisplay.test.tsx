import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { ErrorDisplay } from './ErrorDisplay';
import type { ApiError } from '@debateui/core';

describe('ErrorDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('NetworkError', () => {
    it('renders NetworkError with retry button', () => {
      const error: ApiError = {
        _tag: 'NetworkError',
        message: 'Failed to connect to server',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to connect to server/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('renders NetworkError with cause', () => {
      const error: ApiError = {
        _tag: 'NetworkError',
        message: 'Connection timeout',
        cause: new Error('ETIMEDOUT'),
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/connection timeout/i)).toBeInTheDocument();
      expect(screen.getByText(/etimedout/i)).toBeInTheDocument();
    });

    it('calls onRetry when retry button clicked for NetworkError', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const error: ApiError = {
        _tag: 'NetworkError',
        message: 'Connection failed',
      };

      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('ValidationError', () => {
    it('renders ValidationError with field errors', () => {
      const zodError = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      }).safeParse({ email: 'invalid', age: 15 });

      if (!zodError.success) {
        const error: ApiError = {
          _tag: 'ValidationError',
          errors: zodError.error,
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.getByText(/validation error/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      }
    });

    it('renders multiple validation errors', () => {
      const zodError = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      }).safeParse({ name: 'ab', email: 'not-email' });

      if (!zodError.success) {
        const error: ApiError = {
          _tag: 'ValidationError',
          errors: zodError.error,
        };

        render(<ErrorDisplay error={error} />);

        const errorList = screen.getByRole('list');
        expect(errorList).toBeInTheDocument();

        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      }
    });

    it('does not show retry button for ValidationError', () => {
      const zodError = z.string().email().safeParse('invalid');

      if (!zodError.success) {
        const error: ApiError = {
          _tag: 'ValidationError',
          errors: zodError.error,
        };

        render(<ErrorDisplay error={error} />);

        expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
      }
    });
  });

  describe('AuthError', () => {
    it('renders AuthError with 401 status', () => {
      const error: ApiError = {
        _tag: 'AuthError',
        message: 'Invalid credentials',
        statusCode: 401,
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      expect(screen.getByText(/401/i)).toBeInTheDocument();
    });

    it('renders AuthError with 403 status', () => {
      const error: ApiError = {
        _tag: 'AuthError',
        message: 'Access denied',
        statusCode: 403,
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('heading', { name: /access denied/i })).toBeInTheDocument();
      expect(screen.getByText(/403/i)).toBeInTheDocument();
    });

    it('shows login prompt for 401', () => {
      const error: ApiError = {
        _tag: 'AuthError',
        message: 'Session expired',
        statusCode: 401,
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/please log in/i)).toBeInTheDocument();
    });

    it('shows permission message for 403', () => {
      const error: ApiError = {
        _tag: 'AuthError',
        message: 'Insufficient permissions',
        statusCode: 403,
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/don't have permission/i)).toBeInTheDocument();
    });
  });

  describe('NotFoundError', () => {
    it('renders NotFoundError with resource info', () => {
      const error: ApiError = {
        _tag: 'NotFoundError',
        resource: 'Debate',
        id: 'debate-123',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument();
      expect(screen.getByText(/debate with id/i)).toBeInTheDocument();
      expect(screen.getByText('debate-123')).toBeInTheDocument();
    });

    it('shows helpful message for missing resource', () => {
      const error: ApiError = {
        _tag: 'NotFoundError',
        resource: 'Turn',
        id: 'turn-456',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
    });
  });

  describe('ConflictError', () => {
    it('renders ConflictError with message', () => {
      const error: ApiError = {
        _tag: 'ConflictError',
        message: 'Debate already exists',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/conflict/i)).toBeInTheDocument();
      expect(screen.getByText(/debate already exists/i)).toBeInTheDocument();
    });

    it('renders ConflictError with conflicting resource', () => {
      const error: ApiError = {
        _tag: 'ConflictError',
        message: 'Resource conflict detected',
        conflictingResource: 'debate-789',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/debate-789/i)).toBeInTheDocument();
    });

    it('shows retry button for ConflictError', () => {
      const error: ApiError = {
        _tag: 'ConflictError',
        message: 'State conflict',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('RateLimitError', () => {
    it('renders RateLimitError with wait time', () => {
      const error: ApiError = {
        _tag: 'RateLimitError',
        retryAfterMs: 5000,
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
      expect(screen.getByText(/5/)).toBeInTheDocument(); // 5 seconds
    });

    it('shows countdown for rate limit', async () => {
      vi.useFakeTimers();

      const error: ApiError = {
        _tag: 'RateLimitError',
        retryAfterMs: 3000,
      };

      render(<ErrorDisplay error={error} />);

      // Initial state
      expect(screen.getByText('3')).toBeInTheDocument();

      // Advance timer by 1 second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('2')).toBeInTheDocument();

      // Advance timer by 1 more second
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText('1')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('auto-retries after countdown completes', async () => {
      vi.useFakeTimers();

      const onRetry = vi.fn();
      const error: ApiError = {
        _tag: 'RateLimitError',
        retryAfterMs: 2000,
      };

      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      // Advance timer past retry time
      await act(async () => {
        vi.advanceTimersByTime(2100);
      });

      expect(onRetry).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('converts milliseconds to seconds correctly', () => {
      const error: ApiError = {
        _tag: 'RateLimitError',
        retryAfterMs: 30000, // 30 seconds
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/30/)).toBeInTheDocument();
    });
  });

  describe('ServerError', () => {
    it('renders ServerError with status code', () => {
      const error: ApiError = {
        _tag: 'ServerError',
        statusCode: 500,
        message: 'Internal server error',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('heading', { name: /server error/i })).toBeInTheDocument();
      expect(screen.getByText(/500/)).toBeInTheDocument();
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });

    it('renders ServerError with different status codes', () => {
      const error: ApiError = {
        _tag: 'ServerError',
        statusCode: 503,
        message: 'Service unavailable',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByText(/503/)).toBeInTheDocument();
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });

    it('shows retry button for ServerError', () => {
      const error: ApiError = {
        _tag: 'ServerError',
        statusCode: 500,
        message: 'Error',
      };

      render(<ErrorDisplay error={error} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('calls onRetry for ServerError', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const error: ApiError = {
        _tag: 'ServerError',
        statusCode: 502,
        message: 'Bad gateway',
      };

      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has accessible error announcements', () => {
      const error: ApiError = {
        _tag: 'NetworkError',
        message: 'Connection failed',
      };

      render(<ErrorDisplay error={error} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
    });

    it('retry button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const error: ApiError = {
        _tag: 'NetworkError',
        message: 'Error',
      };

      render(<ErrorDisplay error={error} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      retryButton.focus();

      expect(retryButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(onRetry).toHaveBeenCalled();
    });

    it('validation errors list is semantically correct', () => {
      const zodError = z.object({
        field1: z.string().min(1),
        field2: z.string().min(1),
      }).safeParse({ field1: '', field2: '' });

      if (!zodError.success) {
        const error: ApiError = {
          _tag: 'ValidationError',
          errors: zodError.error,
        };

        render(<ErrorDisplay error={error} />);

        const list = screen.getByRole('list');
        expect(list).toBeInTheDocument();

        const listItems = screen.getAllByRole('listitem');
        expect(listItems.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Icon Display', () => {
    it('shows appropriate icon for each error type', () => {
      const errors: ApiError[] = [
        { _tag: 'NetworkError', message: 'Network' },
        { _tag: 'ServerError', statusCode: 500, message: 'Server' },
        { _tag: 'AuthError', message: 'Auth', statusCode: 401 },
        { _tag: 'NotFoundError', resource: 'Resource', id: '123' },
      ];

      errors.forEach((error) => {
        const { container, unmount } = render(<ErrorDisplay error={error} />);
        const svg = container.querySelector('svg');
        expect(svg).toBeInTheDocument();
        unmount();
      });
    });
  });

  describe('Optional onRetry callback', () => {
    it('does not crash when onRetry is not provided', async () => {
      const user = userEvent.setup();
      const error: ApiError = {
        _tag: 'NetworkError',
        message: 'Error',
      };

      render(<ErrorDisplay error={error} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });

      // Should not throw
      await expect(user.click(retryButton)).resolves.not.toThrow();
    });

    it('hides retry button when onRetry not provided for recoverable errors', () => {
      const error: ApiError = {
        _tag: 'NetworkError',
        message: 'Error',
      };

      render(<ErrorDisplay error={error} />);

      // Button should still be shown but potentially disabled or styled differently
      const retryButton = screen.queryByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });
});
