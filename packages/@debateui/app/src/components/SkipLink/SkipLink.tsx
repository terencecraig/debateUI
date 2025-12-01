import { MouseEvent, KeyboardEvent } from 'react';

export interface SkipLinkProps {
  /** ID of the target element to skip to */
  targetId: string;
  /** Text to display in the skip link */
  text?: string;
  /** Optional custom className */
  className?: string;
  /** Optional ARIA label */
  ariaLabel?: string;
}

/**
 * SkipLink component - provides "Skip to main content" functionality
 * Visually hidden until focused, keyboard accessible
 */
export function SkipLink({
  targetId,
  text = 'Skip to main content',
  className = '',
  ariaLabel,
}: SkipLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    focusTarget();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      focusTarget();
    }
  };

  const focusTarget = () => {
    const target = document.getElementById(targetId);

    if (target) {
      // Make target focusable if it isn't already
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }

      // Focus the target
      target.focus();
    }
  };

  // Styles for visually hidden but screen-reader accessible
  const skipLinkStyles = {
    position: 'absolute' as const,
    left: '-10000px',
    top: 'auto',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
  };

  const skipLinkFocusStyles = {
    position: 'absolute' as const,
    left: '0',
    top: '0',
    width: 'auto',
    height: 'auto',
    overflow: 'visible',
    zIndex: 9999,
    padding: '0.5rem 1rem',
    backgroundColor: '#000',
    color: '#fff',
    textDecoration: 'none',
    border: '2px solid #fff',
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`skip-link ${className}`.trim()}
      aria-label={ariaLabel}
      style={{
        ...skipLinkStyles,
        // Use CSS-in-JS for focus state
      }}
      onFocus={(e) => {
        Object.assign(e.currentTarget.style, skipLinkFocusStyles);
      }}
      onBlur={(e) => {
        Object.assign(e.currentTarget.style, skipLinkStyles);
      }}
    >
      {text}
    </a>
  );
}
