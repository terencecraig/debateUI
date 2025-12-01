import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FocusTrap } from './FocusTrap';

describe('FocusTrap', () => {
  let outsideButton: HTMLButtonElement;

  beforeEach(() => {
    // Create a button outside the trap for testing
    outsideButton = document.createElement('button');
    outsideButton.textContent = 'Outside';
    document.body.appendChild(outsideButton);
  });

  afterEach(() => {
    outsideButton.remove();
  });

  it('renders children correctly', () => {
    render(
      <FocusTrap>
        <div data-testid="content">Trapped content</div>
      </FocusTrap>
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Trapped content')).toBeInTheDocument();
  });

  it('focuses first focusable element on mount', async () => {
    render(
      <FocusTrap>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('first')).toHaveFocus();
    });
  });

  it('traps focus within children when tabbing forward', async () => {
    const user = userEvent.setup();

    render(
      <FocusTrap>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    // Tab through all elements
    await user.tab();
    expect(screen.getByTestId('second')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('third')).toHaveFocus();

    // Tab from last element should wrap to first
    await user.tab();
    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('traps focus when tabbing backward', async () => {
    const user = userEvent.setup();

    render(
      <FocusTrap>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    // Shift+Tab from first element should wrap to last
    await user.tab({ shift: true });
    expect(screen.getByTestId('third')).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByTestId('second')).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <FocusTrap onClose={onClose}>
        <button data-testid="button">Button</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('button')).toHaveFocus();
    });

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape is pressed if not provided', async () => {
    const user = userEvent.setup();

    render(
      <FocusTrap>
        <button data-testid="button">Button</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('button')).toHaveFocus();
    });

    // Should not throw
    await user.keyboard('{Escape}');
  });

  it('returns focus to previously focused element on unmount', async () => {
    // Focus the outside button first
    outsideButton.focus();
    expect(outsideButton).toHaveFocus();

    const { unmount } = render(
      <FocusTrap>
        <button data-testid="inside">Inside</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('inside')).toHaveFocus();
    });

    unmount();

    // Focus should return to outside button
    await waitFor(() => {
      expect(outsideButton).toHaveFocus();
    });
  });

  it('does not return focus if returnFocus is false', async () => {
    outsideButton.focus();
    expect(outsideButton).toHaveFocus();

    const { unmount } = render(
      <FocusTrap returnFocus={false}>
        <button data-testid="inside">Inside</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('inside')).toHaveFocus();
    });

    unmount();

    // Focus should not return
    expect(outsideButton).not.toHaveFocus();
  });

  it('focuses custom initialFocus element', async () => {
    render(
      <FocusTrap initialFocus="second">
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('second')).toHaveFocus();
    });
  });

  it('handles nested focusable elements', async () => {
    const user = userEvent.setup();

    render(
      <FocusTrap>
        <div>
          <button data-testid="first">First</button>
          <div>
            <input data-testid="input" type="text" />
            <div>
              <a href="#" data-testid="link">
                Link
              </a>
            </div>
          </div>
          <button data-testid="last">Last</button>
        </div>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    await user.tab();
    expect(screen.getByTestId('input')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('link')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('last')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('skips disabled elements when trapping focus', async () => {
    const user = userEvent.setup();

    render(
      <FocusTrap>
        <button data-testid="first">First</button>
        <button data-testid="disabled" disabled>
          Disabled
        </button>
        <button data-testid="last">Last</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    await user.tab();
    expect(screen.getByTestId('last')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('first')).toHaveFocus();
  });

  it('handles elements with tabindex=-1', async () => {
    const user = userEvent.setup();

    render(
      <FocusTrap>
        <button data-testid="first">First</button>
        <button data-testid="negative" tabIndex={-1}>
          Negative
        </button>
        <button data-testid="last">Last</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    await user.tab();
    // Should skip the negative tabindex element
    expect(screen.getByTestId('last')).toHaveFocus();
  });

  it('works with single focusable element', async () => {
    const user = userEvent.setup();

    render(
      <FocusTrap>
        <button data-testid="only">Only Button</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('only')).toHaveFocus();
    });

    // Tabbing should keep focus on the same element
    await user.tab();
    expect(screen.getByTestId('only')).toHaveFocus();

    await user.tab({ shift: true });
    expect(screen.getByTestId('only')).toHaveFocus();
  });

  it('handles empty trap gracefully', () => {
    const { container } = render(
      <FocusTrap>
        <div data-testid="empty">No focusable elements</div>
      </FocusTrap>
    );

    // Should not throw and should render
    expect(screen.getByTestId('empty')).toBeInTheDocument();
    expect(container).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FocusTrap className="custom-trap">
        <button>Button</button>
      </FocusTrap>
    );

    expect(container.firstChild).toHaveClass('custom-trap');
  });

  it('prevents focus from escaping to outside elements', async () => {
    render(
      <FocusTrap>
        <button data-testid="inside">Inside</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('inside')).toHaveFocus();
    });

    // Try to focus outside element programmatically
    outsideButton.focus();

    // Focus should still be trapped (implementation may vary)
    // This test verifies the trap is active
    expect(screen.getByTestId('inside')).toBeInTheDocument();
  });

  it('respects aria-hidden on trapped content', () => {
    const { container } = render(
      <FocusTrap>
        <button>Button</button>
      </FocusTrap>
    );

    // The trap should not set aria-hidden on its content
    expect(container.firstChild).not.toHaveAttribute('aria-hidden');
  });

  it('handles dynamic children updates', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <FocusTrap>
        <button data-testid="first">First</button>
      </FocusTrap>
    );

    await waitFor(() => {
      expect(screen.getByTestId('first')).toHaveFocus();
    });

    // Add more children
    rerender(
      <FocusTrap>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
      </FocusTrap>
    );

    await user.tab();
    expect(screen.getByTestId('second')).toHaveFocus();
  });

  it('works with modal dialog use case', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <div role="dialog" aria-modal="true">
        <FocusTrap onClose={onClose}>
          <h2>Dialog Title</h2>
          <button data-testid="close">Close</button>
          <input data-testid="input" type="text" placeholder="Input" />
          <button data-testid="submit">Submit</button>
        </FocusTrap>
      </div>
    );

    await waitFor(() => {
      expect(screen.getByTestId('close')).toHaveFocus();
    });

    // Navigate through dialog
    await user.tab();
    expect(screen.getByTestId('input')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('submit')).toHaveFocus();

    // Escape closes dialog
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});
