import { useEffect, useState, useRef } from 'react';
import { useDebateStore } from '@debateui/state';
import {
  createSSEClient,
  isTurnEvent,
  isConsensusEvent,
  isErrorEvent,
  isCompleteEvent,
  type SSEClient,
} from '@debateui/api-client';
import { networkError, formatApiError, type ApiError } from '@debateui/core';
import * as E from 'fp-ts/Either';

/**
 * Get error message from ApiError union type
 */
const getErrorMessage = (error: ApiError): string => {
  return formatApiError(error);
};

/**
 * Connection status for the debate stream
 */
export type StreamStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Return type for useDebateStream hook
 */
export interface UseDebateStreamReturn {
  status: StreamStatus;
  error: string | null;
}

/**
 * React hook for consuming real-time debate updates via Server-Sent Events (SSE).
 *
 * This hook:
 * - Automatically connects when a debate is running
 * - Dispatches turn updates to the store via `receiveTurn`
 * - Handles consensus completion via `completeDebate`
 * - Handles errors via `setError`
 * - Auto-reconnects on recoverable errors
 * - Cleans up connection on unmount
 *
 * @param baseUrl - Base URL of the API server (e.g., 'http://localhost:3000')
 * @returns Object containing connection status and error state
 *
 * @example
 * ```tsx
 * function DebateView() {
 *   const { status, error } = useDebateStream('http://localhost:3000');
 *
 *   return (
 *     <div>
 *       <div>Connection: {status}</div>
 *       {error && <div>Error: {error}</div>}
 *     </div>
 *   );
 * }
 * ```
 */
export const useDebateStream = (baseUrl: string): UseDebateStreamReturn => {
  const [status, setStatus] = useState<StreamStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // Store actions
  const receiveTurn = useDebateStore((state) => state.receiveTurn);
  const completeDebate = useDebateStore((state) => state.completeDebate);
  const setStoreError = useDebateStore((state) => state.setError);

  // Get debate state
  const debate = useDebateStore((state) => state.debate);

  // Track SSE client instance
  const clientRef = useRef<SSEClient | null>(null);

  // Check if debate is running
  const isDebateRunning = debate._tag === 'Running';
  const debateId = debate._tag === 'Running' ? debate.debateId : null;

  useEffect(() => {
    // Only connect if debate is running
    if (!isDebateRunning || !debateId) {
      // Cleanup existing connection if debate stopped
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
        setStatus('disconnected');
      }
      return;
    }

    // Set connecting status
    setStatus('connecting');
    setError(null);

    // Create SSE client
    const connectToStream = async () => {
      try {
        const result = await createSSEClient(
          debateId,
          baseUrl,
          (event) => {
            // Handle different event types
            if (isTurnEvent(event)) {
              // Dispatch turn to store
              receiveTurn(event.data);
            } else if (isConsensusEvent(event)) {
              // Complete debate with consensus
              completeDebate(event.data);
            } else if (isErrorEvent(event)) {
              // Handle error events
              const apiError = networkError(event.data.message);
              setStoreError(apiError, event.data.recoverable);

              if (event.data.recoverable) {
                setStatus('reconnecting');
              } else {
                setStatus('error');
                setError(event.data.message);
              }
            } else if (isCompleteEvent(event)) {
              // Debate completed, close connection
              if (clientRef.current) {
                clientRef.current.close();
                clientRef.current = null;
                setStatus('disconnected');
              }
            }
          },
          {
            maxRetries: 5,
            initialRetryDelay: 1000,
            maxRetryDelay: 30000,
          }
        )();

        if (E.isRight(result)) {
          clientRef.current = result.right;
          setStatus('connected');
        } else {
          // Connection failed
          const errorMsg = getErrorMessage(result.left);
          setError(errorMsg);
          setStatus('error');
          setStoreError(result.left, false);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMsg);
        setStatus('error');
        setStoreError(networkError(errorMsg), false);
      }
    };

    connectToStream();

    // Cleanup on unmount or when debate changes
    return () => {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [
    isDebateRunning,
    debateId,
    baseUrl,
    receiveTurn,
    completeDebate,
    setStoreError,
  ]);

  return {
    status,
    error,
  };
};
