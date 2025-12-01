import { useEffect, useRef } from 'react';
import { useTurns, useIsDebateRunning } from '@debateui/state';
import { TurnCard } from '../TurnCard';

/**
 * Timeline component displays the debate conversation flow.
 * Shows all turns in chronological order with auto-scrolling to latest turn.
 */
export function Timeline() {
  const turns = useTurns();
  const isDebateRunning = useIsDebateRunning();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestTurnRef = useRef<HTMLLIElement>(null);

  // Auto-scroll to latest turn when new turn arrives
  useEffect(() => {
    if (turns.length > 0 && latestTurnRef.current) {
      // scrollIntoView might not be available in test environments (jsdom)
      if (typeof latestTurnRef.current.scrollIntoView === 'function') {
        latestTurnRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    }
  }, [turns.length]);

  // Loading state: debate is running but no turns yet
  if (isDebateRunning && turns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-gray-500">
        <div
          role="status"
          className="flex flex-col items-center gap-4"
          aria-live="polite"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          <p className="text-lg">Waiting for first turn...</p>
        </div>
      </div>
    );
  }

  // Empty state: no turns and debate is not running
  if (turns.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8 text-gray-500">
        <p className="text-lg">No turns yet. Start a debate to see the conversation.</p>
      </div>
    );
  }

  // Render timeline with turns
  return (
    <div
      ref={scrollContainerRef}
      data-testid="timeline-scroll-container"
      className="h-full overflow-y-auto overflow-x-hidden px-4 py-6 space-y-4"
    >
      <ul
        role="list"
        aria-label="Debate turns timeline"
        className="space-y-4"
      >
        {turns.map((turn, index) => {
          const isLatest = index === turns.length - 1;
          return (
            <li
              key={turn.turnId}
              ref={isLatest ? latestTurnRef : null}
              role="listitem"
              className="transition-all duration-200"
            >
              <TurnCard turn={turn} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
