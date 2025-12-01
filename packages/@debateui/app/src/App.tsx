import { useState, useCallback, useEffect, type FC } from 'react';
import { useDebateStore } from '@debateui/state';
import {
  useDebateState,
  useTurns,
  useCurrentRound,
  useIsDebateRunning,
  useConsensus,
} from '@debateui/state';
import * as O from 'fp-ts/Option';
import type { TurnResponse } from '@debateui/core';

// ============================================
// TYPES
// ============================================

type SetupStep = 'question' | 'goal' | 'recommendation' | 'debate';
type Goal = 'accuracy' | 'budget' | 'balanced';
type Category = 'technical' | 'creative' | 'analytical' | 'factual' | 'strategic';

interface Agent {
  id: string;
  name: string;
  strength: string;
  costPerTurn: number;
  color: 'claude' | 'gpt' | 'gemini' | 'deepseek';
}

interface Recommendation {
  agents: Agent[];
  reasoning: string;
  estimatedCost: string;
  estimatedTime: string;
  confidenceLevel: string;
}

// ============================================
// AGENT DATABASE
// ============================================

const AGENTS: Record<string, Agent> = {
  claude: {
    id: 'claude',
    name: 'Claude 3.5 Sonnet',
    strength: 'Nuanced reasoning, safety-aware, excellent at synthesis',
    costPerTurn: 0.015,
    color: 'claude',
  },
  gpt4: {
    id: 'gpt4',
    name: 'GPT-4o',
    strength: 'Broad knowledge, strong at following complex instructions',
    costPerTurn: 0.025,
    color: 'gpt',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini 1.5 Pro',
    strength: 'Multimodal understanding, large context window',
    costPerTurn: 0.012,
    color: 'gemini',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek R1',
    strength: 'Deep reasoning chains, mathematical proofs',
    costPerTurn: 0.008,
    color: 'deepseek',
  },
};

// ============================================
// SMART CATEGORIZATION & RECOMMENDATION
// ============================================

const categorizeQuestion = (question: string): Category => {
  const q = question.toLowerCase();

  if (q.includes('code') || q.includes('programming') || q.includes('bug') ||
      q.includes('implement') || q.includes('api') || q.includes('database')) {
    return 'technical';
  }
  if (q.includes('write') || q.includes('story') || q.includes('design') ||
      q.includes('creative') || q.includes('brainstorm')) {
    return 'creative';
  }
  if (q.includes('analyze') || q.includes('compare') || q.includes('evaluate') ||
      q.includes('pros and cons') || q.includes('trade-off')) {
    return 'analytical';
  }
  if (q.includes('what is') || q.includes('how does') || q.includes('explain') ||
      q.includes('define') || q.includes('history')) {
    return 'factual';
  }
  return 'strategic';
};

const getCategoryInfo = (category: Category): { label: string; icon: string; description: string } => {
  const info: Record<Category, { label: string; icon: string; description: string }> = {
    technical: { label: 'Technical', icon: '⚙️', description: 'Code, architecture, debugging' },
    creative: { label: 'Creative', icon: '🎨', description: 'Writing, design, ideation' },
    analytical: { label: 'Analytical', icon: '📊', description: 'Comparisons, trade-offs, decisions' },
    factual: { label: 'Factual', icon: '📚', description: 'Knowledge, explanations, facts' },
    strategic: { label: 'Strategic', icon: '🎯', description: 'Planning, strategy, problem-solving' },
  };
  return info[category];
};

