import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default size (md)', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('[role="status"]');
    expect(spinner).toBeInTheDocument();
  });

  it('supports sm size (16px)', () => {
    const { container } = render(<LoadingSpinner size="sm" />);
    const spinner = container.querySelector('.w-4');
    expect(spinner).toBeInTheDocument();
  });

  it('supports md size (24px)', () => {
    const { container } = render(<LoadingSpinner size="md" />);
    const spinner = container.querySelector('.w-6');
    expect(spinner).toBeInTheDocument();
  });

  it('supports lg size (32px)', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    const spinner = container.querySelector('.w-8');
    expect(spinner).toBeInTheDocument();
  });

  it('supports xl size (48px)', () => {
    const { container } = render(<LoadingSpinner size="xl" />);
    const spinner = container.querySelector('.w-12');
    expect(spinner).toBeInTheDocument();
  });

  it('supports primary color (blue)', () => {
    const { container } = render(<LoadingSpinner color="primary" />);
    const spinner = container.querySelector('.border-blue-600');
    expect(spinner).toBeInTheDocument();
  });

  it('supports secondary color (gray)', () => {
    const { container } = render(<LoadingSpinner color="secondary" />);
    const spinner = container.querySelector('.border-gray-600');
    expect(spinner).toBeInTheDocument();
  });

  it('supports white color', () => {
    const { container } = render(<LoadingSpinner color="white" />);
    const spinner = container.querySelector('.border-white');
    expect(spinner).toBeInTheDocument();
  });

  it('shows label when provided', () => {
    render(<LoadingSpinner label="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('does not show label when not provided', () => {
    const { container } = render(<LoadingSpinner />);
    const text = container.querySelector('span:not([role="status"])');
    expect(text).not.toBeInTheDocument();
  });

  it('has accessible role', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
  });

  it('has accessible label', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('uses custom aria-label when label prop provided', () => {
    render(<LoadingSpinner label="Loading data..." />);
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading data...');
  });

  it('animates (has animation class)', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with default primary color when color not specified', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.border-blue-600');
    expect(spinner).toBeInTheDocument();
  });

  it('combines size and color classes correctly', () => {
    const { container } = render(<LoadingSpinner size="lg" color="white" />);
    const spinner = container.querySelector('.w-8.border-white');
    expect(spinner).toBeInTheDocument();
  });
});
