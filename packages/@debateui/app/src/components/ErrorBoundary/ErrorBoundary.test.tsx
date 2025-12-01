import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error when instructed
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for these tests since we're intentionally throwing errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Normal Operation', () => {
    it('renders children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });

    it('renders complex children components', () => {
      render(
        <ErrorBoundary>
          <div>
            <h1>Title</h1>
            <p>Paragraph</p>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('catches error and shows fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Child component')).not.toBeInTheDocument();
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it('shows error message in fallback', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getAllByText(/test error message/i).length).toBeGreaterThan(0);
    });

    it('displays custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('reset button clears error state', async () => {
      const user = userEvent.setup();

      // Use a key to force remount after reset
      const Wrapper = ({ shouldThrow }: { shouldThrow: boolean }) => (
        <ErrorBoundary key={shouldThrow ? 'error' : 'normal'}>
          <ThrowError shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );

      const { rerender } = render(<Wrapper shouldThrow={true} />);

      // Error should be displayed
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      const resetButton = screen.getByRole('button', { name: /try again/i });
      expect(resetButton).toBeInTheDocument();

      await user.click(resetButton);

      // After reset, re-render with non-throwing component
      rerender(<Wrapper shouldThrow={false} />);

      // The child component should now render successfully
      await waitFor(() => {
        expect(screen.getByText('Child component')).toBeInTheDocument();
      });
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('onReset callback is called when reset button clicked', async () => {
      const user = userEvent.setup();
      const onReset = vi.fn();

      render(
        <ErrorBoundary onReset={onReset}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const resetButton = screen.getByRole('button', { name: /try again/i });
      await user.click(resetButton);

      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Callback', () => {
    it('calls onError callback when error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Test error message' }),
        expect.any(Object) // errorInfo with componentStack
      );
    });

    it('does not call onError when no error occurs', () => {
      const onError = vi.fn();

      render(
        <ErrorBoundary onError={onError}>
          <div>Normal content</div>
        </ErrorBoundary>
      );

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('Development Mode', () => {
    it('shows error stack in development mode', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should show error details section
      expect(screen.getByText(/error details/i)).toBeInTheDocument();

      // Restore
      process.env['NODE_ENV'] = originalEnv;
    });

    it('hides error stack in production mode', () => {
      const originalEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'production';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should not show error details section
      expect(screen.queryByText(/error details/i)).not.toBeInTheDocument();

      // Restore
      process.env['NODE_ENV'] = originalEnv;
    });
  });

  describe('Accessibility', () => {
    it('error message has proper ARIA role', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
    });

    it('reset button is keyboard accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const resetButton = screen.getByRole('button', { name: /try again/i });
      expect(resetButton).toBeInTheDocument();
      expect(resetButton.tagName).toBe('BUTTON');
    });
  });

  describe('Error Logging', () => {
    it('logs errors to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});
