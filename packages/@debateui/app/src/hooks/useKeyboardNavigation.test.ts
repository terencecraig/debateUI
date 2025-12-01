import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNavigation } from './useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  let mockElements: HTMLElement[];

  beforeEach(() => {
    // Create mock focusable elements
    mockElements = Array.from({ length: 5 }, (_, i) => {
      const el = document.createElement('button');
      el.setAttribute('data-testid', `item-${i}`);
      el.tabIndex = i === 0 ? 0 : -1;
      document.body.appendChild(el);
      return el;
    });
  });

  afterEach(() => {
    // Clean up DOM
    mockElements.forEach((el) => el.remove());
  });

  it('initializes with first item focused', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
      })
    );

    expect(result.current.currentIndex).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('initializes with custom initial index', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 2,
      })
    );

    expect(result.current.currentIndex).toBe(2);
  });

  it('moves to next item on ArrowDown', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it('moves to previous item on ArrowUp', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 2,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it('moves to next item on ArrowRight', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
        orientation: 'horizontal',
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it('moves to previous item on ArrowLeft', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 2,
        orientation: 'horizontal',
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it('moves to first item on Home', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 3,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Home' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('moves to last item on End', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'End' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(4);
  });

  it('wraps around at end when wrap is enabled', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 4,
        wrap: true,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('wraps around at start when wrap is enabled', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
        wrap: true,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(4);
  });

  it('does not wrap around when wrap is disabled', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 4,
        wrap: false,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(4);
  });

  it('calls onSelect with Enter key', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 2,
        onSelect,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      result.current.handleKeyDown(event);
    });

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('calls onSelect with Space key', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 3,
        onSelect,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: ' ' });
      result.current.handleKeyDown(event);
    });

    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
        onEscape,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      result.current.handleKeyDown(event);
    });

    expect(onEscape).toHaveBeenCalled();
  });

  it('prevents default behavior for handled keys', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
      })
    );

    const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    act(() => {
      result.current.handleKeyDown(event);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('returns roving tabindex props for items', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 2,
      })
    );

    const props0 = result.current.getItemProps(0);
    const props2 = result.current.getItemProps(2);
    const props4 = result.current.getItemProps(4);

    expect(props0.tabIndex).toBe(-1);
    expect(props2.tabIndex).toBe(0);
    expect(props4.tabIndex).toBe(-1);
  });

  it('includes aria-selected for current item', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 1,
      })
    );

    const props0 = result.current.getItemProps(0);
    const props1 = result.current.getItemProps(1);

    expect(props0['aria-selected']).toBe(false);
    expect(props1['aria-selected']).toBe(true);
  });

  it('allows programmatic focus change', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
      })
    );

    act(() => {
      result.current.setCurrentIndex(3);
    });

    expect(result.current.currentIndex).toBe(3);
  });

  it('clamps programmatic index to valid range', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
      })
    );

    act(() => {
      result.current.setCurrentIndex(10);
    });

    expect(result.current.currentIndex).toBe(4);

    act(() => {
      result.current.setCurrentIndex(-5);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('handles empty list gracefully', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 0,
        initialIndex: 0,
      })
    );

    expect(result.current.currentIndex).toBe(0);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('skips disabled items when navigating', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
        disabledIndices: [1, 2],
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    // Should skip indices 1 and 2, landing on 3
    expect(result.current.currentIndex).toBe(3);
  });

  it('supports onChange callback', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
        onChange,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('manages focus with refs', () => {
    const refs = mockElements.map((el) => ({ current: el }));
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
        refs,
      })
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      result.current.handleKeyDown(event);
    });

    // Check that the new current element received focus
    expect(document.activeElement).toBe(mockElements[1]);
  });

  it('handles Tab key for activation', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
      })
    );

    expect(result.current.isActive).toBe(false);

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Tab' });
      result.current.handleKeyDown(event);
    });

    expect(result.current.isActive).toBe(true);
  });

  it('returns container props with proper role', () => {
    const { result } = renderHook(() =>
      useKeyboardNavigation({
        itemCount: 5,
        initialIndex: 0,
        role: 'listbox',
      })
    );

    const containerProps = result.current.getContainerProps();

    expect(containerProps.role).toBe('listbox');
    expect(containerProps['aria-activedescendant']).toBeDefined();
  });

  it('updates when itemCount changes', () => {
    const { result, rerender } = renderHook(
      ({ count }) =>
        useKeyboardNavigation({
          itemCount: count,
          initialIndex: 0,
        }),
      { initialProps: { count: 5 } }
    );

    act(() => {
      result.current.setCurrentIndex(3);
    });

    expect(result.current.currentIndex).toBe(3);

    // Reduce item count to 2
    rerender({ count: 2 });

    // Index should be clamped to valid range
    expect(result.current.currentIndex).toBe(1);
  });
});