const getRecommendation = (category: Category, goal: Goal): Recommendation => {
  // Smart agent selection based on category and goal
  const recommendations: Record<Category, Record<Goal, Recommendation>> = {
    technical: {
      accuracy: {
        agents: [AGENTS['claude']!, AGENTS['gpt4']!, AGENTS['deepseek']!],
        reasoning: 'For technical accuracy, we recommend Claude for its precise code analysis, GPT-4 for broad API knowledge, and DeepSeek for rigorous logical verification. This panel ensures code correctness through multi-perspective review.',
        estimatedCost: '$0.15-0.25',
        estimatedTime: '2-3 minutes',
        confidenceLevel: 'High accuracy (95%+)',
      },
      budget: {
        agents: [AGENTS['claude']!, AGENTS['deepseek']!],
        reasoning: 'For budget-conscious technical debates, Claude and DeepSeek provide excellent code analysis at lower cost. DeepSeek excels at finding logical errors while Claude ensures practical, safe solutions.',
        estimatedCost: '$0.05-0.10',
        estimatedTime: '1-2 minutes',
        confidenceLevel: 'Good accuracy (85%+)',
      },
      balanced: {
        agents: [AGENTS['claude']!, AGENTS['gemini']!],
        reasoning: 'A balanced technical panel with Claude for nuanced code review and Gemini for its large context window—ideal for reviewing larger codebases efficiently.',
        estimatedCost: '$0.08-0.15',
        estimatedTime: '1-2 minutes',
        confidenceLevel: 'Very good (90%+)',
      },
    },
    creative: {
      accuracy: {
        agents: [AGENTS['claude']!, AGENTS['gpt4']!, AGENTS['gemini']!],
        reasoning: 'For creative excellence, this diverse panel brings Claude\'s thoughtful voice, GPT-4\'s versatility, and Gemini\'s fresh perspectives. Multiple viewpoints ensure the most creative and polished output.',
        estimatedCost: '$0.15-0.25',
        estimatedTime: '2-4 minutes',
        confidenceLevel: 'Exceptional quality',
      },
      budget: {
        agents: [AGENTS['claude']!, AGENTS['gemini']!],
        reasoning: 'Claude excels at thoughtful, nuanced writing while Gemini adds creative breadth—a cost-effective duo for quality creative work.',
        estimatedCost: '$0.06-0.12',
        estimatedTime: '1-2 minutes',
        confidenceLevel: 'Good quality',
      },
      balanced: {
        agents: [AGENTS['claude']!, AGENTS['gpt4']!],
        reasoning: 'Claude and GPT-4 together offer the best balance of creative quality and diverse perspectives for most creative tasks.',
        estimatedCost: '$0.10-0.18',
        estimatedTime: '2-3 minutes',
        confidenceLevel: 'High quality',
      },
    },
    analytical: {
      accuracy: {
        agents: [AGENTS['claude']!, AGENTS['gpt4']!, AGENTS['deepseek']!],
        reasoning: 'Analytical precision requires Claude\'s balanced reasoning, GPT-4\'s broad knowledge for context, and DeepSeek\'s rigorous logic for verification. This panel catches blind spots and ensures comprehensive analysis.',
        estimatedCost: '$0.15-0.25',
        estimatedTime: '3-4 minutes',
        confidenceLevel: 'Thorough analysis',
      },
      budget: {
        agents: [AGENTS['deepseek']!, AGENTS['gemini']!],
        reasoning: 'DeepSeek\'s logical rigor combined with Gemini\'s efficient analysis provides solid analytical output at minimal cost.',
        estimatedCost: '$0.05-0.10',
        estimatedTime: '1-2 minutes',
        confidenceLevel: 'Solid analysis',
      },
      balanced: {
        agents: [AGENTS['claude']!, AGENTS['deepseek']!],
        reasoning: 'Claude provides nuanced business context while DeepSeek ensures logical consistency—ideal for decision-making analyses.',
        estimatedCost: '$0.07-0.12',
        estimatedTime: '2-3 minutes',
        confidenceLevel: 'Comprehensive',
      },
    },
    factual: {
      accuracy: {
        agents: [AGENTS['gpt4']!, AGENTS['claude']!, AGENTS['gemini']!],
        reasoning: 'For factual accuracy, GPT-4\'s extensive training leads, Claude adds careful verification, and Gemini provides cross-referencing. This panel minimizes hallucination risk through consensus.',
        estimatedCost: '$0.15-0.25',
        estimatedTime: '2-3 minutes',
        confidenceLevel: 'Verified facts',
      },
      budget: {
        agents: [AGENTS['gemini']!, AGENTS['claude']!],
        reasoning: 'Gemini\'s efficient fact retrieval paired with Claude\'s careful verification—reliable factual information at lower cost.',
        estimatedCost: '$0.06-0.12',
        estimatedTime: '1-2 minutes',
        confidenceLevel: 'Generally accurate',
      },
      balanced: {
        agents: [AGENTS['gpt4']!, AGENTS['claude']!],
        reasoning: 'GPT-4\'s knowledge breadth with Claude\'s accuracy focus—the go-to combination for factual queries.',
        estimatedCost: '$0.10-0.18',
        estimatedTime: '1-2 minutes',
        confidenceLevel: 'High accuracy',
      },
    },
    strategic: {
      accuracy: {
        agents: [AGENTS['claude']!, AGENTS['gpt4']!, AGENTS['deepseek']!],
        reasoning: 'Strategic decisions benefit from Claude\'s risk awareness, GPT-4\'s scenario planning, and DeepSeek\'s game-theoretic analysis. Multiple perspectives prevent strategic blind spots.',
        estimatedCost: '$0.15-0.25',
        estimatedTime: '3-5 minutes',
        confidenceLevel: 'Comprehensive strategy',
      },
      budget: {
        agents: [AGENTS['claude']!, AGENTS['deepseek']!],
        reasoning: 'Claude\'s practical reasoning with DeepSeek\'s strategic depth—effective strategic analysis at lower cost.',
        estimatedCost: '$0.06-0.12',
        estimatedTime: '2-3 minutes',
        confidenceLevel: 'Good coverage',
      },
      balanced: {
        agents: [AGENTS['claude']!, AGENTS['gpt4']!],
        reasoning: 'The most versatile strategic duo: Claude for risk-aware planning and GPT-4 for comprehensive scenario analysis.',
        estimatedCost: '$0.10-0.18',
        estimatedTime: '2-3 minutes',
        confidenceLevel: 'Well-rounded',
      },
    },
  };

  return recommendations[category][goal];
};

