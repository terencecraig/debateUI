import { useState, useEffect, useCallback, RefObject } from 'react';

export interface UseKeyboardNavigationOptions {
  /** Total number of items in the list */
  itemCount: number;
  /** Initial index to focus */
  initialIndex?: number;
  /** Whether to wrap around at boundaries */
  wrap?: boolean;
  /** Orientation of the navigation (vertical or horizontal) */
  orientation?: 'vertical' | 'horizontal';
  /** Callback when an item is selected (Enter/Space) */
  onSelect?: (index: number) => void;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
  /** Callback when the current index changes */
  onChange?: (index: number) => void;
  /** Array of disabled item indices */
  disabledIndices?: number[];
  /** Optional refs to automatically manage focus */
  refs?: Array<RefObject<HTMLElement>>;
  /** ARIA role for the container */
  role?: string;
}

export interface UseKeyboardNavigationReturn {
  /** Current focused index */
  currentIndex: number;
  /** Whether the navigation is active (user has tabbed in) */
  isActive: boolean;
  /** Keyboard event handler */
  handleKeyDown: (event: KeyboardEvent | React.KeyboardEvent) => void;
  /** Get props for a specific item (roving tabindex pattern) */
  getItemProps: (index: number) => {
    tabIndex: number;
    'aria-selected': boolean;
    id: string;
  };
  /** Get props for the container element */
  getContainerProps: () => {
    role: string;
    'aria-activedescendant': string;
  };
  /** Programmatically set the current index */
  setCurrentIndex: (index: number) => void;
}

/**
 * Custom hook for keyboard navigation patterns
 * Implements roving tabindex and arrow key navigation
 */
export function useKeyboardNavigation(
  options: UseKeyboardNavigationOptions
): UseKeyboardNavigationReturn {
  const {
    itemCount,
    initialIndex = 0,
    wrap = false,
    orientation = 'vertical',
    onSelect,
    onEscape,
    onChange,
    disabledIndices = [],
    refs,
    role = 'list',
  } = options;

  const [currentIndex, setCurrentIndexState] = useState(
    Math.max(0, Math.min(initialIndex, itemCount - 1))
  );
  const [isActive, setIsActive] = useState(false);

  // Clamp index to valid range
  const clampIndex = useCallback(
    (index: number): number => {
      if (itemCount === 0) return 0;
      return Math.max(0, Math.min(index, itemCount - 1));
    },
    [itemCount]
  );

  // Check if an index is disabled
  const isDisabled = useCallback(
    (index: number): boolean => {
      return disabledIndices.includes(index);
    },
    [disabledIndices]
  );

  // Find next non-disabled index
  const findNextEnabledIndex = useCallback(
    (startIndex: number, direction: 1 | -1): number => {
      let index = startIndex;
      let attempts = 0;

      while (attempts < itemCount) {
        index = index + direction;

        // Handle wrapping
        if (wrap) {
          if (index < 0) index = itemCount - 1;
          if (index >= itemCount) index = 0;
        } else {
          if (index < 0) return startIndex;
          if (index >= itemCount) return startIndex;
        }

        if (!isDisabled(index)) {
          return index;
        }

        attempts++;
      }

      return startIndex;
    },
    [itemCount, wrap, isDisabled]
  );

  // Update current index with clamping
  const setCurrentIndex = useCallback(
    (index: number) => {
      const clampedIndex = clampIndex(index);
      setCurrentIndexState(clampedIndex);
      onChange?.(clampedIndex);

      // Auto-focus if refs provided
      if (refs && refs[clampedIndex]?.current) {
        refs[clampedIndex].current?.focus();
      }
    },
    [clampIndex, onChange, refs]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent | React.KeyboardEvent) => {
      const { key } = event;

      // Track Tab for activation
      if (key === 'Tab') {
        setIsActive(true);
        return;
      }

      // Handle escape
      if (key === 'Escape') {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle selection
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        onSelect?.(currentIndex);
        return;
      }

      // Handle navigation
      let nextIndex = currentIndex;
      let shouldPreventDefault = true;

      if (orientation === 'vertical') {
        if (key === 'ArrowDown') {
          nextIndex = findNextEnabledIndex(currentIndex, 1);
        } else if (key === 'ArrowUp') {
          nextIndex = findNextEnabledIndex(currentIndex, -1);
        } else if (key === 'Home') {
          nextIndex = 0;
          // Find first enabled index
          while (isDisabled(nextIndex) && nextIndex < itemCount - 1) {
            nextIndex++;
          }
        } else if (key === 'End') {
          nextIndex = itemCount - 1;
          // Find last enabled index
          while (isDisabled(nextIndex) && nextIndex > 0) {
            nextIndex--;
          }
        } else {
          shouldPreventDefault = false;
        }
      } else {
        // Horizontal orientation
        if (key === 'ArrowRight') {
          nextIndex = findNextEnabledIndex(currentIndex, 1);
        } else if (key === 'ArrowLeft') {
          nextIndex = findNextEnabledIndex(currentIndex, -1);
        } else if (key === 'Home') {
          nextIndex = 0;
          while (isDisabled(nextIndex) && nextIndex < itemCount - 1) {
            nextIndex++;
          }
        } else if (key === 'End') {
          nextIndex = itemCount - 1;
          while (isDisabled(nextIndex) && nextIndex > 0) {
            nextIndex--;
          }
        } else {
          shouldPreventDefault = false;
        }
      }

      if (shouldPreventDefault && nextIndex !== currentIndex) {
        event.preventDefault();
        setCurrentIndex(nextIndex);
      } else if (shouldPreventDefault) {
        event.preventDefault();
      }
    },
    [
      currentIndex,
      orientation,
      onSelect,
      onEscape,
      findNextEnabledIndex,
      setCurrentIndex,
      isDisabled,
      itemCount,
    ]
  );

  // Get props for individual items (roving tabindex pattern)
  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === currentIndex ? 0 : -1,
      'aria-selected': index === currentIndex,
      id: `keyboard-nav-item-${index}`,
    }),
    [currentIndex]
  );

  // Get props for the container
  const getContainerProps = useCallback(
    () => ({
      role,
      'aria-activedescendant': `keyboard-nav-item-${currentIndex}`,
    }),
    [role, currentIndex]
  );

  // Update current index when item count changes
  useEffect(() => {
    if (currentIndex >= itemCount && itemCount > 0) {
      setCurrentIndex(itemCount - 1);
    }
  }, [itemCount, currentIndex, setCurrentIndex]);

  return {
    currentIndex,
    isActive,
    handleKeyDown,
    getItemProps,
    getContainerProps,
    setCurrentIndex,
  };
}
