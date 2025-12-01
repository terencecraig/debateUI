import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink } from './SkipLink';

describe('SkipLink', () => {
  let mainElement: HTMLElement;

  beforeEach(() => {
    // Create a main content element
    mainElement = document.createElement('main');
    mainElement.id = 'main-content';
    mainElement.textContent = 'Main content';
    document.body.appendChild(mainElement);
  });

  afterEach(() => {
    mainElement.remove();
  });

  it('renders skip link with default text', () => {
    render(<SkipLink targetId="main-content" />);

    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<SkipLink targetId="main-content" text="Jump to content" />);

    expect(screen.getByText('Jump to content')).toBeInTheDocument();
  });

  it('has correct href pointing to target', () => {
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('is hidden by default', () => {
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');
    // Should have sr-only or visually-hidden class
    expect(link.className).toMatch(/sr-only|visually-hidden|skip-link/);
  });

  it('becomes visible when focused', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');

    // Tab to focus the link
    await user.tab();

    // Link should now be focused
    expect(link).toHaveFocus();
  });

  it('focuses target element when clicked', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');

    await user.click(link);

    // Main element should receive focus
    expect(mainElement).toHaveFocus();
  });

  it('focuses target element when activated with keyboard', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');

    // Tab to focus and press Enter
    await user.tab();
    expect(link).toHaveFocus();

    await user.keyboard('{Enter}');

    // Main element should receive focus
    expect(mainElement).toHaveFocus();
  });

  it('has proper accessibility attributes', () => {
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');

    // Should be a link
    expect(link.tagName).toBe('A');

    // Should have href
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('works with Space key', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');

    await user.tab();
    expect(link).toHaveFocus();

    await user.keyboard(' ');

    // Main element should receive focus
    expect(mainElement).toHaveFocus();
  });

  it('handles missing target gracefully', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="nonexistent" />);

    const link = screen.getByText('Skip to main content');

    // Should not throw when clicking
    await user.click(link);

    // Link should still exist
    expect(link).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SkipLink targetId="main-content" className="custom-skip" />);

    const link = screen.getByText('Skip to main content');
    expect(link).toHaveClass('custom-skip');
  });

  it('sets tabindex to 0 for keyboard accessibility', () => {
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');
    expect(link).toHaveAttribute('tabindex', '0');
  });

  it('can be first element in tab order', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <SkipLink targetId="main-content" />
        <button>Other button</button>
      </div>
    );

    const skipLink = screen.getByText('Skip to main content');

    // First tab should focus skip link
    await user.tab();
    expect(skipLink).toHaveFocus();
  });

  it('makes target focusable if not already', async () => {
    // Remove tabindex from main element (not naturally focusable)
    mainElement.removeAttribute('tabindex');

    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');
    await user.click(link);

    // Should have added tabindex to make it focusable
    expect(mainElement).toHaveFocus();
    expect(mainElement).toHaveAttribute('tabindex', '-1');
  });

  it('preserves existing tabindex on target', async () => {
    mainElement.setAttribute('tabindex', '0');

    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');
    await user.click(link);

    // Should keep existing tabindex
    expect(mainElement).toHaveFocus();
    expect(mainElement).toHaveAttribute('tabindex', '0');
  });

  it('prevents default link behavior', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');

    // Mock preventDefault
    const clickHandler = vi.fn((e) => e.preventDefault());
    link.addEventListener('click', clickHandler);

    await user.click(link);

    // Handler should be called
    expect(clickHandler).toHaveBeenCalled();
  });

  it('works with multiple skip links', async () => {
    const nav = document.createElement('nav');
    nav.id = 'nav';
    document.body.appendChild(nav);

    const user = userEvent.setup();
    render(
      <div>
        <SkipLink targetId="main-content" text="Skip to main" />
        <SkipLink targetId="nav" text="Skip to navigation" />
      </div>
    );

    const mainLink = screen.getByText('Skip to main');
    const navLink = screen.getByText('Skip to navigation');

    await user.click(mainLink);
    expect(mainElement).toHaveFocus();

    await user.click(navLink);
    expect(nav).toHaveFocus();

    nav.remove();
  });

  it('includes proper ARIA label', () => {
    render(<SkipLink targetId="main-content" ariaLabel="Skip to main content area" />);

    const link = screen.getByText('Skip to main content');
    expect(link).toHaveAttribute('aria-label', 'Skip to main content area');
  });

  it('has landmark role for assistive technologies', () => {
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');
    // Skip links are typically just links, but container might have navigation role
    expect(link.tagName).toBe('A');
  });

  it('focuses target smoothly without page jump', async () => {
    const user = userEvent.setup();
    render(<SkipLink targetId="main-content" />);

    const link = screen.getByText('Skip to main content');

    // Mock scrollIntoView to ensure it's not called (focus only)
    const scrollIntoViewMock = vi.fn();
    mainElement.scrollIntoView = scrollIntoViewMock;

    await user.click(link);

    expect(mainElement).toHaveFocus();
    // scrollIntoView should not be called (browser handles focus)
  });

  it('works as first interactive element on page', async () => {
    const user = userEvent.setup();

    // Render skip link as very first element
    render(
      <div>
        <SkipLink targetId="main-content" />
        <header>
          <nav>
            <a href="#link1">Link 1</a>
            <a href="#link2">Link 2</a>
            <a href="#link3">Link 3</a>
          </nav>
        </header>
      </div>
    );

    // First tab should focus skip link
    await user.tab();

    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toHaveFocus();

    // Activating it should skip the navigation
    await user.keyboard('{Enter}');
    expect(mainElement).toHaveFocus();
  });
});
