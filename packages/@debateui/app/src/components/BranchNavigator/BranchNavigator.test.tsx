import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchNavigator } from './BranchNavigator';
import type { BranchInfo } from '@debateui/core';
import * as O from 'fp-ts/Option';

// Mock the state selectors
vi.mock('@debateui/state', () => ({
  useAllBranches: vi.fn(),
  useActiveBranch: vi.fn(),
  useBranchCount: vi.fn(),
  useDebateStore: vi.fn(),
}));

import { useAllBranches, useActiveBranch, useBranchCount, useDebateStore } from '@debateui/state';

const mockUseAllBranches = useAllBranches as ReturnType<typeof vi.fn>;
const mockUseActiveBranch = useActiveBranch as ReturnType<typeof vi.fn>;
const mockUseBranchCount = useBranchCount as ReturnType<typeof vi.fn>;
const mockUseDebateStore = useDebateStore as unknown as ReturnType<typeof vi.fn>;

describe('BranchNavigator', () => {
  const mockSelectBranch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDebateStore.mockReturnValue({
      selectBranch: mockSelectBranch,
    });
  });

  describe('Empty State', () => {
    it('renders empty state when no branches exist', () => {
      mockUseAllBranches.mockReturnValue([]);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(0);

      render(<BranchNavigator />);

      expect(screen.getByText(/no branches/i)).toBeInTheDocument();
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });

    it('empty state is accessible to screen readers', () => {
      mockUseAllBranches.mockReturnValue([]);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(0);

      render(<BranchNavigator />);

      const emptyState = screen.getByText(/no branches/i);
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toBeVisible();
    });
  });

  describe('Branch List Rendering', () => {
    const mockBranches: BranchInfo[] = [
      {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2024-01-01T10:00:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174001',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174010',
        name: 'feature-branch',
        forkMode: 'explore',
        depth: 1,
        createdAt: '2024-01-01T10:01:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174002',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174001',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174011',
        name: 'deep-branch',
        forkMode: 'save',
        depth: 2,
        createdAt: '2024-01-01T10:02:00Z',
      },
    ];

    it('renders list of branches', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const tree = screen.getByRole('tree');
      expect(tree).toBeInTheDocument();

      expect(screen.getByText('main')).toBeInTheDocument();
      expect(screen.getByText('feature-branch')).toBeInTheDocument();
      expect(screen.getByText('deep-branch')).toBeInTheDocument();
    });

    it('shows branch hierarchy with indentation based on depth', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const mainBranchItem = screen.getByText('main').closest('[role="treeitem"]');
      const featureBranchItem = screen.getByText('feature-branch').closest('[role="treeitem"]');
      const deepBranchItem = screen.getByText('deep-branch').closest('[role="treeitem"]');

      expect(mainBranchItem).toHaveAttribute('aria-level', '0');
      expect(featureBranchItem).toHaveAttribute('aria-level', '1');
      expect(deepBranchItem).toHaveAttribute('aria-level', '2');
    });

    it('displays branch metadata (name, fork mode)', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      expect(screen.getByText('main')).toBeInTheDocument();
      expect(screen.getAllByText('save')).toHaveLength(2); // Two branches with 'save' mode

      expect(screen.getByText('feature-branch')).toBeInTheDocument();
      expect(screen.getByText('explore')).toBeInTheDocument();
    });

    it('formats creation time', () => {
      mockUseAllBranches.mockReturnValue([mockBranches[0]]);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(1);

      render(<BranchNavigator />);

      // Should display formatted time (not raw ISO string)
      expect(screen.queryByText('2024-01-01T10:00:00Z')).not.toBeInTheDocument();
      // Should have some kind of formatted time
      const mainBranchItem = screen.getByText('main').closest('[role="treeitem"]');
      expect(mainBranchItem).toBeTruthy();
    });
  });

  describe('Active Branch Highlighting', () => {
    const mockBranches: BranchInfo[] = [
      {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2024-01-01T10:00:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174001',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174010',
        name: 'feature-branch',
        forkMode: 'explore',
        depth: 1,
        createdAt: '2024-01-01T10:01:00Z',
      },
    ];

    it('highlights active branch', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.some(mockBranches[1]));
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const featureBranchItem = screen.getByText('feature-branch').closest('[role="treeitem"]');
      expect(featureBranchItem).toHaveAttribute('aria-selected', 'true');

      const mainBranchItem = screen.getByText('main').closest('[role="treeitem"]');
      expect(mainBranchItem).toHaveAttribute('aria-selected', 'false');
    });

    it('no branch highlighted when none active', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const mainBranchItem = screen.getByText('main').closest('[role="treeitem"]');
      const featureBranchItem = screen.getByText('feature-branch').closest('[role="treeitem"]');

      expect(mainBranchItem).toHaveAttribute('aria-selected', 'false');
      expect(featureBranchItem).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('Branch Selection', () => {
    const mockBranches: BranchInfo[] = [
      {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2024-01-01T10:00:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174001',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174010',
        name: 'feature-branch',
        forkMode: 'explore',
        depth: 1,
        createdAt: '2024-01-01T10:01:00Z',
      },
    ];

    it('calls selectBranch on branch click', async () => {
      const user = userEvent.setup();
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const featureBranchItem = screen.getByText('feature-branch').closest('[role="treeitem"]');
      expect(featureBranchItem).toBeTruthy();

      await user.click(featureBranchItem!);

      expect(mockSelectBranch).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');
      expect(mockSelectBranch).toHaveBeenCalledTimes(1);
    });

    it('allows clicking different branches', async () => {
      const user = userEvent.setup();
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const mainBranchItem = screen.getByText('main').closest('[role="treeitem"]');
      await user.click(mainBranchItem!);
      expect(mockSelectBranch).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');

      const featureBranchItem = screen.getByText('feature-branch').closest('[role="treeitem"]');
      await user.click(featureBranchItem!);
      expect(mockSelectBranch).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174001');

      expect(mockSelectBranch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Keyboard Navigation', () => {
    const mockBranches: BranchInfo[] = [
      {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2024-01-01T10:00:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174001',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174010',
        name: 'feature-branch',
        forkMode: 'explore',
        depth: 1,
        createdAt: '2024-01-01T10:01:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174002',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174001',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174011',
        name: 'deep-branch',
        forkMode: 'save',
        depth: 2,
        createdAt: '2024-01-01T10:02:00Z',
      },
    ];

    it('handles ArrowDown navigation', async () => {
      const user = userEvent.setup();
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const tree = screen.getByRole('tree');
      tree.focus();

      await user.keyboard('{ArrowDown}');

      // First item should receive focus
      const mainBranchItem = screen.getByText('main').closest('[role="treeitem"]');
      expect(mainBranchItem).toHaveFocus();
    });

    it('handles ArrowUp navigation', async () => {
      const user = userEvent.setup();
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const tree = screen.getByRole('tree');
      tree.focus();

      // Move down twice
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{ArrowDown}');

      // Move up once
      await user.keyboard('{ArrowUp}');

      const mainBranchItem = screen.getByText('main').closest('[role="treeitem"]');
      expect(mainBranchItem).toHaveFocus();
    });

    it('handles Enter key to select branch', async () => {
      const user = userEvent.setup();
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const tree = screen.getByRole('tree');
      tree.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockSelectBranch).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });

    it('handles Space key to select branch', async () => {
      const user = userEvent.setup();
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const tree = screen.getByRole('tree');
      tree.focus();

      await user.keyboard('{ArrowDown}');
      await user.keyboard(' ');

      expect(mockSelectBranch).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    });
  });

  describe('Collapsible Branch Groups', () => {
    const mockBranches: BranchInfo[] = [
      {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2024-01-01T10:00:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174001',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174010',
        name: 'feature-branch-1',
        forkMode: 'explore',
        depth: 1,
        createdAt: '2024-01-01T10:01:00Z',
      },
      {
        branchId: '123e4567-e89b-12d3-a456-426614174002',
        parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
        forkTurnId: '123e4567-e89b-12d3-a456-426614174011',
        name: 'feature-branch-2',
        forkMode: 'save',
        depth: 1,
        createdAt: '2024-01-01T10:02:00Z',
      },
    ];

    it('groups branches by depth', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      // Should have group headers for each depth level
      expect(screen.getByText(/depth 0/i)).toBeInTheDocument();
      expect(screen.getByText(/depth 1/i)).toBeInTheDocument();
    });

    it('toggles group visibility on click', async () => {
      const user = userEvent.setup();
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const depth1Header = screen.getByText(/depth 1/i);

      // Initially, branches should be visible
      expect(screen.getByText('feature-branch-1')).toBeVisible();
      expect(screen.getByText('feature-branch-2')).toBeVisible();

      // Click to collapse
      await user.click(depth1Header);

      // Branches should be hidden
      expect(screen.getByText('feature-branch-1')).not.toBeVisible();
      expect(screen.getByText('feature-branch-2')).not.toBeVisible();

      // Click to expand
      await user.click(depth1Header);

      // Branches should be visible again
      expect(screen.getByText('feature-branch-1')).toBeVisible();
      expect(screen.getByText('feature-branch-2')).toBeVisible();
    });
  });

  describe('Accessibility', () => {
    const mockBranches: BranchInfo[] = [
      {
        branchId: '123e4567-e89b-12d3-a456-426614174000',
        parentBranchId: null,
        forkTurnId: null,
        name: 'main',
        forkMode: 'save',
        depth: 0,
        createdAt: '2024-01-01T10:00:00Z',
      },
    ];

    it('has proper ARIA attributes for tree navigation', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const tree = screen.getByRole('tree');
      expect(tree).toHaveAttribute('aria-label', 'Branch navigator');
    });

    it('tree items have proper roles and attributes', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const treeItem = screen.getByRole('treeitem');
      expect(treeItem).toHaveAttribute('aria-level');
      expect(treeItem).toHaveAttribute('aria-selected');
      expect(treeItem).toHaveAttribute('tabindex');
    });

    it('maintains focus management for keyboard navigation', () => {
      mockUseAllBranches.mockReturnValue(mockBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(mockBranches.length);

      render(<BranchNavigator />);

      const tree = screen.getByRole('tree');
      expect(tree).toHaveAttribute('tabindex', '0');
    });
  });

  describe('Dynamic Updates', () => {
    it('updates when branches change', () => {
      const initialBranches: BranchInfo[] = [
        {
          branchId: '123e4567-e89b-12d3-a456-426614174000',
          parentBranchId: null,
          forkTurnId: null,
          name: 'main',
          forkMode: 'save',
          depth: 0,
          createdAt: '2024-01-01T10:00:00Z',
        },
      ];

      mockUseAllBranches.mockReturnValue(initialBranches);
      mockUseActiveBranch.mockReturnValue(O.none);
      mockUseBranchCount.mockReturnValue(1);

      const { rerender } = render(<BranchNavigator />);

      expect(screen.getByText('main')).toBeInTheDocument();
      expect(screen.queryByText('new-branch')).not.toBeInTheDocument();

      // Add a new branch
      const newBranches: BranchInfo[] = [
        ...initialBranches,
        {
          branchId: '123e4567-e89b-12d3-a456-426614174001',
          parentBranchId: '123e4567-e89b-12d3-a456-426614174000',
          forkTurnId: '123e4567-e89b-12d3-a456-426614174010',
          name: 'new-branch',
          forkMode: 'explore',
          depth: 1,
          createdAt: '2024-01-01T10:01:00Z',
        },
      ];

      mockUseAllBranches.mockReturnValue(newBranches);
      mockUseBranchCount.mockReturnValue(2);

      rerender(<BranchNavigator />);

      expect(screen.getByText('main')).toBeInTheDocument();
      expect(screen.getByText('new-branch')).toBeInTheDocument();
    });
  });
});
