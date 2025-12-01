import { useCallback, type FC } from 'react';
import { useDebateStore } from '@debateui/state';
import {
  useDebateState,
  useConfig,
  useTurns,
  useCurrentRound,
  useIsDebateRunning,
  useIsDebatePaused,
  useCanResume,
  useIsConfigValid,
  useIsDebateTerminal,
  useConsensus,
  useBranchCount,
  useCanFork,
} from '@debateui/state';
import * as O from 'fp-ts/Option';
import type { TurnResponse } from '@debateui/core';

// ============================================
// ICONS
// ============================================

const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ResetIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const ForkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
  </svg>
);

const BranchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
  </svg>
);

// ============================================
// HEADER
// ============================================

const Header: FC = () => {
  const debateState = useDebateState();
  const isRunning = useIsDebateRunning();

  const getStatusColor = () => {
    switch (debateState._tag) {
      case 'Idle': return 'bg-gray-500';
      case 'Starting': return 'bg-yellow-500';
      case 'Running': return 'bg-emerald-500';
      case 'Paused': return 'bg-orange-500';
      case 'Completed': return 'bg-blue-500';
      case 'Error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <header className="h-16 border-b border-[rgb(var(--color-elevated))] bg-[rgb(var(--color-abyss)_/_0.8)] backdrop-blur-md sticky top-0 z-50">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-accent">Debate</span>
            <span className="text-secondary">UI</span>
          </h1>
          <div className="h-6 w-px bg-[rgb(var(--color-elevated))]" />
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()} ${isRunning ? 'status-pulse' : ''}`} />
            <span className="text-sm text-muted">{debateState._tag}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-muted font-mono">v0.1.0</span>
        </div>
      </div>
    </header>
  );
};

// ============================================
// CONFIG PANEL (Left Sidebar)
// ============================================

const ConfigSection: FC = () => {
  const config = useConfig();
  const setConfig = useDebateStore((s) => s.setConfig);
  const isRunning = useIsDebateRunning();
  const isDisabled = isRunning;

  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfig({ question: e.target.value });
  };

  const handleParticipantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const participants = e.target.value.split(',').map((p) => p.trim()).filter(Boolean);
    setConfig({ participants });
  };

  const handleRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ rounds: parseInt(e.target.value, 10) || 4 });
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({ consensusThreshold: parseFloat(e.target.value) });
  };

  return (
    <div className="space-y-4">
      <div className="section-header">
        <span>Configuration</span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Debate Question</label>
          <textarea
            className="input min-h-[100px] resize-none text-sm"
            placeholder="Enter your debate question..."
            value={config.question}
            onChange={handleQuestionChange}
            disabled={isDisabled}
          />
        </div>

        <div>
          <label className="label">Participants</label>
          <input
            type="text"
            className="input text-sm"
            placeholder="claude, gpt-4, gemini"
            value={config.participants.join(', ')}
            onChange={handleParticipantsChange}
            disabled={isDisabled}
          />
          <p className="text-xs text-muted mt-1">Comma-separated model names</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Rounds</label>
            <input
              type="number"
              className="input text-sm"
              min={1}
              max={10}
              value={config.rounds}
              onChange={handleRoundsChange}
              disabled={isDisabled}
            />
          </div>

          <div>
            <label className="label">Consensus</label>
            <input
              type="range"
              className="w-full h-2 bg-depth rounded-lg appearance-none cursor-pointer accent-[rgb(var(--color-accent))]"
              min={0.5}
              max={1}
              step={0.05}
              value={config.consensusThreshold}
              onChange={handleThresholdChange}
              disabled={isDisabled}
            />
            <p className="text-xs text-muted text-center mt-1">
              {Math.round(config.consensusThreshold * 100)}%
            </p>
          </div>
        </div>

        <div>
          <label className="label">Fork Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setConfig({ forkMode: 'save' })}
              disabled={isDisabled}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                config.forkMode === 'save'
                  ? 'bg-[rgb(var(--color-success)_/_0.2)] text-[rgb(var(--color-success))] border border-[rgb(var(--color-success)_/_0.3)]'
                  : 'bg-depth text-muted border border-transparent hover:text-secondary'
              }`}
            >
              Save
            </button>
            <button
              onClick={() => setConfig({ forkMode: 'explore' })}
              disabled={isDisabled}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                config.forkMode === 'explore'
                  ? 'bg-[rgb(var(--color-amber)_/_0.2)] text-[rgb(var(--color-amber))] border border-[rgb(var(--color-amber)_/_0.3)]'
                  : 'bg-depth text-muted border border-transparent hover:text-secondary'
              }`}
            >
              Explore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// BRANCHES PANEL (Left Sidebar)
// ============================================

const BranchesSection: FC = () => {
  // Use primitive values to avoid infinite loops with object references
  const branchCount = useBranchCount();
  const activeBranchIdOption = useDebateStore((s) => s.branching.activeBranchId);
  const selectBranch = useDebateStore((s) => s.selectBranch);

  // Get branches synchronously - will update when branchCount changes
  const branches = Array.from(useDebateStore.getState().branching.branches.values());
  const activeBranchId = O.isSome(activeBranchIdOption) ? activeBranchIdOption.value : null;

  return (
    <div className="space-y-3">
      <div className="section-header">
        <BranchIcon />
        <span>Branches ({branchCount})</span>
      </div>

      {branches.length === 0 ? (
        <p className="text-sm text-muted py-4 text-center">No branches yet</p>
      ) : (
        <div className="space-y-2">
          {branches.map((branch) => (
            <button
              key={branch.branchId}
              onClick={() => selectBranch(branch.branchId)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                branch.branchId === activeBranchId
                  ? 'bg-[rgb(var(--color-accent)_/_0.1)] border border-[rgb(var(--color-accent)_/_0.3)] glow-accent'
                  : 'bg-depth hover:bg-surface border border-transparent'
              }`}
              style={{ paddingLeft: `${12 + branch.depth * 12}px` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{branch.name}</span>
                <span className={`fork-badge ${branch.forkMode}`}>
                  {branch.forkMode}
                </span>
              </div>
              {branch.depth > 0 && (
                <p className="text-xs text-muted mt-1">Depth: {branch.depth}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// TURN CARD
// ============================================

const getParticipantClass = (participantId: string): string => {
  const id = participantId.toLowerCase();
  if (id.includes('claude')) return 'participant-claude';
  if (id.includes('gpt')) return 'participant-gpt';
  if (id.includes('gemini')) return 'participant-gemini';
  if (id.includes('human')) return 'participant-human';
  return 'participant-moderator';
};

interface TurnCardProps {
  turn: TurnResponse;
  onFork?: (turnId: string) => void;
}

const TurnCard: FC<TurnCardProps> = ({ turn, onFork }) => {
  const canFork = useCanFork();
  const participantClass = getParticipantClass(turn.participantId);

  return (
    <article className={`turn-card p-4 ${participantClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--participant-color, rgb(var(--color-accent))) / 0.15',
                color: 'var(--participant-color, rgb(var(--color-accent)))',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {turn.participantId}
            </span>
            <span className="text-xs text-muted">
              {new Date(turn.createdAt).toLocaleTimeString()}
            </span>
          </div>

          <p className="transcript whitespace-pre-wrap">{turn.content}</p>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted font-mono">
            <span>{turn.tokensUsed} tokens</span>
            <span>${turn.costUsd.toFixed(4)}</span>
            <span>{turn.latencyMs}ms</span>
          </div>
        </div>

        {canFork && onFork && (
          <button
            onClick={() => onFork(turn.turnId)}
            className="btn-ghost p-2 rounded-lg shrink-0"
            title="Fork from this turn"
          >
            <ForkIcon />
          </button>
        )}
      </div>
    </article>
  );
};

// ============================================
// TIMELINE (Center)
// ============================================

const Timeline: FC = () => {
  const turns = useTurns();
  const isRunning = useIsDebateRunning();
  const config = useConfig();
  const startFork = useDebateStore((s) => s.startFork);

  const handleFork = useCallback((turnId: string) => {
    startFork(turnId, 'main');
  }, [startFork]);

  if (turns.length === 0 && !isRunning) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center">
            <svg className="w-8 h-8 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Ready to Debate</h3>
          <p className="text-sm text-muted">
            Configure your debate question and participants, then start the session.
          </p>
          {config.question && config.participants.length >= 2 && (
            <p className="text-sm text-accent mt-3">Configuration valid. Ready to start!</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 stagger-children">
      {isRunning && turns.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3">
            <div className="typing-indicator">
              <span /><span /><span />
            </div>
            <span className="text-sm text-muted">Waiting for first response...</span>
          </div>
        </div>
      )}

      {turns.map((turn) => (
        <TurnCard key={turn.turnId} turn={turn} onFork={handleFork} />
      ))}
    </div>
  );
};

// ============================================
// METRICS PANEL (Right Sidebar)
// ============================================

const MetricCard: FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className="metric-card">
    <div className={`metric-value ${highlight ? 'text-[rgb(var(--color-success))]' : ''}`}>
      {value}
    </div>
    <div className="metric-label">{label}</div>
  </div>
);

const MetricsSection: FC = () => {
  const turns = useTurns();
  const currentRound = useCurrentRound();
  const consensus = useConsensus();

  const totalTokens = turns.reduce((sum, t) => sum + t.tokensUsed, 0);
  const totalCost = turns.reduce((sum, t) => sum + t.costUsd, 0);
  const avgLatency = turns.length > 0
    ? Math.round(turns.reduce((sum, t) => sum + t.latencyMs, 0) / turns.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="section-header">
        <span>Metrics</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricCard label="Turns" value={turns.length} />
        <MetricCard label="Round" value={currentRound} />
        <MetricCard label="Tokens" value={totalTokens.toLocaleString()} />
        <MetricCard label="Cost" value={`$${totalCost.toFixed(4)}`} />
      </div>

      <MetricCard label="Avg Latency" value={`${avgLatency}ms`} />

      {O.isSome(consensus) && (
        <div className="panel p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Consensus</span>
            <span className={`text-sm font-bold ${
              consensus.value.level === 'strong'
                ? 'text-[rgb(var(--color-success))]'
                : consensus.value.level === 'moderate'
                ? 'text-[rgb(var(--color-amber))]'
                : 'text-muted'
            }`}>
              {consensus.value.level}
            </span>
          </div>
          <div className="consensus-meter">
            <div
              className="consensus-fill"
              style={{ width: `${consensus.value.percentage * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted">
            <span>{consensus.value.supporting} supporting</span>
            <span>{consensus.value.dissenting} dissenting</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// CONTROL BAR (Bottom)
// ============================================

const ControlBar: FC = () => {
  const isRunning = useIsDebateRunning();
  const isPaused = useIsDebatePaused();
  const canResume = useCanResume();
  const isConfigValid = useIsConfigValid();
  const isTerminal = useIsDebateTerminal();
  const debateState = useDebateState();

  const { startDebate, debateStarted, pauseDebate, resumeDebate, reset } = useDebateStore.getState();

  const handleStart = () => {
    startDebate();
    // Simulate backend response
    setTimeout(() => debateStarted(`debate-${Date.now()}`), 500);
  };

  const handlePause = () => {
    pauseDebate('User requested pause');
  };

  const handleResume = () => {
    resumeDebate();
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className="h-16 border-t border-[rgb(var(--color-elevated))] bg-[rgb(var(--color-abyss)_/_0.8)] backdrop-blur-md">
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {debateState._tag === 'Idle' && (
            <button
              onClick={handleStart}
              disabled={!isConfigValid}
              className="btn-primary flex items-center gap-2"
            >
              <PlayIcon />
              Start Debate
            </button>
          )}

          {isRunning && (
            <button onClick={handlePause} className="btn-secondary flex items-center gap-2">
              <PauseIcon />
              Pause
            </button>
          )}

          {isPaused && canResume && (
            <button onClick={handleResume} className="btn-primary flex items-center gap-2">
              <PlayIcon />
              Resume
            </button>
          )}

          {isTerminal && (
            <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
              <ResetIcon />
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted">
          <kbd className="px-2 py-1 rounded bg-depth text-xs font-mono">⌘K</kbd>
          <span>Quick actions</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

export const App: FC = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Config & Branches */}
        <aside className="w-72 border-r border-[rgb(var(--color-elevated))] bg-[rgb(var(--color-abyss)_/_0.5)] overflow-y-auto">
          <div className="p-4 space-y-6">
            <ConfigSection />
            <div className="h-px bg-[rgb(var(--color-elevated))]" />
            <BranchesSection />
          </div>
        </aside>

        {/* Center - Timeline */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <Timeline />
        </main>

        {/* Right Sidebar - Metrics */}
        <aside className="w-64 border-l border-[rgb(var(--color-elevated))] bg-[rgb(var(--color-abyss)_/_0.5)] overflow-y-auto">
          <div className="p-4">
            <MetricsSection />
          </div>
        </aside>
      </div>

      <ControlBar />
    </div>
  );
};
