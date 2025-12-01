import { useTurns, useCurrentRound, useTurnCount, useDebateStore } from '@debateui/state';
import * as O from 'fp-ts/Option';
import type { TurnResponse, ConsensusResult } from '@debateui/core';

/**
 * MetricsPanel displays aggregate statistics for the current debate.
 * Shows real-time metrics including turn count, tokens, cost, latency,
 * and consensus information when the debate is completed.
 */
export function MetricsPanel() {
  const turns = useTurns();
  const currentRound = useCurrentRound();
  const turnCount = useTurnCount();

  // Get consensus directly from debate state to avoid Option reference issues
  const debate = useDebateStore((state) => state.debate);
  const consensus: O.Option<ConsensusResult> =
    debate._tag === 'Completed' ? O.some(debate.consensus) : O.none;

  // Calculate aggregate metrics from turns
  const totalTokens = turns.reduce((sum: number, turn: TurnResponse) => sum + turn.tokensUsed, 0);
  const totalCost = turns.reduce((sum: number, turn: TurnResponse) => sum + turn.costUsd, 0);
  const avgLatency = turns.length > 0
    ? Math.round(turns.reduce((sum: number, turn: TurnResponse) => sum + turn.latencyMs, 0) / turns.length)
    : 0;

  // Format currency to 4 decimal places
  const formatCost = (cost: number): string => {
    return cost.toFixed(4);
  };

  return (
    <div
      data-testid="metrics-panel"
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Debate Metrics</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {/* Total Turns */}
        <MetricCard label="Total Turns" value={turnCount.toString()} />

        {/* Current Round */}
        <MetricCard label="Current Round" value={currentRound.toString()} />

        {/* Total Tokens */}
        <MetricCard label="Total Tokens" value={totalTokens.toString()} />

        {/* Total Cost */}
        <MetricCard label="Total Cost" value={`$${formatCost(totalCost)}`} />

        {/* Average Latency */}
        <MetricCard label="Avg Latency" value={`${avgLatency}ms`} />
      </div>

      {/* Consensus Section - Only shown when debate is completed */}
      {O.isSome(consensus) && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h3 className="mb-3 text-md font-semibold text-gray-800">Consensus</h3>
          <ConsensusDisplay consensus={consensus.value} />
        </div>
      )}
    </div>
  );
}

/**
 * MetricCard displays a single metric with label and value.
 */
interface MetricCardProps {
  label: string;
  value: string;
}

function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

/**
 * ConsensusDisplay shows consensus level, percentage, and vote counts.
 */
interface ConsensusDisplayProps {
  consensus: ConsensusResult;
}

function ConsensusDisplay({ consensus }: ConsensusDisplayProps) {
  const formatPercentage = (percentage: number): string => {
    return Math.round(percentage * 100) + '%';
  };

  // Style consensus level badge based on strength
  const levelStyles = {
    strong: 'bg-green-100 text-green-800 border-green-200',
    moderate: 'bg-blue-100 text-blue-800 border-blue-200',
    weak: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    none: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Consensus Level Badge */}
      <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${levelStyles[consensus.level]}`}>
        {consensus.level}
      </div>

      {/* Percentage */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Agreement</span>
        <span className="text-lg font-bold text-gray-900">{formatPercentage(consensus.percentage)}</span>
      </div>

      {/* Supporting Count */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Supporting</span>
        <span className="text-lg font-bold text-green-700">{consensus.supporting}</span>
      </div>

      {/* Dissenting Count */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Dissenting</span>
        <span className="text-lg font-bold text-red-700">{consensus.dissenting}</span>
      </div>

      {/* Confidence */}
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">Confidence</span>
        <span className="text-lg font-bold text-gray-900">{formatPercentage(consensus.confidence)}</span>
      </div>
    </div>
  );
}
