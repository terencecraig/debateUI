import type { TurnResponse } from '@debateui/core';

export interface TurnCardProps {
  turn: TurnResponse;
  onFork?: (turnId: string) => void;
}

export function TurnCard({ turn, onFork }: TurnCardProps) {
  const {
    turnId,
    participantId,
    participantType,
    content,
    tokensUsed,
    costUsd,
    latencyMs,
    createdAt,
  } = turn;

  // Styling based on participant type
  const participantStyles = {
    model: 'bg-blue-50 border-blue-200',
    human: 'bg-green-50 border-green-200',
  };

  const participantBadgeStyles = {
    model: 'bg-blue-100 text-blue-800',
    human: 'bg-green-100 text-green-800',
  };

  // Format timestamp
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format cost to 4 decimal places
  const formatCost = (cost: number): string => {
    return cost.toFixed(4);
  };

  return (
    <article
      className={`rounded-lg border-2 p-4 shadow-sm ${participantStyles[participantType]}`}
      data-participant-type={participantType}
      aria-label={`Turn by ${participantId} (${participantType})`}
    >
      {/* Header: Participant Info */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${participantBadgeStyles[participantType]}`}
          >
            {participantType}
          </span>
          <span className="text-sm font-medium text-gray-700">{participantId}</span>
        </div>
        {onFork && (
          <button
            onClick={() => onFork(turnId)}
            className="rounded bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label={`Fork from turn ${turnId}`}
          >
            Fork
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className="mb-3 whitespace-pre-wrap text-gray-800"
        data-testid="turn-content"
      >
        {content}
      </div>

      {/* Footer: Metrics and Timestamp */}
      <div className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">Tokens:</span>
          <span>{tokensUsed}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">Cost:</span>
          <span>${formatCost(costUsd)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">Latency:</span>
          <span>{latencyMs}ms</span>
        </div>
        <div className="ml-auto text-gray-500">
          {formatTimestamp(createdAt)}
        </div>
      </div>
    </article>
  );
}
