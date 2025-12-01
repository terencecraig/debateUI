import { useState, useCallback, useRef, useEffect, KeyboardEvent, createRef } from 'react';
import { useAllBranches, useActiveBranch, useDebateStore } from '@debateui/state';
import type { BranchInfo } from '@debateui/core';
import * as O from 'fp-ts/Option';

/**
 * Groups branches by their depth level.
 */
const groupBranchesByDepth = (branches: BranchInfo[]): Map<number, BranchInfo[]> => {
  const groups = new Map<number, BranchInfo[]>();

  branches.forEach((branch) => {
    const existing = groups.get(branch.depth) || [];
    groups.set(branch.depth, [...existing, branch]);
  });

  return groups;
};

/**
 * Formats an ISO datetime string to a human-readable format.
 */
const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

/**
 * Component for individual branch item in the tree.
 */
interface BranchItemProps {
  branch: BranchInfo;
  isActive: boolean;
  onSelect: (branchId: string) => void;
  isFocused: boolean;
  itemRef?: React.RefObject<HTMLDivElement>;
}

const BranchItem = ({ branch, isActive, onSelect, isFocused, itemRef }: BranchItemProps) => {
  return (
    <div
      ref={itemRef}
      role="treeitem"
      aria-level={branch.depth}
      aria-selected={isActive}
      tabIndex={isFocused ? 0 : -1}
      onClick={() => onSelect(branch.branchId)}
      className={`
        px-4 py-2 cursor-pointer transition-colors
        ${isActive ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
        ${isFocused ? 'ring-2 ring-blue-300' : ''}
      `}
      style={{ paddingLeft: `${1 + branch.depth * 1.5}rem` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="font-medium text-gray-900">{branch.name}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
            <span
              className={`
                px-2 py-0.5 rounded-full
                ${branch.forkMode === 'save' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
              `}
            >
              {branch.forkMode}
            </span>
            <span>{formatDateTime(branch.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Component for a collapsible group of branches at a specific depth.
 */
interface BranchGroupProps {
  depth: number;
  branches: BranchInfo[];
  activeBranchId: string | null;
  onSelectBranch: (branchId: string) => void;
  focusedIndex: number;
  startIndex: number;
  expandedGroups: Set<number>;
  onToggleGroup: (depth: number) => void;
  itemRefs: React.MutableRefObject<Map<number, React.RefObject<HTMLDivElement>>>;
}

const BranchGroup = ({
  depth,
  branches,
  activeBranchId,
  onSelectBranch,
  focusedIndex,
  startIndex,
  expandedGroups,
  onToggleGroup,
  itemRefs,
}: BranchGroupProps) => {
  const isExpanded = expandedGroups.has(depth);

  const toggleExpanded = useCallback(() => {
    onToggleGroup(depth);
  }, [depth, onToggleGroup]);

  return (
    <div className="mb-2">
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-2 text-left text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-between"
      >
        <span>Depth {depth}</span>
        <span className="text-gray-500">
          {isExpanded ? '▼' : '▶'} ({branches.length})
        </span>
      </button>
      <div style={{ display: isExpanded ? 'block' : 'none' }}>
        {branches.map((branch, index) => {
          const globalIndex = startIndex + index;
          const isFocused = focusedIndex === globalIndex;
          const isActive = activeBranchId === branch.branchId;

          // Create or get ref for this item
          if (!itemRefs.current.has(globalIndex)) {
            itemRefs.current.set(globalIndex, createRef<HTMLDivElement>());
          }
          const itemRef = itemRefs.current.get(globalIndex)!;

          return (
            <BranchItem
              key={branch.branchId}
              branch={branch}
              isActive={isActive}
              onSelect={onSelectBranch}
              isFocused={isFocused}
              itemRef={itemRef}
            />
          );
        })}
      </div>
    </div>
  );
};

/**
 * BranchNavigator component for viewing and switching between branches.
 * Displays branches in a tree structure with collapsible groups by depth.
 */
export const BranchNavigator = () => {
  const branches = useAllBranches() as BranchInfo[];
  const activeBranch = useActiveBranch() as O.Option<BranchInfo>;
  const { selectBranch } = useDebateStore();

  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(() => {
    // Initialize with all groups expanded
    const groups = groupBranchesByDepth(branches);
    return new Set(groups.keys());
  });
  const treeRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, React.RefObject<HTMLDivElement>>>(new Map());

  // Get active branch ID from Option
  const activeBranchId = O.isSome(activeBranch) ? activeBranch.value.branchId : null;

  // Group branches by depth
  const branchGroups = groupBranchesByDepth(branches);
  const sortedDepths = Array.from(branchGroups.keys()).sort((a, b) => a - b);

  // Calculate total branch count for keyboard navigation
  const totalBranches = branches.length;

  // Handle branch selection - memoized to prevent unnecessary re-renders
  const handleSelectBranch = useCallback((branchId: string) => {
    selectBranch(branchId);
  }, [selectBranch]);

  // Handle toggle group
  const handleToggleGroup = useCallback((depth: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(depth)) {
        next.delete(depth);
      } else {
        next.add(depth);
      }
      return next;
    });
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (totalBranches === 0) return;

      const currentFocused = focusedIndex;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            // If nothing focused yet, go to first item
            if (prev === -1) return 0;
            // Otherwise, go to next item
            return Math.min(prev + 1, totalBranches - 1);
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            // If nothing focused or at first item, stay at first item
            if (prev <= 0) return 0;
            // Otherwise, go to previous item
            return prev - 1;
          });
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (currentFocused >= 0 && currentFocused < branches.length) {
            const branch = branches[currentFocused];
            if (branch) {
              selectBranch(branch.branchId);
            }
          }
          break;
      }
    },
    [totalBranches, focusedIndex, branches, selectBranch]
  );

  // Focus the appropriate item when focusedIndex changes
  useEffect(() => {
    const ref = itemRefs.current.get(focusedIndex);
    if (ref?.current) {
      ref.current.focus();
    }
  }, [focusedIndex]);

  // Update expanded groups when branches change
  useEffect(() => {
    const groups = groupBranchesByDepth(branches);
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      // Add any new depths
      groups.forEach((_, depth) => {
        if (!prev.has(depth)) {
          next.add(depth);
        }
      });
      return next;
    });
  }, [branches]);

  // Empty state
  if (branches.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No branches available. Start a debate to create branches.</p>
      </div>
    );
  }

  return (
    <div
      ref={treeRef}
      role="tree"
      aria-label="Branch navigator"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="w-full h-full overflow-y-auto bg-white border border-gray-200 rounded-lg"
    >
      {sortedDepths.map((depth) => {
        const depthBranches = branchGroups.get(depth) || [];

        // Calculate the starting index for this group
        let startIndex = 0;
        for (const d of sortedDepths) {
          if (d < depth) {
            startIndex += branchGroups.get(d)?.length || 0;
          } else {
            break;
          }
        }

        return (
          <BranchGroup
            key={depth}
            depth={depth}
            branches={depthBranches}
            activeBranchId={activeBranchId}
            onSelectBranch={handleSelectBranch}
            focusedIndex={focusedIndex}
            startIndex={startIndex}
            expandedGroups={expandedGroups}
            onToggleGroup={handleToggleGroup}
            itemRefs={itemRefs}
          />
        );
      })}
    </div>
  );
};
