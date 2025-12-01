import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigPanel } from './ConfigPanel';
import { useDebateStore } from '@debateui/state';

describe('ConfigPanel', () => {
  beforeEach(() => {
    // Reset store before each test
    useDebateStore.getState().reset();
  });

  describe('Rendering', () => {
    it('renders all config fields', () => {
      render(<ConfigPanel />);

      expect(screen.getByLabelText(/question/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/participants/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rounds/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/consensus threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/save/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/explore/i)).toBeInTheDocument();
    });

    it('displays default config values', () => {
      render(<ConfigPanel />);

      const questionInput = screen.getByLabelText(/question/i) as HTMLTextAreaElement;
      const roundsInput = screen.getByLabelText(/rounds/i) as HTMLInputElement;
      const thresholdInput = screen.getByLabelText(/consensus threshold/i) as HTMLInputElement;

      expect(questionInput.value).toBe('');
      expect(roundsInput.value).toBe('4');
      expect(thresholdInput.value).toBe('0.8');
    });
  });

  describe('Question Field', () => {
    it('updates store when question changes', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const questionInput = screen.getByLabelText(/question/i);
      await user.type(questionInput, 'What is the meaning of life?');

      const state = useDebateStore.getState();
      expect(state.config.question).toBe('What is the meaning of life?');
    });

    it('shows validation error for short question', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const questionInput = screen.getByLabelText(/question/i);
      await user.type(questionInput, 'Short');
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/question must be at least 10 characters/i)).toBeInTheDocument();
      });
    });

    it('clears validation error when question becomes valid', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const questionInput = screen.getByLabelText(/question/i);
      await user.type(questionInput, 'Short');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/question must be at least 10 characters/i)).toBeInTheDocument();
      });

      await user.clear(questionInput);
      await user.type(questionInput, 'This is a valid question with enough characters');

      await waitFor(() => {
        expect(screen.queryByText(/question must be at least 10 characters/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Participants Field', () => {
    it('updates store with comma-separated participants', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const participantsInput = screen.getByLabelText(/participants/i);
      await user.click(participantsInput);
      await user.paste('claude, gpt4, gemini');

      const state = useDebateStore.getState();
      expect(state.config.participants).toEqual(['claude', 'gpt4', 'gemini']);
    });

    it('trims whitespace from participant names', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const participantsInput = screen.getByLabelText(/participants/i);
      await user.click(participantsInput);
      await user.paste('  claude  ,  gpt4  ');

      const state = useDebateStore.getState();
      expect(state.config.participants).toEqual(['claude', 'gpt4']);
    });

    it('shows validation error for single participant', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const participantsInput = screen.getByLabelText(/participants/i);
      await user.type(participantsInput, 'claude');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/at least 2 participants required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for too many participants', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const participantsInput = screen.getByLabelText(/participants/i);
      await user.click(participantsInput);
      await user.paste('a, b, c, d, e, f, g, h');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/maximum 7 participants allowed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Rounds Field', () => {
    it('updates store when rounds changes', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const roundsInput = screen.getByLabelText(/rounds/i);
      await user.clear(roundsInput);
      await user.type(roundsInput, '5');

      const state = useDebateStore.getState();
      expect(state.config.rounds).toBe(5);
    });

    it('shows validation error for rounds below minimum', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const roundsInput = screen.getByLabelText(/rounds/i);
      await user.clear(roundsInput);
      await user.type(roundsInput, '0');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/at least 1 round required/i)).toBeInTheDocument();
      });
    });

    it('shows validation error for rounds above maximum', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const roundsInput = screen.getByLabelText(/rounds/i);
      await user.clear(roundsInput);
      await user.type(roundsInput, '11');
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/maximum 10 rounds allowed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Consensus Threshold Slider', () => {
    it('updates store when threshold changes', async () => {
      render(<ConfigPanel />);

      const thresholdInput = screen.getByLabelText(/consensus threshold/i) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(thresholdInput, { target: { value: '0.65' } });
      });

      const state = useDebateStore.getState();
      expect(state.config.consensusThreshold).toBe(0.65);
    });

    it('displays threshold as percentage', () => {
      render(<ConfigPanel />);

      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('updates percentage display when threshold changes', async () => {
      render(<ConfigPanel />);

      const thresholdInput = screen.getByLabelText(/consensus threshold/i) as HTMLInputElement;

      await act(async () => {
        fireEvent.change(thresholdInput, { target: { value: '0.6' } });
      });

      await waitFor(() => {
        expect(screen.getByText('60%')).toBeInTheDocument();
      });
    });
  });

  describe('Fork Mode Radio Buttons', () => {
    it('defaults to save mode', () => {
      render(<ConfigPanel />);

      const saveRadio = screen.getByLabelText(/save/i) as HTMLInputElement;
      expect(saveRadio.checked).toBe(true);
    });

    it('updates store when explore mode selected', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const exploreRadio = screen.getByLabelText(/explore/i);
      await user.click(exploreRadio);

      const state = useDebateStore.getState();
      expect(state.config.forkMode).toBe('explore');
    });

    it('updates store when save mode selected', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      // First select explore
      const exploreRadio = screen.getByLabelText(/explore/i);
      await user.click(exploreRadio);

      // Then select save again
      const saveRadio = screen.getByLabelText(/save/i);
      await user.click(saveRadio);

      const state = useDebateStore.getState();
      expect(state.config.forkMode).toBe('save');
    });
  });

  describe('Field Disabling', () => {
    it('disables all fields when debate is running', () => {
      // Start a debate
      const store = useDebateStore.getState();
      store.setConfig({ question: 'Test question?', participants: ['a', 'b'] });
      store.startDebate();
      store.debateStarted('debate-123');

      render(<ConfigPanel />);

      expect(screen.getByLabelText(/question/i)).toBeDisabled();
      expect(screen.getByLabelText(/participants/i)).toBeDisabled();
      expect(screen.getByLabelText(/rounds/i)).toBeDisabled();
      expect(screen.getByLabelText(/consensus threshold/i)).toBeDisabled();
      expect(screen.getByLabelText(/save/i)).toBeDisabled();
      expect(screen.getByLabelText(/explore/i)).toBeDisabled();
    });

    it('enables all fields when debate is idle', () => {
      render(<ConfigPanel />);

      expect(screen.getByLabelText(/question/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/participants/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/rounds/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/consensus threshold/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/save/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/explore/i)).not.toBeDisabled();
    });

    it('disables fields when debate is paused', () => {
      // Start and then pause a debate
      const store = useDebateStore.getState();
      store.setConfig({ question: 'Test?', participants: ['a', 'b'] });
      store.startDebate();
      store.debateStarted('debate-123');
      store.pauseDebate('User paused');

      render(<ConfigPanel />);

      expect(screen.getByLabelText(/question/i)).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for all form elements', () => {
      render(<ConfigPanel />);

      expect(screen.getByLabelText(/question/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/participants/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/rounds/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/consensus threshold/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/save/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/explore/i)).toBeInTheDocument();
    });

    it('associates error messages with fields via aria-describedby', async () => {
      const user = userEvent.setup();
      render(<ConfigPanel />);

      const questionInput = screen.getByLabelText(/question/i);
      await user.type(questionInput, 'Short');
      await user.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText(/question must be at least 10 characters/i);
        expect(errorMessage).toBeInTheDocument();
        expect(questionInput.getAttribute('aria-describedby')).toBeTruthy();
      });
    });
  });
});
