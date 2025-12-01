import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Skeleton,
  SkeletonTurnCard,
  SkeletonTimeline,
  SkeletonConfigPanel,
  SkeletonMetricsPanel
} from './Skeleton';

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('supports rectangular variant', () => {
    const { container } = render(<Skeleton variant="rectangular" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded');
  });

  it('supports text variant', () => {
    const { container } = render(<Skeleton variant="text" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded');
  });

  it('supports circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('rounded-full');
  });

  it('supports custom width', () => {
    const { container } = render(<Skeleton width="200px" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ width: '200px' });
  });

  it('supports custom height', () => {
    const { container } = render(<Skeleton height="50px" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveStyle({ height: '50px' });
  });

  it('supports wave animation', () => {
    const { container } = render(<Skeleton animation="wave" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('supports pulse animation', () => {
    const { container } = render(<Skeleton animation="pulse" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveClass('animate-pulse');
  });

  it('supports no animation', () => {
    const { container } = render(<Skeleton animation="none" />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).not.toHaveClass('animate-pulse');
  });

  it('has aria-busy attribute', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute('aria-busy', 'true');
  });

  it('has aria-live attribute', () => {
    const { container } = render(<Skeleton />);
    const skeleton = container.firstChild as HTMLElement;
    expect(skeleton).toHaveAttribute('aria-live', 'polite');
  });
});

describe('SkeletonTurnCard', () => {
  it('renders a card-like skeleton', () => {
    const { container } = render(<SkeletonTurnCard />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('has aria-busy attribute', () => {
    render(<SkeletonTurnCard />);
    const skeleton = screen.getByRole('article', { busy: true });
    expect(skeleton).toBeInTheDocument();
  });

  it('matches TurnCard layout with header skeleton', () => {
    const { container } = render(<SkeletonTurnCard />);
    const headerSkeletons = container.querySelectorAll('[data-testid="skeleton-header"] > div');
    expect(headerSkeletons.length).toBeGreaterThan(0);
  });

  it('matches TurnCard layout with content skeleton', () => {
    const { container } = render(<SkeletonTurnCard />);
    const contentSkeleton = container.querySelector('[data-testid="skeleton-content"]');
    expect(contentSkeleton).toBeInTheDocument();
  });

  it('matches TurnCard layout with footer skeleton', () => {
    const { container } = render(<SkeletonTurnCard />);
    const footerSkeleton = container.querySelector('[data-testid="skeleton-footer"]');
    expect(footerSkeleton).toBeInTheDocument();
  });
});

describe('SkeletonTimeline', () => {
  it('renders multiple SkeletonTurnCards', () => {
    render(<SkeletonTimeline count={3} />);
    const skeletons = screen.getAllByRole('article', { busy: true });
    expect(skeletons).toHaveLength(3);
  });

  it('renders default 3 cards when count not specified', () => {
    render(<SkeletonTimeline />);
    const skeletons = screen.getAllByRole('article', { busy: true });
    expect(skeletons).toHaveLength(3);
  });

  it('renders custom count of cards', () => {
    render(<SkeletonTimeline count={5} />);
    const skeletons = screen.getAllByRole('article', { busy: true });
    expect(skeletons).toHaveLength(5);
  });
});

describe('SkeletonConfigPanel', () => {
  it('renders form field placeholders', () => {
    const { container } = render(<SkeletonConfigPanel />);
    const skeletons = container.querySelectorAll('[data-testid^="skeleton-field"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has aria-busy attribute', () => {
    render(<SkeletonConfigPanel />);
    const skeleton = screen.getByRole('region', { busy: true });
    expect(skeleton).toBeInTheDocument();
  });

  it('matches ConfigPanel layout with multiple fields', () => {
    const { container } = render(<SkeletonConfigPanel />);
    const skeletons = container.querySelectorAll('[data-testid^="skeleton-field"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});

describe('SkeletonMetricsPanel', () => {
  it('renders metric card placeholders', () => {
    const { container } = render(<SkeletonMetricsPanel />);
    const skeletons = container.querySelectorAll('[data-testid^="skeleton-metric"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('has aria-busy attribute', () => {
    render(<SkeletonMetricsPanel />);
    const skeleton = screen.getByRole('region', { busy: true });
    expect(skeleton).toBeInTheDocument();
  });

  it('matches MetricsPanel layout with multiple metrics', () => {
    const { container } = render(<SkeletonMetricsPanel />);
    const skeletons = container.querySelectorAll('[data-testid^="skeleton-metric"]');
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });
});