// ============================================
// ICONS
// ============================================

const CheckIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ArrowRightIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
  </svg>
);

const SparklesIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

// ============================================
// STEP COMPONENTS
// ============================================

interface QuestionStepProps {
  question: string;
  setQuestion: (q: string) => void;
  onNext: () => void;
}

const QuestionStep: FC<QuestionStepProps> = ({ question, setQuestion, onNext }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length >= 10) {
      onNext();
    }
  };

  return (
    <div className="slide-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">What would you like to explore?</h1>
        <p className="text-secondary">
          Enter your question and we'll assemble the perfect panel of AI agents to debate it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Should we use microservices or a monolith for our new e-commerce platform?"
          className="input-large min-h-[120px] resize-none mb-4"
          autoFocus
        />
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted">
            {question.length < 10 ? `${10 - question.length} more characters needed` : '✓ Ready to continue'}
          </span>
          <button
            type="submit"
            disabled={question.trim().length < 10}
            className="btn-primary flex items-center gap-2"
          >
            Continue
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted mb-4">Try these examples:</p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'What are the trade-offs between React and Vue for a startup?',
            'How should we approach pricing for our SaaS product?',
            'Is it worth investing in AI for customer support?',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setQuestion(example)}
              className="text-sm px-4 py-2 rounded-full bg-surface border border-light hover:border-primary/30 transition-colors"
            >
              {example.slice(0, 45)}...
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

interface GoalStepProps {
  goal: Goal | null;
  setGoal: (g: Goal) => void;
  onNext: () => void;
  onBack: () => void;
}

