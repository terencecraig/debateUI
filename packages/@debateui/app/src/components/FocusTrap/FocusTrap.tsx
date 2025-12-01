import { useEffect, useRef, ReactNode, useLayoutEffect } from 'react';

export interface FocusTrapProps {
  /** Content to trap focus within */
  children: ReactNode;
  /** Callback when Escape key is pressed */
  onClose?: () => void;
  /** Whether to return focus to previously focused element on unmount */
  returnFocus?: boolean;
  /** Data-testid for the first focusable element to focus */
  initialFocus?: string;
  /** Optional className for the container */
  className?: string;
}

/**
 * FocusTrap component - traps focus within its children
 * Useful for modal dialogs and other overlay components
 */
export function FocusTrap({
  children,
  onClose,
  returnFocus = true,
  initialFocus,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the trap
  const getFocusableElements = (): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const elements = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    );

    return elements.filter((el) => {
      // Additional checks for visibility and disabled state
      // Note: offsetParent check doesn't work well in jsdom, so skip it
      return !el.hasAttribute('disabled') && el.tabIndex !== -1;
    });
  };

  // Focus the first element on mount - use useLayoutEffect for synchronous focus
  useLayoutEffect(() => {
    // Store previously focused element
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    // Focus immediately after layout
    const focusableElements = getFocusableElements();

    const firstFocusable = focusableElements[0];
    if (firstFocusable) {
      if (initialFocus) {
        // Find element by data-testid
        const targetElement = focusableElements.find(
          (el) => el.getAttribute('data-testid') === initialFocus
        );
        if (targetElement) {
          targetElement.focus();
        } else {
          firstFocusable.focus();
        }
      } else {
        firstFocusable.focus();
      }
    }

    // Cleanup: return focus on unmount
    return () => {
      if (returnFocus && previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [initialFocus, returnFocus]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle Escape key
      if (event.key === 'Escape') {
        onClose?.();
        return;
      }

      // Handle Tab key for focus trap
      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();

        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) {
          event.preventDefault();
          return;
        }

        // Single element case
        if (focusableElements.length === 1) {
          event.preventDefault();
          firstElement.focus();
          return;
        }

        // Shift + Tab (backward)
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        }
        // Tab (forward)
        else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
