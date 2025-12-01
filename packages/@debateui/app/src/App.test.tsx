import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDebateStore } from '@debateui/state';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    useDebateStore.getState().reset();
  });

  describe('Question Step', () => {
    it('renders the question step by default', () => {
      render(<App />);
      expect(screen.getByText('What would you like to explore?')).toBeInTheDocument();
    });

    it('renders the header with app name', () => {
      render(<App />);
      expect(screen.getByText('DebateUI')).toBeInTheDocument();
    });

    it('shows example questions', () => {
      render(<App />);
      expect(screen.getByText(/trade-offs between React and Vue/)).toBeInTheDocument();
    });

    it('disables continue button when question is too short', () => {
      render(<App />);
      const button = screen.getByRole('button', { name: /continue/i });
      expect(button).toBeDisabled();
    });

    it('enables continue button when question is long enough', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'This is a test question that is long enough');

      const button = screen.getByRole('button', { name: /continue/i });
      expect(button).not.toBeDisabled();
    });

    it('clicking example fills in the question', async () => {
      const user = userEvent.setup();
      render(<App />);

      const exampleButton = screen.getByText(/trade-offs between React and Vue/);
      await user.click(exampleButton);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      expect(textarea).toHaveValue('What are the trade-offs between React and Vue for a startup?');
    });
  });

  describe('Goal Step', () => {
    it('advances to goal step after entering question', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'This is a test question that is long enough');

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);

      expect(screen.getByText("What's your priority?")).toBeInTheDocument();
    });

    it('shows three goal options', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Enter question and advance
      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'This is a test question that is long enough');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(screen.getByText('Maximum Accuracy')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
      expect(screen.getByText('Budget Friendly')).toBeInTheDocument();
    });

    it('allows going back to question step', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Enter question and advance
      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'This is a test question that is long enough');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Click back
      await user.click(screen.getByRole('button', { name: /back/i }));

      expect(screen.getByText('What would you like to explore?')).toBeInTheDocument();
    });
  });

  describe('Recommendation Step', () => {
    it('shows recommendation after selecting goal', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Enter question
      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'Should we use microservices or monolith for our API?');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      // Select goal
      await user.click(screen.getByText('Maximum Accuracy'));

      // Wait for recommendation step
      await waitFor(() => {
        expect(screen.getByText('Your Debate Panel')).toBeInTheDocument();
      });
    });

    it('shows detected category', async () => {
      const user = userEvent.setup();
      render(<App />);

      // Enter technical question
      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'How should I implement this API endpoint?');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await user.click(screen.getByText('Balanced'));

      await waitFor(() => {
        expect(screen.getByText('Technical Question')).toBeInTheDocument();
      });
    });

    it('shows recommended agents', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'How should I implement this API endpoint?');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await user.click(screen.getByText('Maximum Accuracy'));

      await waitFor(() => {
        expect(screen.getByText('Claude 3.5 Sonnet')).toBeInTheDocument();
      });
    });

    it('shows reasoning for selection', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'How should I implement this API endpoint?');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await user.click(screen.getByText('Maximum Accuracy'));

      await waitFor(() => {
        expect(screen.getByText('Why this panel?')).toBeInTheDocument();
      });
    });

    it('shows cost and time estimates', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'How should I implement this API endpoint?');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      await user.click(screen.getByText('Maximum Accuracy'));

      await waitFor(() => {
        expect(screen.getByText('cost')).toBeInTheDocument();
        expect(screen.getByText('time')).toBeInTheDocument();
      });
    });
  });

  describe('Category Detection', () => {
    it('detects technical questions', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'How do I fix this bug in my code?');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByText('Balanced'));

      await waitFor(() => {
        expect(screen.getByText('Technical Question')).toBeInTheDocument();
      });
    });

    it('detects creative questions', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'Help me brainstorm ideas for a creative story');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByText('Balanced'));

      await waitFor(() => {
        expect(screen.getByText('Creative Question')).toBeInTheDocument();
      });
    });

    it('detects analytical questions', async () => {
      const user = userEvent.setup();
      render(<App />);

      const textarea = screen.getByPlaceholderText(/microservices or a monolith/);
      await user.type(textarea, 'Can you analyze the pros and cons of remote work?');
      await user.click(screen.getByRole('button', { name: /continue/i }));
      await user.click(screen.getByText('Balanced'));

      await waitFor(() => {
        expect(screen.getByText('Analytical Question')).toBeInTheDocument();
      });
    });
  });

  describe('Progress Indicator', () => {
    it('shows progress steps', () => {
      render(<App />);
      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('Goal')).toBeInTheDocument();
      expect(screen.getByText('Panel')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('shows footer with AI providers', () => {
      render(<App />);
      expect(screen.getByText(/Powered by Claude, GPT-4, Gemini & DeepSeek/)).toBeInTheDocument();
    });
  });
});
