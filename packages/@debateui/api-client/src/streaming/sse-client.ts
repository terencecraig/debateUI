import * as TE from 'fp-ts/TaskEither';
import { z } from 'zod';
import { TurnResponseSchema, ConsensusResultSchema, type TurnResponse, type ConsensusResult } from '@debateui/core';
import { networkError, type ApiError } from '@debateui/core';

/**
 * Stream event types that can be received from the SSE endpoint
 */
export type StreamEvent =
  | { type: 'turn'; data: TurnResponse }
  | { type: 'consensus'; data: ConsensusResult }
  | { type: 'error'; data: { message: string; recoverable: boolean } }
  | { type: 'complete'; data: { debateId: string } };

/**
 * Handler function for processing stream events
 */
export type StreamEventHandler = (event: StreamEvent) => void;

/**
 * SSE Client configuration options
 */
export interface SSEClientOptions {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
}

/**
 * SSE Client result containing EventSource and control functions
 */
export interface SSEClient {
  eventSource: EventSource;
  close: () => void;
  reconnect: () => void;
}

/**
 * Zod schemas for validating stream events
 */
const StreamEventErrorSchema = z.object({
  type: z.literal('error'),
  data: z.object({
    message: z.string(),
    recoverable: z.boolean(),
  }),
});

const StreamEventCompleteSchema = z.object({
  type: z.literal('complete'),
  data: z.object({
    debateId: z.string(),
  }),
});

const StreamEventTurnSchema = z.object({
  type: z.literal('turn'),
  data: TurnResponseSchema,
});

const StreamEventConsensusSchema = z.object({
  type: z.literal('consensus'),
  data: ConsensusResultSchema,
});

const StreamEventSchema = z.union([
  StreamEventTurnSchema,
  StreamEventConsensusSchema,
  StreamEventErrorSchema,
  StreamEventCompleteSchema,
]);

/**
 * Default SSE client options
 */
const DEFAULT_OPTIONS: Required<SSEClientOptions> = {
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
};

/**
 * Creates an SSE client for streaming debate updates in real-time.
 *
 * @param debateId - ID of the debate to stream
 * @param baseUrl - Base URL of the API server
 * @param onEvent - Handler function called for each event
 * @param options - Optional configuration for reconnection behavior
 * @returns TaskEither with SSEClient or ApiError
 *
 * @example
 * ```typescript
 * const result = await createSSEClient(
 *   'debate-123',
 *   'http://localhost:3000',
 *   (event) => {
 *     switch (event.type) {
 *       case 'turn':
 *         console.log('New turn:', event.data);
 *         break;
 *       case 'consensus':
 *         console.log('Consensus reached:', event.data);
 *         break;
 *     }
 *   }
 * )();
 *
 * if (E.isRight(result)) {
 *   const { close } = result.right;
 *   // Later...
 *   close();
 * }
 * ```
 */
export const createSSEClient = (
  debateId: string,
  baseUrl: string,
  onEvent: StreamEventHandler,
  options: SSEClientOptions = {}
): TE.TaskEither<ApiError, SSEClient> => {
  return TE.tryCatch(
    async () => {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      let retryCount = 0;
      let currentEventSource: EventSource | null = null;
      let reconnectTimer: NodeJS.Timeout | null = null;

      const streamUrl = `${baseUrl}/debates/${debateId}/stream`;

      /**
       * Calculate exponential backoff delay
       */
      const getRetryDelay = (): number => {
        const delay = opts.initialRetryDelay * Math.pow(2, retryCount);
        return Math.min(delay, opts.maxRetryDelay);
      };

      /**
       * Create and configure EventSource connection
       */
      const connect = (): EventSource => {
        const eventSource = new EventSource(streamUrl);

        eventSource.onmessage = (event: MessageEvent) => {
          try {
            // Parse JSON data
            const rawData = JSON.parse(event.data);

            // Validate with Zod schema
            const parseResult = StreamEventSchema.safeParse(rawData);

            if (parseResult.success) {
              // Reset retry count on successful message
              retryCount = 0;

              // Call handler with validated event
              onEvent(parseResult.data);
            } else {
              // Log validation error but don't crash
              console.error('Invalid stream event:', parseResult.error);
            }
          } catch (err) {
            // Log parse error but don't crash
            console.error('Failed to parse stream event:', err);
          }
        };

        eventSource.onerror = () => {
          // Connection lost or error occurred
          if (retryCount < opts.maxRetries) {
            retryCount++;
            const delay = getRetryDelay();

            console.log(`SSE connection lost. Retrying in ${delay}ms (attempt ${retryCount}/${opts.maxRetries})`);

            reconnectTimer = setTimeout(() => {
              if (currentEventSource) {
                currentEventSource.close();
              }
              currentEventSource = connect();
            }, delay);
          } else {
            console.error('SSE max retries exceeded');
            // Notify handler of unrecoverable error
            onEvent({
              type: 'error',
              data: {
                message: 'Maximum reconnection attempts exceeded',
                recoverable: false,
              },
            });
          }
        };

        return eventSource;
      };

      // Initial connection
      currentEventSource = connect();

      /**
       * Manually trigger reconnection
       */
      const reconnect = (): void => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        if (currentEventSource) {
          currentEventSource.close();
        }

        retryCount = 0;
        currentEventSource = connect();
      };

      /**
       * Close the connection and cleanup
       */
      const close = (): void => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }

        if (currentEventSource) {
          currentEventSource.close();
          currentEventSource = null;
        }
      };

      return {
        eventSource: currentEventSource,
        close,
        reconnect,
      };
    },
    (error) => {
      return networkError(`Failed to create SSE client: ${error}`);
    }
  );
};

/**
 * Type guard to check if event is a turn event
 */
export const isTurnEvent = (event: StreamEvent): event is { type: 'turn'; data: TurnResponse } => {
  return event.type === 'turn';
};

/**
 * Type guard to check if event is a consensus event
 */
export const isConsensusEvent = (event: StreamEvent): event is { type: 'consensus'; data: ConsensusResult } => {
  return event.type === 'consensus';
};

/**
 * Type guard to check if event is an error event
 */
export const isErrorEvent = (event: StreamEvent): event is { type: 'error'; data: { message: string; recoverable: boolean } } => {
  return event.type === 'error';
};

/**
 * Type guard to check if event is a complete event
 */
export const isCompleteEvent = (event: StreamEvent): event is { type: 'complete'; data: { debateId: string } } => {
  return event.type === 'complete';
};
