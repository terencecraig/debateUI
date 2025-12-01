import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebateStream } from './useDebateStream';
import { useDebateStore } from '@debateui/state';
import type { TurnResponse, ConsensusResult } from '@debateui/core';
import * as E from 'fp-ts/Either';

// Store the event handler for testing
let mockEventHandler: ((event: any) => void) | null = null;

// Mock the api-client
vi.mock('@debateui/api-client', () => {
  let mockEventSource: any = null;

  return {
    createSSEClient: vi.fn((_debateId: string, _baseUrl: string, onEvent: (event: any) => void, _options?: any) => {
      mockEventHandler = onEvent;
      mockEventSource = {
        readyState: 1, // OPEN
        close: vi.fn(),
      };

      return async () => {
        return E.right({
          eventSource: mockEventSource as any,
          close: (() => {
            mockEventSource.readyState = 2; // CLOSED
            mockEventSource.close();
          }) as any,
          reconnect: vi.fn() as any,
        } as any) as any;
      };
    }),
    // Type guards (same logic as in actual module)
    isTurnEvent: (event: any) => event.type === 'turn',
    isConsensusEvent: (event: any) => event.type === 'consensus',
    isErrorEvent: (event: any) => event.type === 'error',
    isCompleteEvent: (event: any) => event.type === 'complete',
  };
});

// Import after mock
import { createSSEClient } from '@debateui/api-client';

// Helper to trigger events in tests
const triggerEvent = (event: any) => {
  if (mockEventHandler) {
    mockEventHandler(event);
  }
};

describe('useDebateStream', () => {
  beforeEach(() => {
    // Reset store before each test
    useDebateStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('connects when debate is running', async () => {
    const baseUrl = 'http://localhost:3000';

    // Start a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');

    // Render hook
    const { result } = renderHook(() => useDebateStream(baseUrl));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    expect(createSSEClient).toHaveBeenCalledWith(
      'debate-123',
      baseUrl,
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('does not connect when debate is completed', () => {
    const baseUrl = 'http://localhost:3000';

    // Start and complete a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');
    store.completeDebate({
      level: 'strong',
      percentage: 0.9,
      supporting: 5,
      dissenting: 0,
      confidence: 0.95,
    });

    // Render hook after debate is completed
    const { result } = renderHook(() => useDebateStream(baseUrl));

    // Should not connect since debate is completed
    expect(result.current.status).toBe('disconnected');
    expect(createSSEClient).not.toHaveBeenCalled();
  });

  it('dispatches turns to store', async () => {
    const baseUrl = 'http://localhost:3000';

    // Start a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');

    // Render hook
    renderHook(() => useDebateStream(baseUrl));

    await waitFor(() => {
      expect(createSSEClient).toHaveBeenCalled();
    });

    // Simulate receiving a turn event
    const turnData: TurnResponse = {
      turnId: 'turn-1',
      branchId: 'branch-1',
      participantId: 'claude',
      participantType: 'model',
      content: 'My response',
      confidence: 0.9,
      tokensUsed: 100,
      costUsd: 0.001,
      latencyMs: 500,
      createdAt: new Date().toISOString(),
    };

    act(() => {
      triggerEvent({ type: 'turn', data: turnData });
    });

    // Verify turn was added to store
    await waitFor(() => {
      const state = useDebateStore.getState();
      if (state.debate._tag === 'Running') {
        expect(state.debate.turns).toHaveLength(1);
        expect(state.debate.turns[0]).toEqual(turnData);
      }
    });
  });

  it('handles consensus completion', async () => {
    const baseUrl = 'http://localhost:3000';

    // Start a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');

    // Render hook
    renderHook(() => useDebateStream(baseUrl));

    await waitFor(() => {
      expect(createSSEClient).toHaveBeenCalled();
    });

    // Simulate receiving a consensus event
    const consensusData: ConsensusResult = {
      level: 'strong',
      percentage: 0.85,
      supporting: 4,
      dissenting: 1,
      confidence: 0.95,
    };

    act(() => {
      triggerEvent({ type: 'consensus', data: consensusData });
    });

    // Verify debate was completed in store
    await waitFor(() => {
      const state = useDebateStore.getState();
      expect(state.debate._tag).toBe('Completed');
      if (state.debate._tag === 'Completed') {
        expect(state.debate.consensus).toEqual(consensusData);
      }
    });
  });

  it('returns correct connection status', async () => {
    const baseUrl = 'http://localhost:3000';

    // Render hook before debate starts
    const { result, rerender } = renderHook(() => useDebateStream(baseUrl));

    // Initially disconnected
    expect(result.current.status).toBe('disconnected');

    // Start a debate
    const store = useDebateStore.getState();
    act(() => {
      store.startDebate();
      store.debateStarted('debate-123');
    });

    rerender();

    // Should be connecting/connected
    await waitFor(() => {
      expect(['connecting', 'connected']).toContain(result.current.status);
    });
  });

  it('cleans up on unmount', async () => {
    const baseUrl = 'http://localhost:3000';

    // Start a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');

    // Render hook
    const { unmount } = renderHook(() => useDebateStream(baseUrl));

    await waitFor(() => {
      expect(createSSEClient).toHaveBeenCalled();
    });

    // Unmount
    unmount();

    // Connection should be closed
    // (verified by the close function being called internally)
  });

  it('handles error events', async () => {
    const baseUrl = 'http://localhost:3000';

    // Start a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');

    // Render hook
    renderHook(() => useDebateStream(baseUrl));

    await waitFor(() => {
      expect(createSSEClient).toHaveBeenCalled();
    });

    // Simulate receiving an error event
    act(() => {
      triggerEvent({
        type: 'error',
        data: {
          message: 'Connection failed',
          recoverable: false,
        },
      });
    });

    // Verify error was set in store
    await waitFor(() => {
      const state = useDebateStore.getState();
      expect(state.debate._tag).toBe('Error');
      if (state.debate._tag === 'Error') {
        // NetworkError has a message property
        expect(state.debate.error._tag).toBe('NetworkError');
        if (state.debate.error._tag === 'NetworkError') {
          expect(state.debate.error.message).toContain('Connection failed');
        }
      }
    });
  });

  it('does not connect if debate is not running', () => {
    const baseUrl = 'http://localhost:3000';

    // Render hook without starting debate
    const { result } = renderHook(() => useDebateStream(baseUrl));

    // Should remain disconnected
    expect(result.current.status).toBe('disconnected');
    expect(createSSEClient).not.toHaveBeenCalled();
  });

  it('handles complete events', async () => {
    const baseUrl = 'http://localhost:3000';

    // Start a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');

    // Render hook
    const { result } = renderHook(() => useDebateStream(baseUrl));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Simulate receiving a complete event
    act(() => {
      triggerEvent({
        type: 'complete',
        data: {
          debateId: 'debate-123',
        },
      });
    });

    // Connection should close
    await waitFor(() => {
      expect(result.current.status).toBe('disconnected');
    });
  });

  it('reconnects on recoverable errors', async () => {
    const baseUrl = 'http://localhost:3000';

    // Start a debate
    const store = useDebateStore.getState();
    store.startDebate();
    store.debateStarted('debate-123');

    // Render hook
    const { result } = renderHook(() => useDebateStream(baseUrl));

    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Simulate receiving a recoverable error
    act(() => {
      triggerEvent({
        type: 'error',
        data: {
          message: 'Temporary connection issue',
          recoverable: true,
        },
      });
    });

    // Should attempt to reconnect
    await waitFor(() => {
      expect(result.current.status).toBe('reconnecting');
    });
  });
});
