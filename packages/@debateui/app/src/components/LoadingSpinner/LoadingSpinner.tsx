import clsx from 'clsx';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white';
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  color = 'primary',
  label,
  className,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const colorClasses = {
    primary: 'border-blue-600 border-t-transparent',
    secondary: 'border-gray-600 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div
        role="status"
        aria-label={label || 'Loading'}
        className={clsx(
          'animate-spin rounded-full',
          sizeClasses[size],
          colorClasses[color]
        )}
      />
      {label && (
        <span className="text-sm text-gray-700">
          {label}
        </span>
      )}
    </div>
  );
}