const GoalStep: FC<GoalStepProps> = ({ goal, setGoal, onNext, onBack }) => {
  const goals: { id: Goal; title: string; description: string; icon: string; detail: string }[] = [
    {
      id: 'accuracy',
      title: 'Maximum Accuracy',
      description: 'Get the most thorough, well-verified answer',
      icon: '🎯',
      detail: '3-4 agents • More rounds • Higher confidence',
    },
    {
      id: 'balanced',
      title: 'Balanced',
      description: 'Good quality at reasonable cost',
      icon: '⚖️',
      detail: '2-3 agents • Standard rounds • Great value',
    },
    {
      id: 'budget',
      title: 'Budget Friendly',
      description: 'Quick answer, minimal cost',
      icon: '💰',
      detail: '2 agents • Fewer rounds • Cost efficient',
    },
  ];

  return (
    <div className="slide-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">What's your priority?</h1>
        <p className="text-secondary">
          This helps us select the right agents and debate intensity.
        </p>
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {goals.map((g) => (
          <button
            key={g.id}
            onClick={() => setGoal(g.id)}
            className={`goal-card text-left ${goal === g.id ? 'selected' : ''}`}
          >
            <div className="text-3xl mb-3">{g.icon}</div>
            <h3 className="font-semibold text-lg mb-1">{g.title}</h3>
            <p className="text-secondary text-sm mb-3">{g.description}</p>
            <p className="text-xs text-muted">{g.detail}</p>
            {goal === g.id && (
              <CheckIcon className="absolute top-4 right-4 w-5 h-5 text-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between max-w-3xl mx-auto">
        <button onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!goal}
          className="btn-primary flex items-center gap-2"
        >
          See Recommendation
          <SparklesIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

interface RecommendationStepProps {
  question: string;
  goal: Goal;
  onStart: (agents: string[]) => void;
  onBack: () => void;
}

const RecommendationStep: FC<RecommendationStepProps> = ({ question, goal, onStart, onBack }) => {
  const category = categorizeQuestion(question);
  const categoryInfo = getCategoryInfo(category);
  const recommendation = getRecommendation(category, goal);

  return (
    <div className="slide-up">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-3">Your Debate Panel</h1>
        <p className="text-secondary">
          Based on your question and priorities, here's what we recommend.
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Detected Category */}
        <div className="card p-4 flex items-center gap-4">
          <span className="text-2xl">{categoryInfo.icon}</span>
          <div>
            <p className="text-sm text-muted">Detected Category</p>
            <p className="font-semibold">{categoryInfo.label} Question</p>
          </div>
          <span className="category-badge ml-auto">{categoryInfo.description}</span>
        </div>

        {/* Recommended Agents */}
        <div className="recommendation-card">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-primary" />
            Recommended Agents
          </h3>

          <div className="space-y-3">
            {recommendation.agents.map((agent) => (
              <div key={agent.id} className="agent-row">
                <div className="flex items-center gap-3">
                  <span className={`agent-chip ${agent.color}`}>
                    {agent.name}
                  </span>
                </div>
                <p className="text-sm text-secondary">{agent.strength}</p>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          <div className="explanation-box">
            <p className="font-medium mb-1">Why this panel?</p>
            <p>{recommendation.reasoning}</p>
          </div>

          {/* Estimates */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <p className="font-semibold">{recommendation.estimatedCost}</p>
              <p className="text-xs text-muted">Est. Cost</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{recommendation.estimatedTime}</p>
              <p className="text-xs text-muted">Est. Time</p>
            </div>
            <div className="text-center">
              <p className="font-semibold">{recommendation.confidenceLevel}</p>
              <p className="text-xs text-muted">Expected Quality</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button onClick={onBack} className="btn-secondary">
            Change Goal
          </button>
          <button
            onClick={() => onStart(recommendation.agents.map(a => a.id))}
            className="btn-primary flex items-center gap-2"
          >
            Start Debate
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DEBATE VIEW
// ============================================

interface TurnCardProps {
  turn: TurnResponse;
}

const TurnCard: FC<TurnCardProps> = ({ turn }) => {
  const getAgentColor = (id: string): string => {
    if (id.includes('claude')) return 'claude';
    if (id.includes('gpt')) return 'gpt';
    if (id.includes('gemini')) return 'gemini';
    if (id.includes('deepseek')) return 'deepseek';
    return 'claude';
  };

  return (
    <div className="card p-5 fade-in">
      <div className="flex items-start gap-4">
        <span className={`agent-chip ${getAgentColor(turn.participantId)} shrink-0`}>
          {turn.participantId}
        </span>
        <div className="flex-1 min-w-0">
          <p className="whitespace-pre-wrap leading-relaxed">{turn.content}</p>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted">
            <span>{turn.tokensUsed} tokens</span>
            <span>${turn.costUsd.toFixed(4)}</span>
            <span>{turn.latencyMs}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DebateViewProps {
  question: string;
  onReset: () => void;
}

const DebateView: FC<DebateViewProps> = ({ question, onReset }) => {
  const debateState = useDebateState();
  const turns = useTurns();
  const currentRound = useCurrentRound();
  const isRunning = useIsDebateRunning();
  const consensus = useConsensus();

  const totalCost = turns.reduce((sum, t) => sum + t.costUsd, 0);
  const totalTokens = turns.reduce((sum, t) => sum + t.tokensUsed, 0);

  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b border-light p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-semibold text-lg">Debate in Progress</h1>
              <p className="text-sm text-secondary truncate max-w-lg">{question}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isRunning && (
                  <span className="flex items-center gap-2 text-sm text-primary">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    Round {currentRound}
                  </span>
                )}
                {debateState._tag === 'Completed' && (
                  <span className="text-sm text-green-600">✓ Complete</span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Turns */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {turns.length === 0 && isRunning && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="typing-dots mx-auto mb-4">
                  <span /><span /><span />
                </div>
                <p className="text-secondary">Agents are thinking...</p>
              </div>
            </div>
          )}
          {turns.map((turn) => (
            <TurnCard key={turn.turnId} turn={turn} />
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-72 border-l border-light p-6 space-y-6">
        <div>
          <h3 className="font-semibold mb-4">Metrics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="metric">
              <p className="metric-value">{turns.length}</p>
              <p className="metric-label">Turns</p>
            </div>
            <div className="metric">
              <p className="metric-value">{currentRound}</p>
              <p className="metric-label">Round</p>
            </div>
            <div className="metric">
              <p className="metric-value">{totalTokens.toLocaleString()}</p>
              <p className="metric-label">Tokens</p>
            </div>
            <div className="metric">
              <p className="metric-value">${totalCost.toFixed(4)}</p>
              <p className="metric-label">Cost</p>
            </div>
          </div>
        </div>

        {O.isSome(consensus) && (
          <div className="card p-4">
            <h3 className="font-semibold mb-2">Consensus</h3>
            <div className="text-2xl font-bold text-primary mb-1">
              {Math.round(consensus.value.percentage * 100)}%
            </div>
            <p className="text-sm text-secondary capitalize">{consensus.value.level} agreement</p>
          </div>
        )}

        <button onClick={onReset} className="btn-secondary w-full">
          New Debate
        </button>
      </aside>
    </div>
  );
};

// ============================================
// PROGRESS INDICATOR
// ============================================

interface ProgressIndicatorProps {
  currentStep: SetupStep;
}

const ProgressIndicator: FC<ProgressIndicatorProps> = ({ currentStep }) => {
  const steps: { id: SetupStep; label: string }[] = [
    { id: 'question', label: 'Question' },
    { id: 'goal', label: 'Goal' },
    { id: 'recommendation', label: 'Panel' },
  ];

  const getStepStatus = (stepId: SetupStep) => {
    const order = ['question', 'goal', 'recommendation', 'debate'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  if (currentStep === 'debate') return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-12">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={`step-dot ${getStepStatus(step.id)}`}>
            {getStepStatus(step.id) === 'completed' ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              i + 1
            )}
          </div>
          <span className="ml-2 text-sm font-medium hidden sm:inline">{step.label}</span>
          {i < steps.length - 1 && (
            <div className={`step-line w-8 mx-3 ${getStepStatus(steps[i + 1]!.id) === 'completed' || getStepStatus(steps[i + 1]!.id) === 'active' ? '' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN APP
// ============================================

export const App: FC = () => {
  const [step, setStep] = useState<SetupStep>('question');
  const [question, setQuestion] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null);

  const { setConfig, startDebate, debateStarted, reset: resetStore } = useDebateStore.getState();

  const handleStartDebate = useCallback((agents: string[]) => {
    setConfig({
      question,
      participants: agents,
      rounds: goal === 'accuracy' ? 4 : goal === 'balanced' ? 3 : 2,
      consensusThreshold: goal === 'accuracy' ? 0.85 : 0.75,
      forkMode: 'save',
    });
    startDebate();
    // Simulate backend response
    setTimeout(() => debateStarted(`debate-${Date.now()}`), 500);
    setStep('debate');
  }, [question, goal, setConfig, startDebate, debateStarted]);

  const handleReset = useCallback(() => {
    resetStore();
    setStep('question');
    setQuestion('');
    setGoal(null);
  }, [resetStore]);

  // Auto-advance after selecting goal
  useEffect(() => {
    if (goal && step === 'goal') {
      const timer = setTimeout(() => setStep('recommendation'), 300);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [goal, step]);

  if (step === 'debate') {
    return <DebateView question={question} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-light">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-primary" />
            <span className="font-bold text-xl">DebateUI</span>
          </div>
          <span className="text-sm text-muted">AI-Powered Multi-Agent Debates</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-4xl mx-auto w-full">
          <ProgressIndicator currentStep={step} />

          {step === 'question' && (
            <QuestionStep
              question={question}
              setQuestion={setQuestion}
              onNext={() => setStep('goal')}
            />
          )}

          {step === 'goal' && (
            <GoalStep
              goal={goal}
              setGoal={setGoal}
              onNext={() => setStep('recommendation')}
              onBack={() => setStep('question')}
            />
          )}

          {step === 'recommendation' && goal && (
            <RecommendationStep
              question={question}
              goal={goal}
              onStart={handleStartDebate}
              onBack={() => setStep('goal')}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-light py-4 text-center text-sm text-muted">
        Powered by Claude, GPT-4, Gemini & DeepSeek
      </footer>
    </div>
  );
};
