import React from 'react';
import {
  useDebateState,
  useIsConfigValid,
  useIsDebateRunning,
  useIsDebatePaused,
  useCanResume,
  useIsDebateTerminal,
} from '@debateui/state';
import { useDebateStore } from '@debateui/state';

/**
 * ControlBar component for debate flow control.
 * Provides Start, Pause, Resume, and Reset buttons with state-dependent behavior.
 */
export const ControlBar: React.FC = () => {
  const debate = useDebateState();
  const isConfigValid = useIsConfigValid();
  const isRunning = useIsDebateRunning();
  const isPaused = useIsDebatePaused();
  const canResume = useCanResume();
  const isTerminal = useIsDebateTerminal();

  const startDebate = useDebateStore((state) => state.startDebate);
  const pauseDebate = useDebateStore((state) => state.pauseDebate);
  const resumeDebate = useDebateStore((state) => state.resumeDebate);
  const reset = useDebateStore((state) => state.reset);

  // Button states
  const isIdle = debate._tag === 'Idle';
  const isStarting = debate._tag === 'Starting';

  const canStart = isIdle && isConfigValid;
  const canPause = isRunning;
  const canResumeButton = isPaused && canResume;
  const canReset = isTerminal;

  // Handle button clicks
  const handleStart = () => {
    startDebate();
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

  // Get state display text
  const getStateText = (): string => {
    switch (debate._tag) {
      case 'Idle':
        return 'Idle';
      case 'Configuring':
        return 'Configuring';
      case 'Starting':
        return 'Starting';
      case 'Running':
        return 'Running';
      case 'Paused':
        return 'Paused';
      case 'Completed':
        return 'Completed';
      case 'Error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // Get state indicator color
  const getStateColor = (): string => {
    switch (debate._tag) {
      case 'Idle':
        return 'bg-gray-500';
      case 'Configuring':
        return 'bg-blue-500';
      case 'Starting':
        return 'bg-yellow-500';
      case 'Running':
        return 'bg-green-500';
      case 'Paused':
        return 'bg-orange-500';
      case 'Completed':
        return 'bg-indigo-500';
      case 'Error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white border-b border-gray-200">
      {/* State Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getStateColor()}`} />
        <span className="text-sm font-medium text-gray-700">
          {getStateText()}
        </span>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-gray-300" />

      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={!canStart || isStarting}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-md
            transition-colors duration-200
            ${
              canStart && !isStarting
                ? 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                : 'bg-gray-300 cursor-not-allowed opacity-50'
            }
          `}
          aria-label="Start debate"
        >
          Start
        </button>

        <button
          onClick={handlePause}
          disabled={!canPause}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-md
            transition-colors duration-200
            ${
              canPause
                ? 'bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2'
                : 'bg-gray-300 cursor-not-allowed opacity-50'
            }
          `}
          aria-label="Pause debate"
        >
          Pause
        </button>

        <button
          onClick={handleResume}
          disabled={!canResumeButton}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-md
            transition-colors duration-200
            ${
              canResumeButton
                ? 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                : 'bg-gray-300 cursor-not-allowed opacity-50'
            }
          `}
          aria-label="Resume debate"
        >
          Resume
        </button>

        <button
          onClick={handleReset}
          disabled={!canReset}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-md
            transition-colors duration-200
            ${
              canReset
                ? 'bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
                : 'bg-gray-300 cursor-not-allowed opacity-50'
            }
          `}
          aria-label="Reset debate"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
