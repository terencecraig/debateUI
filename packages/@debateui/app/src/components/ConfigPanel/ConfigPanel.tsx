import { useState, useEffect, useId } from 'react';
import { useDebateStore, useConfig, useDebateState } from '@debateui/state';
import { DebateConfigSchema, type DebateConfig } from '@debateui/core';
import { z } from 'zod';

interface ValidationErrors {
  question?: string;
  participants?: string;
  rounds?: string;
  consensusThreshold?: string;
}

export const ConfigPanel = () => {
  const config = useConfig();
  const debateState = useDebateState();
  const setConfig = useDebateStore((state) => state.setConfig);

  // Local form state for immediate updates
  const [localQuestion, setLocalQuestion] = useState(config.question);
  const [localParticipants, setLocalParticipants] = useState(
    config.participants.join(', ')
  );
  const [localRounds, setLocalRounds] = useState(String(config.rounds));
  const [localThreshold, setLocalThreshold] = useState(
    String(config.consensusThreshold)
  );
  const [localForkMode, setLocalForkMode] = useState(config.forkMode);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // IDs for accessibility
  const questionId = useId();
  const participantsId = useId();
  const roundsId = useId();
  const thresholdId = useId();
  const forkModeId = useId();

  // Determine if fields should be disabled (debate not idle)
  const isDisabled = debateState._tag !== 'Idle';

  // Sync local state with store when config changes externally
  useEffect(() => {
    setLocalQuestion(config.question);
    setLocalParticipants(config.participants.join(', '));
    setLocalRounds(String(config.rounds));
    setLocalThreshold(String(config.consensusThreshold));
    setLocalForkMode(config.forkMode);
  }, [config]);

  // Validate a single field
  const validateField = (field: keyof DebateConfig, value: unknown): string | undefined => {
    try {
      // Use bracket notation to access shape properties
      const shape = DebateConfigSchema.shape as Record<string, z.ZodTypeAny>;
      const fieldSchema = shape[field];
      if (!fieldSchema) {
        return 'Invalid field';
      }
      fieldSchema.parse(value);
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message;
      }
      return 'Invalid value';
    }
  };

  // Handle question change
  const handleQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalQuestion(value);
    setConfig({ question: value });

    if (touched['question']) {
      const error = validateField('question', value);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next.question = error;
        } else {
          delete next.question;
        }
        return next;
      });
    }
  };

  const handleQuestionBlur = () => {
    setTouched((prev) => ({ ...prev, question: true }));
    const error = validateField('question', localQuestion);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next.question = error;
      } else {
        delete next.question;
      }
      return next;
    });
  };

  // Handle participants change
  const handleParticipantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalParticipants(value);

    // Parse comma-separated list
    const participantList = value
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    setConfig({ participants: participantList });

    if (touched['participants']) {
      const error = validateField('participants', participantList);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next.participants = error;
        } else {
          delete next.participants;
        }
        return next;
      });
    }
  };

  const handleParticipantsBlur = () => {
    setTouched((prev) => ({ ...prev, participants: true }));
    const participantList = localParticipants
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const error = validateField('participants', participantList);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next.participants = error;
      } else {
        delete next.participants;
      }
      return next;
    });
  };

  // Handle rounds change
  const handleRoundsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalRounds(value);

    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setConfig({ rounds: numValue });

      if (touched['rounds']) {
        const error = validateField('rounds', numValue);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) {
            next.rounds = error;
          } else {
            delete next.rounds;
          }
          return next;
        });
      }
    }
  };

  const handleRoundsBlur = () => {
    setTouched((prev) => ({ ...prev, rounds: true }));
    const numValue = parseInt(localRounds, 10);
    const error = validateField('rounds', isNaN(numValue) ? 0 : numValue);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next.rounds = error;
      } else {
        delete next.rounds;
      }
      return next;
    });
  };

  // Handle consensus threshold change
  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalThreshold(value);

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setConfig({ consensusThreshold: numValue });

      if (touched['consensusThreshold']) {
        const error = validateField('consensusThreshold', numValue);
        setErrors((prev) => {
          const next = { ...prev };
          if (error) {
            next.consensusThreshold = error;
          } else {
            delete next.consensusThreshold;
          }
          return next;
        });
      }
    }
  };

  const handleThresholdBlur = () => {
    setTouched((prev) => ({ ...prev, consensusThreshold: true }));
    const numValue = parseFloat(localThreshold);
    const error = validateField('consensusThreshold', isNaN(numValue) ? 0 : numValue);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next.consensusThreshold = error;
      } else {
        delete next.consensusThreshold;
      }
      return next;
    });
  };

  // Handle fork mode change
  const handleForkModeChange = (mode: 'save' | 'explore') => {
    setLocalForkMode(mode);
    setConfig({ forkMode: mode });
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Debate Configuration</h2>

      <form className="space-y-6">
        {/* Question Field */}
        <div>
          <label
            htmlFor={questionId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Question
          </label>
          <textarea
            id={questionId}
            value={localQuestion}
            onChange={handleQuestionChange}
            onBlur={handleQuestionBlur}
            disabled={isDisabled}
            aria-describedby={errors.question ? `${questionId}-error` : undefined}
            aria-invalid={!!errors.question}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.question ? 'border-red-500' : 'border-gray-300'
            } ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            rows={3}
            placeholder="Enter your debate question (min 10 characters)"
          />
          {errors.question && (
            <p id={`${questionId}-error`} className="mt-1 text-sm text-red-600">
              {errors.question}
            </p>
          )}
        </div>

        {/* Participants Field */}
        <div>
          <label
            htmlFor={participantsId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Participants
          </label>
          <input
            id={participantsId}
            type="text"
            value={localParticipants}
            onChange={handleParticipantsChange}
            onBlur={handleParticipantsBlur}
            disabled={isDisabled}
            aria-describedby={errors.participants ? `${participantsId}-error` : undefined}
            aria-invalid={!!errors.participants}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.participants ? 'border-red-500' : 'border-gray-300'
            } ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder="Enter participant names separated by commas (min 2, max 7)"
          />
          {errors.participants && (
            <p id={`${participantsId}-error`} className="mt-1 text-sm text-red-600">
              {errors.participants}
            </p>
          )}
        </div>

        {/* Rounds Field */}
        <div>
          <label
            htmlFor={roundsId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Rounds
          </label>
          <input
            id={roundsId}
            type="number"
            min="1"
            max="10"
            value={localRounds}
            onChange={handleRoundsChange}
            onBlur={handleRoundsBlur}
            disabled={isDisabled}
            aria-describedby={errors.rounds ? `${roundsId}-error` : undefined}
            aria-invalid={!!errors.rounds}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.rounds ? 'border-red-500' : 'border-gray-300'
            } ${isDisabled ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          />
          {errors.rounds && (
            <p id={`${roundsId}-error`} className="mt-1 text-sm text-red-600">
              {errors.rounds}
            </p>
          )}
        </div>

        {/* Consensus Threshold Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor={thresholdId}
              className="block text-sm font-medium text-gray-700"
            >
              Consensus Threshold
            </label>
            <span className="text-sm font-semibold text-blue-600">
              {Math.round(parseFloat(localThreshold) * 100)}%
            </span>
          </div>
          <input
            id={thresholdId}
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={localThreshold}
            onChange={handleThresholdChange}
            onBlur={handleThresholdBlur}
            disabled={isDisabled}
            aria-describedby={errors.consensusThreshold ? `${thresholdId}-error` : undefined}
            aria-invalid={!!errors.consensusThreshold}
            className={`w-full ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {errors.consensusThreshold && (
            <p id={`${thresholdId}-error`} className="mt-1 text-sm text-red-600">
              {errors.consensusThreshold}
            </p>
          )}
        </div>

        {/* Fork Mode Radio Buttons */}
        <div>
          <fieldset>
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              Fork Mode
            </legend>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id={`${forkModeId}-save`}
                  type="radio"
                  name="forkMode"
                  value="save"
                  checked={localForkMode === 'save'}
                  onChange={() => handleForkModeChange('save')}
                  disabled={isDisabled}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <label
                  htmlFor={`${forkModeId}-save`}
                  className={`ml-3 block text-sm text-gray-700 ${
                    isDisabled ? 'opacity-50' : ''
                  }`}
                >
                  Save - Branches are persisted for later review
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id={`${forkModeId}-explore`}
                  type="radio"
                  name="forkMode"
                  value="explore"
                  checked={localForkMode === 'explore'}
                  onChange={() => handleForkModeChange('explore')}
                  disabled={isDisabled}
                  className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${
                    isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                />
                <label
                  htmlFor={`${forkModeId}-explore`}
                  className={`ml-3 block text-sm text-gray-700 ${
                    isDisabled ? 'opacity-50' : ''
                  }`}
                >
                  Explore - Branches are temporary exploration only
                </label>
              </div>
            </div>
          </fieldset>
        </div>
      </form>
    </div>
  );
};
