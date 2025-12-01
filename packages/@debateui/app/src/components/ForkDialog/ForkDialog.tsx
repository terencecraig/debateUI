import { useEffect, useRef, useState } from 'react';
import { useDebateStore } from '@debateui/state';
import type { ForkDraft } from '@debateui/core';
import * as O from 'fp-ts/Option';

export interface ForkDialogProps {
  isOpen: boolean;
  turnId: string;
  branchId: string;
  onClose: () => void;
  onSubmit: (forkData: ForkDraft) => void;
}

export function ForkDialog({
  isOpen,
  turnId,
  branchId,
  onClose,
  onSubmit,
}: ForkDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [branchName, setBranchName] = useState('');
  const [forkMode, setForkMode] = useState<'save' | 'explore'>('explore');

  // Store actions and state
  const startFork = useDebateStore((state) => state.startFork);
  const updateForkDraft = useDebateStore((state) => state.updateForkDraft);
  const cancelFork = useDebateStore((state) => state.cancelFork);
  const forkDraftOption = useDebateStore((state) => state.branching.forkDraft);

  // Extract fork draft from Option
  const forkDraft = O.isSome(forkDraftOption) ? forkDraftOption.value : null;

  // Initialize fork draft when dialog opens
  useEffect(() => {
    if (isOpen) {
      startFork(turnId, branchId);
    }
  }, [isOpen, turnId, branchId, startFork]);

  // Focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Sync local fork mode state with draft
  useEffect(() => {
    if (forkDraft) {
      setForkMode(forkDraft.forkMode);
    }
  }, [forkDraft]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateForkDraft(e.target.value);
  };

  const handleForkModeChange = (mode: 'save' | 'explore') => {
    setForkMode(mode);
    // Update the draft with the new fork mode by triggering a content update
    // This ensures the draft stays in sync with the UI state
    if (forkDraft) {
      updateForkDraft(forkDraft.content);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forkDraft && forkDraft.content.trim()) {
      // Create fork data with current fork mode state
      const forkData: ForkDraft = {
        ...forkDraft,
        forkMode,
      };
      onSubmit(forkData);
    }
  };

  const handleCancel = () => {
    cancelFork();
    setBranchName('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isOpen) {
    return null;
  }

  const isSubmitDisabled = !forkDraft || !forkDraft.content.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        data-testid="dialog-backdrop"
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fork-dialog-title"
        className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="p-6">
          {/* Header */}
          <h2
            id="fork-dialog-title"
            className="text-2xl font-bold text-gray-900 mb-6"
          >
            Create Fork
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Alternative Content */}
            <div>
              <label
                htmlFor="fork-content"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Alternative Content
              </label>
              <textarea
                ref={textareaRef}
                id="fork-content"
                aria-label="Alternative content"
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
                value={forkDraft?.content || ''}
                onChange={handleContentChange}
                placeholder="Enter alternative content for this fork..."
              />
            </div>

            {/* Fork Mode Selection */}
            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-3">
                  Fork Mode
                </legend>
                <div className="space-y-3">
                  {/* Save Mode */}
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="forkMode"
                      value="save"
                      checked={forkMode === 'save'}
                      onChange={() => handleForkModeChange('save')}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        Save
                      </span>
                      <span className="block text-sm text-gray-500">
                        Create a persistent branch that will be saved for future reference
                      </span>
                    </div>
                  </label>

                  {/* Explore Mode */}
                  <label className="flex items-start space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="forkMode"
                      value="explore"
                      checked={forkMode === 'explore'}
                      onChange={() => handleForkModeChange('explore')}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        Explore
                      </span>
                      <span className="block text-sm text-gray-500">
                        Create a temporary experimentation branch
                      </span>
                    </div>
                  </label>
                </div>
              </fieldset>
            </div>

            {/* Optional Branch Name */}
            <div>
              <label
                htmlFor="branch-name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Branch Name (Optional)
              </label>
              <input
                type="text"
                id="branch-name"
                aria-label="Branch name (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="Enter a custom branch name..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Fork
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
