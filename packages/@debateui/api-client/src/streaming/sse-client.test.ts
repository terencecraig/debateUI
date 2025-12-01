import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSSEClient } from './sse-client';
import type { TurnResponse, ConsensusResult } from '@debateui/core';
import * as E from 'fp-ts/Either';

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState: number = 0;

  constructor(url: string) {
    this.url = url;
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = 1; // OPEN
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  close() {
    this.readyState = 2; // CLOSED
  }

  // Helper to simulate receiving a message
  simulateMessage(data: string, type: string = 'message') {
    if (this.onmessage) {
      const event = new MessageEvent(type, { data });
      this.onmessage(event);
    }
  }

  // Helper to simulate error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Type for accessing mock internals
interface MockSSEClient {
  eventSource: MockEventSource;
  close: () => void;
  reconnect: () => void;
}

describe('SSE Client', () => {
  beforeEach(() => {
    // Replace global EventSource with mock
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('createSSEClient', () => {
    it('creates EventSource with correct URL', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const baseUrl = 'http://localhost:3000';

      const result = await createSSEClient(
        debateId,
        baseUrl,
        () => {}
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource } = result.right;
        expect(eventSource.url).toBe(`${baseUrl}/debates/${debateId}/stream`);
        eventSource.close();
      }
    });

    it('parses turn events and calls handler', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const turnHandler = vi.fn();

      const turnData: TurnResponse = {
        turnId: 'a1b2c3d4-5678-90ab-cdef-123456789012',
        branchId: 'b2c3d4e5-6789-01bc-def1-234567890123',
        participantId: 'claude',
        participantType: 'model',
        content: 'My response',
        confidence: 0.9,
        tokensUsed: 100,
        costUsd: 0.001,
        latencyMs: 500,
        createdAt: new Date().toISOString(),
      };

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        turnHandler
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource } = result.right as unknown as MockSSEClient;

        // Simulate receiving a turn event
        const eventData = JSON.stringify({
          type: 'turn',
          data: turnData,
        });
        eventSource.simulateMessage(eventData);

        // Verify handler was called with turn event
        expect(turnHandler).toHaveBeenCalledWith({
          type: 'turn',
          data: turnData,
        });

        eventSource.close();
      }
    });

    it('parses consensus events and calls handler', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const handler = vi.fn();

      const consensusData: ConsensusResult = {
        level: 'strong',
        percentage: 0.85,
        supporting: 4,
        dissenting: 1,
        confidence: 0.95,
      };

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        handler
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource } = result.right as unknown as MockSSEClient;

        // Simulate receiving a consensus event
        const eventData = JSON.stringify({
          type: 'consensus',
          data: consensusData,
        });
        eventSource.simulateMessage(eventData);

        // Verify handler was called with consensus event
        expect(handler).toHaveBeenCalledWith({
          type: 'consensus',
          data: consensusData,
        });

        eventSource.close();
      }
    });

    it('handles error events', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const handler = vi.fn();

      const errorData = {
        message: 'Connection failed',
        recoverable: true,
      };

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        handler
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource } = result.right as unknown as MockSSEClient;

        // Simulate receiving an error event
        const eventData = JSON.stringify({
          type: 'error',
          data: errorData,
        });
        eventSource.simulateMessage(eventData);

        // Verify handler was called with error event
        expect(handler).toHaveBeenCalledWith({
          type: 'error',
          data: errorData,
        });

        eventSource.close();
      }
    });

    it('handles complete events', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const handler = vi.fn();

      const completeData = {
        debateId: 'c7e9a3b2-1234-5678-90ab-cdef12345678',
      };

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        handler
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource } = result.right as unknown as MockSSEClient;

        // Simulate receiving a complete event
        const eventData = JSON.stringify({
          type: 'complete',
          data: completeData,
        });
        eventSource.simulateMessage(eventData);

        // Verify handler was called with complete event
        expect(handler).toHaveBeenCalledWith({
          type: 'complete',
          data: completeData,
        });

        eventSource.close();
      }
    });

    it('reconnects on connection loss with exponential backoff', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const handler = vi.fn();

      // Track reconnection attempts
      let connectionAttempts = 0;
      const originalEventSource = global.EventSource;

      vi.stubGlobal('EventSource', class extends MockEventSource {
        constructor(url: string) {
          super(url);
          connectionAttempts++;
        }
      });

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        handler,
        { maxRetries: 3, initialRetryDelay: 10 }
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource, reconnect } = result.right as unknown as MockSSEClient;

        // Initial connection
        expect(connectionAttempts).toBe(1);

        // Simulate connection error
        eventSource.simulateError();

        // Trigger reconnection
        await reconnect();

        // Should have attempted to reconnect
        expect(connectionAttempts).toBeGreaterThan(1);

        eventSource.close();
      }

      vi.stubGlobal('EventSource', originalEventSource);
    });

    it('cleans up on close', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const handler = vi.fn();

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        handler
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource, close } = result.right;

        // Close the connection
        close();

        // Verify EventSource is closed
        expect(eventSource.readyState).toBe(2); // CLOSED
      }
    });

    it('handles invalid JSON gracefully', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const handler = vi.fn();

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        handler
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource } = result.right as unknown as MockSSEClient;

        // Simulate receiving invalid JSON
        eventSource.simulateMessage('not valid json');

        // Handler should not be called
        expect(handler).not.toHaveBeenCalled();

        eventSource.close();
      }
    });

    it('validates event types with Zod', async () => {
      const debateId = 'c7e9a3b2-1234-5678-90ab-cdef12345678';
      const handler = vi.fn();

      const result = await createSSEClient(
        debateId,
        'http://localhost:3000',
        handler
      )();

      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const { eventSource } = result.right as unknown as MockSSEClient;

        // Simulate receiving event with invalid structure
        const invalidEvent = JSON.stringify({
          type: 'turn',
          data: {
            // Missing required fields
            turnId: 'a1b2c3d4-5678-90ab-cdef-123456789012',
          },
        });
        eventSource.simulateMessage(invalidEvent);

        // Handler should not be called for invalid events
        expect(handler).not.toHaveBeenCalled();

        eventSource.close();
      }
    });
  });
});
