import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useDebateStore } from '@debateui/state';
import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    // Reset store before each test
    useDebateStore.getState().reset();
  });

  it('renders the header with app name', () => {
    render(<App />);
    // The header shows "Debate" and "UI" in separate spans
    expect(screen.getByText('Debate')).toBeInTheDocument();
    expect(screen.getByText('UI')).toBeInTheDocument();
  });

  it('renders the version number', () => {
    render(<App />);
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
  });

  it('shows Idle state initially', () => {
    render(<App />);
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('renders the configuration section', () => {
    render(<App />);
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('renders the branches section', () => {
    render(<App />);
    expect(screen.getByText(/Branches/)).toBeInTheDocument();
  });

  it('renders the metrics section', () => {
    render(<App />);
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });

  it('renders the start debate button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /start debate/i })).toBeInTheDocument();
  });

  it('shows ready to debate message when no turns', () => {
    render(<App />);
    expect(screen.getByText('Ready to Debate')).toBeInTheDocument();
  });

  it('renders the debate question textarea', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/enter your debate question/i)).toBeInTheDocument();
  });

  it('renders the participants input', () => {
    render(<App />);
    expect(screen.getByPlaceholderText('claude, gpt-4, gemini')).toBeInTheDocument();
  });
});
