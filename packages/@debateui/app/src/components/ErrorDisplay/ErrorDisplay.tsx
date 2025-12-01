import { useEffect, useState } from 'react';
import type { ApiError } from '@debateui/core';

export interface ErrorDisplayProps {
  error: ApiError;
  onRetry?: () => void;
}

/**
 * ErrorDisplay renders API errors with appropriate UI for each error type.
 *
 * Features:
 * - Type-specific error messages and icons
 * - Retry functionality for recoverable errors
 * - Auto-retry countdown for rate limit errors
 * - Validation error field lists
 * - Accessible error messaging
 *
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error={networkError('Connection failed')}
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export const ErrorDisplay = ({ error, onRetry }: ErrorDisplayProps) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  // Handle rate limit countdown
  useEffect(() => {
    if (error._tag !== 'RateLimitError') {
      return;
    }

    const seconds = Math.ceil(error.retryAfterMs / 1000);
    setCountdown(seconds);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Auto-retry when countdown completes
          if (onRetry) {
            onRetry();
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [error, onRetry]);

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Determine if error is recoverable (should show retry button)
  const isRecoverable = (err: ApiError): boolean => {
    return (
      err._tag === 'NetworkError' ||
      err._tag === 'ServerError' ||
      err._tag === 'ConflictError' ||
      err._tag === 'RateLimitError'
    );
  };

  // Render error icon based on type
  const renderIcon = () => {
    const iconClass = 'w-6 h-6';

    switch (error._tag) {
      case 'NetworkError':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
            />
          </svg>
        );

      case 'AuthError':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        );

      case 'NotFoundError':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H9"
            />
          </svg>
        );

      case 'ValidationError':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        );

      case 'RateLimitError':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );

      case 'ConflictError':
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        );

      case 'ServerError':
      default:
        return (
          <svg
            className={iconClass}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  // Render error content based on type
  const renderContent = () => {
    switch (error._tag) {
      case 'NetworkError':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Network Error</h3>
            <p className="mt-2 text-sm text-gray-600">{error.message}</p>
            {error.cause && (
              <p className="mt-1 text-xs text-gray-500">
                Cause: {error.cause.message}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              Please check your internet connection and try again.
            </p>
          </div>
        );

      case 'ValidationError':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Validation Error</h3>
            <p className="mt-2 text-sm text-gray-600">
              Please correct the following errors:
            </p>
            <ul className="mt-3 space-y-1 list-disc list-inside text-sm text-gray-600">
              {error.errors.issues.map((issue, index) => (
                <li key={index}>
                  {issue.path.length > 0 && (
                    <span className="font-medium">{issue.path.join('.')}: </span>
                  )}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'AuthError':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {error.statusCode === 401
                ? 'Authentication Required'
                : 'Access Denied'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">{error.message}</p>
            <p className="mt-1 text-xs text-gray-500">Status Code: {error.statusCode}</p>
            <p className="mt-2 text-sm text-gray-500">
              {error.statusCode === 401
                ? 'Please log in to continue.'
                : "You don't have permission to access this resource."}
            </p>
          </div>
        );

      case 'NotFoundError':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Not Found</h3>
            <p className="mt-2 text-sm text-gray-600">
              {error.resource} with ID{' '}
              <code className="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono">
                {error.id}
              </code>{' '}
              could not be found.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              The resource may have been deleted or the ID may be incorrect.
            </p>
          </div>
        );

      case 'ConflictError':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Conflict</h3>
            <p className="mt-2 text-sm text-gray-600">{error.message}</p>
            {error.conflictingResource && (
              <p className="mt-1 text-xs text-gray-500">
                Conflicting resource:{' '}
                <code className="px-1 py-0.5 bg-gray-100 rounded font-mono">
                  {error.conflictingResource}
                </code>
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              The resource may have been modified by another process.
            </p>
          </div>
        );

      case 'RateLimitError':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Rate Limit Exceeded</h3>
            <p className="mt-2 text-sm text-gray-600">
              Too many requests. Please wait before trying again.
            </p>
            {countdown !== null && (
              <div className="mt-4 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{countdown}</div>
                  <div className="text-sm text-gray-500">seconds remaining</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'ServerError':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Server Error</h3>
            <p className="mt-2 text-sm text-gray-600">{error.message}</p>
            <p className="mt-1 text-xs text-gray-500">
              Status Code: {error.statusCode}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              An unexpected error occurred on the server. Please try again later.
            </p>
          </div>
        );

      default: {
        // Exhaustiveness check - ensures all error types are handled
        const exhaustiveCheck: never = error;
        void exhaustiveCheck;
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Unknown Error</h3>
            <p className="mt-2 text-sm text-gray-600">
              An unexpected error occurred.
            </p>
          </div>
        );
      }
    }
  };

  return (
    <div
      role="alert"
      className="max-w-md w-full bg-white rounded-lg shadow-md border border-gray-200 p-6"
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600">
          {renderIcon()}
        </div>
        <div className="flex-1 min-w-0">{renderContent()}</div>
      </div>

      {isRecoverable(error) && error._tag !== 'RateLimitError' && (
        <div className="mt-6">
          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};
