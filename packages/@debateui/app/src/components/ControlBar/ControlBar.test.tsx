import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ControlBar } from './ControlBar';
import type { DebateState } from '@debateui/core';
import { idle, starting, running, paused, completed, error as errorState } from '@debateui/core';
import * as StateModule from '@debateui/state';

// Mock the entire state module
vi.mock('@debateui/state');

describe('ControlBar', () => {
  const mockStartDebate = vi.fn();
  const mockPauseDebate = vi.fn();
  const mockResumeDebate = vi.fn();
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupStore = (
    debate: DebateState,
    isConfigValid = true
  ) => {
    // Mock selector hooks
    vi.mocked(StateModule.useDebateState).mockReturnValue(debate);
    vi.mocked(StateModule.useIsConfigValid).mockReturnValue(isConfigValid);
    vi.mocked(StateModule.useIsDebateRunning).mockReturnValue(debate._tag === 'Running');
    vi.mocked(StateModule.useIsDebatePaused).mockReturnValue(debate._tag === 'Paused');
    vi.mocked(StateModule.useCanResume).mockReturnValue(
      debate._tag === 'Paused' && 'canResume' in debate && debate.canResume
    );
    vi.mocked(StateModule.useIsDebateTerminal).mockReturnValue(
      debate._tag === 'Completed' || debate._tag === 'Error'
    );

    // Mock store actions
    vi.mocked(StateModule.useDebateStore).mockImplementation((selector: any) => {
      const state = {
        debate,
        config: {
          question: isConfigValid ? 'Test question here' : '',
          participants: isConfigValid ? ['Alice', 'Bob'] : [],
          rounds: 4,
          consensusThreshold: 0.8,
          forkMode: 'save' as const,
        },
        startDebate: mockStartDebate,
        pauseDebate: mockPauseDebate,
        resumeDebate: mockResumeDebate,
        reset: mockReset,
      };
      return selector(state);
    });
  };

  describe('Idle state', () => {
    it('shows Start button when Idle with valid config', () => {
      setupStore(idle(), true);
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeInTheDocument();
      expect(startButton).toBeEnabled();
    });

    it('disables Start button when config is invalid', () => {
      setupStore(idle(), false);
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeDisabled();
    });

    it('disables Pause button when Idle', () => {
      setupStore(idle(), true);
      render(<ControlBar />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeDisabled();
    });

    it('disables Resume button when Idle', () => {
      setupStore(idle(), true);
      render(<ControlBar />);

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      expect(resumeButton).toBeDisabled();
    });

    it('shows Idle state indicator', () => {
      setupStore(idle(), true);
      render(<ControlBar />);

      expect(screen.getByText(/idle/i)).toBeInTheDocument();
    });

    it('calls startDebate when Start button is clicked', async () => {
      setupStore(idle(), true);
      const user = userEvent.setup();
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.click(startButton);

      expect(mockStartDebate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Starting state', () => {
    it('disables all buttons when Starting', () => {
      setupStore(
        starting({
          question: 'Test question',
          participants: ['Alice', 'Bob'],
          rounds: 4,
          consensusThreshold: 0.8,
          forkMode: 'save',
        }),
        true
      );
      render(<ControlBar />);

      expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /pause/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /resume/i })).toBeDisabled();
    });

    it('shows Starting state indicator', () => {
      setupStore(
        starting({
          question: 'Test question',
          participants: ['Alice', 'Bob'],
          rounds: 4,
          consensusThreshold: 0.8,
          forkMode: 'save',
        }),
        true
      );
      render(<ControlBar />);

      expect(screen.getByText(/starting/i)).toBeInTheDocument();
    });
  });

  describe('Running state', () => {
    it('shows Pause button enabled when Running', () => {
      setupStore(running('debate-123', 1, []), true);
      render(<ControlBar />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeEnabled();
    });

    it('disables Start button when Running', () => {
      setupStore(running('debate-123', 1, []), true);
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeDisabled();
    });

    it('disables Resume button when Running', () => {
      setupStore(running('debate-123', 1, []), true);
      render(<ControlBar />);

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      expect(resumeButton).toBeDisabled();
    });

    it('shows Running state indicator', () => {
      setupStore(running('debate-123', 1, []), true);
      render(<ControlBar />);

      expect(screen.getByText(/running/i)).toBeInTheDocument();
    });

    it('calls pauseDebate when Pause button is clicked', async () => {
      setupStore(running('debate-123', 1, []), true);
      const user = userEvent.setup();
      render(<ControlBar />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await user.click(pauseButton);

      expect(mockPauseDebate).toHaveBeenCalledTimes(1);
      expect(mockPauseDebate).toHaveBeenCalledWith('User requested pause');
    });
  });

  describe('Paused state', () => {
    it('shows Resume button enabled when Paused and can resume', () => {
      setupStore(paused('debate-123', 'User requested', true), true);
      render(<ControlBar />);

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      expect(resumeButton).toBeEnabled();
    });

    it('disables Resume button when Paused but cannot resume', () => {
      setupStore(paused('debate-123', 'Error occurred', false), true);
      render(<ControlBar />);

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      expect(resumeButton).toBeDisabled();
    });

    it('disables Start button when Paused', () => {
      setupStore(paused('debate-123', 'User requested', true), true);
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton).toBeDisabled();
    });

    it('disables Pause button when Paused', () => {
      setupStore(paused('debate-123', 'User requested', true), true);
      render(<ControlBar />);

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      expect(pauseButton).toBeDisabled();
    });

    it('shows Paused state indicator', () => {
      setupStore(paused('debate-123', 'User requested', true), true);
      render(<ControlBar />);

      expect(screen.getByText(/paused/i)).toBeInTheDocument();
    });

    it('calls resumeDebate when Resume button is clicked', async () => {
      setupStore(paused('debate-123', 'User requested', true), true);
      const user = userEvent.setup();
      render(<ControlBar />);

      const resumeButton = screen.getByRole('button', { name: /resume/i });
      await user.click(resumeButton);

      expect(mockResumeDebate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Completed state', () => {
    const mockConsensus = {
      level: 'strong' as const,
      percentage: 0.8,
      supporting: 4,
      dissenting: 1,
      confidence: 0.9,
    };

    it('enables Reset button when Completed', () => {
      setupStore(
        completed('debate-123', mockConsensus, []),
        true
      );
      render(<ControlBar />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeEnabled();
    });

    it('disables other buttons when Completed', () => {
      setupStore(
        completed('debate-123', mockConsensus, []),
        true
      );
      render(<ControlBar />);

      expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /pause/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /resume/i })).toBeDisabled();
    });

    it('shows Completed state indicator', () => {
      setupStore(
        completed('debate-123', mockConsensus, []),
        true
      );
      render(<ControlBar />);

      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });

    it('calls reset when Reset button is clicked', async () => {
      setupStore(
        completed('debate-123', mockConsensus, []),
        true
      );
      const user = userEvent.setup();
      render(<ControlBar />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error state', () => {
    const mockError = {
      _tag: 'ServerError' as const,
      statusCode: 500,
      message: 'Something went wrong',
    };

    it('enables Reset button when in Error state', () => {
      setupStore(
        errorState(mockError, false),
        true
      );
      render(<ControlBar />);

      const resetButton = screen.getByRole('button', { name: /reset/i });
      expect(resetButton).toBeEnabled();
    });

    it('disables other buttons when in Error state', () => {
      setupStore(
        errorState(mockError, false),
        true
      );
      render(<ControlBar />);

      expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /pause/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /resume/i })).toBeDisabled();
    });

    it('shows Error state indicator', () => {
      setupStore(
        errorState(mockError, false),
        true
      );
      render(<ControlBar />);

      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  describe('Keyboard accessibility', () => {
    it('buttons are keyboard focusable', async () => {
      setupStore(idle(), true);
      const user = userEvent.setup();
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      await user.tab();

      expect(startButton).toHaveFocus();
    });

    it('can trigger Start with Enter key', async () => {
      setupStore(idle(), true);
      const user = userEvent.setup();
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      startButton.focus();
      await user.keyboard('{Enter}');

      expect(mockStartDebate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Visual feedback', () => {
    it('applies disabled styling to disabled buttons', () => {
      setupStore(idle(), false);
      render(<ControlBar />);

      const startButton = screen.getByRole('button', { name: /start/i });
      expect(startButton.className).toMatch(/opacity-50|cursor-not-allowed/);
    });
  });
});
