import { CSSProperties } from 'react';
import clsx from 'clsx';

export interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className,
}: SkeletonProps) {
  const styles: CSSProperties = {};
  if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
  if (height) styles.height = typeof height === 'number' ? `${height}px` : height;

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-pulse',
    none: '',
  };

  return (
    <div
      className={clsx(
        'bg-gray-300',
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={styles}
      aria-busy="true"
      aria-live="polite"
    />
  );
}

export interface SkeletonTurnCardProps {
  className?: string;
}

export function SkeletonTurnCard({ className }: SkeletonTurnCardProps) {
  return (
    <article
      className={clsx(
        'rounded-lg border-2 border-gray-200 p-4 shadow-sm',
        className
      )}
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header: Participant badge and name */}
      <div className="mb-3 flex items-center justify-between" data-testid="skeleton-header">
        <div className="flex items-center gap-2">
          <Skeleton variant="rectangular" width="60px" height="24px" />
          <Skeleton variant="rectangular" width="80px" height="20px" />
        </div>
        <Skeleton variant="rectangular" width="60px" height="32px" />
      </div>

      {/* Content area */}
      <div className="mb-3 space-y-2" data-testid="skeleton-content">
        <Skeleton variant="text" width="100%" />
        <Skeleton variant="text" width="95%" />
        <Skeleton variant="text" width="90%" />
      </div>

      {/* Footer: Metrics */}
      <div
        className="flex flex-wrap items-center gap-4 border-t border-gray-200 pt-3"
        data-testid="skeleton-footer"
      >
        <Skeleton variant="rectangular" width="80px" height="16px" />
        <Skeleton variant="rectangular" width="80px" height="16px" />
        <Skeleton variant="rectangular" width="80px" height="16px" />
        <Skeleton variant="rectangular" width="120px" height="16px" className="ml-auto" />
      </div>
    </article>
  );
}

export interface SkeletonTimelineProps {
  count?: number;
  className?: string;
}

export function SkeletonTimeline({ count = 3, className }: SkeletonTimelineProps) {
  return (
    <div className={clsx('space-y-4', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonTurnCard key={index} />
      ))}
    </div>
  );
}

export interface SkeletonConfigPanelProps {
  className?: string;
}

export function SkeletonConfigPanel({ className }: SkeletonConfigPanelProps) {
  return (
    <section
      className={clsx('rounded-lg border border-gray-200 p-6', className)}
      role="region"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="space-y-6">
        {/* Topic field */}
        <div data-testid="skeleton-field-topic">
          <Skeleton variant="text" width="60px" height="16px" className="mb-2" />
          <Skeleton variant="rectangular" width="100%" height="40px" />
        </div>

        {/* Participants field */}
        <div data-testid="skeleton-field-participants">
          <Skeleton variant="text" width="80px" height="16px" className="mb-2" />
          <div className="space-y-2">
            <Skeleton variant="rectangular" width="100%" height="40px" />
            <Skeleton variant="rectangular" width="100%" height="40px" />
          </div>
        </div>

        {/* Max turns field */}
        <div data-testid="skeleton-field-maxturns">
          <Skeleton variant="text" width="70px" height="16px" className="mb-2" />
          <Skeleton variant="rectangular" width="100px" height="40px" />
        </div>

        {/* Button */}
        <div data-testid="skeleton-field-button">
          <Skeleton variant="rectangular" width="120px" height="40px" />
        </div>
      </div>
    </section>
  );
}

export interface SkeletonMetricsPanelProps {
  className?: string;
}

export function SkeletonMetricsPanel({ className }: SkeletonMetricsPanelProps) {
  return (
    <section
      className={clsx('rounded-lg border border-gray-200 p-6', className)}
      role="region"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-4">
        <Skeleton variant="text" width="120px" height="24px" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div data-testid="skeleton-metric-1" className="rounded-lg border border-gray-200 p-4">
          <Skeleton variant="text" width="80px" height="14px" className="mb-2" />
          <Skeleton variant="text" width="100px" height="32px" />
        </div>

        {/* Metric 2 */}
        <div data-testid="skeleton-metric-2" className="rounded-lg border border-gray-200 p-4">
          <Skeleton variant="text" width="80px" height="14px" className="mb-2" />
          <Skeleton variant="text" width="100px" height="32px" />
        </div>

        {/* Metric 3 */}
        <div data-testid="skeleton-metric-3" className="rounded-lg border border-gray-200 p-4">
          <Skeleton variant="text" width="80px" height="14px" className="mb-2" />
          <Skeleton variant="text" width="100px" height="32px" />
        </div>

        {/* Metric 4 */}
        <div data-testid="skeleton-metric-4" className="rounded-lg border border-gray-200 p-4">
          <Skeleton variant="text" width="80px" height="14px" className="mb-2" />
          <Skeleton variant="text" width="100px" height="32px" />
        </div>
      </div>
    </section>
  );
}
