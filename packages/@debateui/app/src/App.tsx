import { useState, useCallback, useEffect, useRef, type FC } from 'react';
import { useDebateStore } from '@debateui/state';
import {
  useDebateState,
  useTurns,
  useCurrentRound,
  useIsDebateRunning,
  useConsensus,
} from '@debateui/state';
import { useDebateStream } from './hooks/useDebateStream';
import type { CCREventData, CCREventType } from '@debateui/api-client';
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

// CCR Event Types imported from @debateui/api-client

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

// CCR Event Stream - Using real useDebateStream hook from @debateui/api-client

// ============================================
// EVENT LOG COMPONENT
// ============================================

const getEventColor = (type: CCREventType): string => {
  const colors: Record<CCREventType, string> = {
    'debate.initialized': 'text-blue-400',
    'debate.round.started': 'text-cyan-400',
    'debate.round.completed': 'text-cyan-500',
    'turn.started': 'text-yellow-400',
    'turn.streaming': 'text-yellow-300',
    'turn.completed': 'text-green-400',
    'model.api.call': 'text-purple-400',
    'model.api.response': 'text-purple-300',
    'consensus.check': 'text-orange-400',
    'consensus.reached': 'text-green-500',
    'context.stored': 'text-blue-300',
    'context.retrieved': 'text-blue-300',
    'token.usage': 'text-gray-400',
    'cost.update': 'text-amber-400',
    'error.occurred': 'text-red-500',
  };
  return colors[type] ?? 'text-gray-400';
};

const getAgentColor = (agent?: string): string => {
  if (!agent) return '';
  if (agent.includes('claude')) return 'text-violet-400';
  if (agent.includes('gpt')) return 'text-green-400';
  if (agent.includes('gemini')) return 'text-blue-400';
  if (agent.includes('deepseek')) return 'text-pink-400';
  return 'text-gray-400';
};

interface EventLogProps {
  events: readonly CCREventData[];
}

const EventLog: FC<EventLogProps> = ({ events }) => {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(3, '0')}`;
  };

  return (
    <div ref={logRef} className="event-log font-mono text-xs leading-tight overflow-y-auto h-full">
      {events.map((event) => (
        <div key={event.eventId} className="event-line py-0.5 px-2 hover:bg-white/5 flex gap-2">
          <span className="text-gray-500 shrink-0">{formatTime(event.timestamp)}</span>
          <span className={`shrink-0 w-28 ${getEventColor(event.eventType)}`}>{event.eventType}</span>
          {event.agent && <span className={`shrink-0 w-16 ${getAgentColor(event.agent)}`}>[{event.agent}]</span>}
          <span className="text-gray-300 truncate">{event.message}</span>
          {event.metadata && (
            <span className="text-gray-500 truncate ml-auto">
              {Object.entries(event.metadata).map(([k, v]) => `${k}=${v}`).join(' ')}
            </span>
          )}
        </div>
      ))}
      {events.length === 0 && (
        <div className="text-gray-500 text-center py-4">Waiting for events...</div>
      )}
    </div>
  );
};

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
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1">What would you like to explore?</h1>
        <p className="text-secondary text-sm">
          Enter your question and we'll assemble the perfect AI panel to debate it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Should we use microservices or a monolith for our new e-commerce platform?"
          className="input-large min-h-[100px] resize-none mb-3"
          autoFocus
        />
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted">
            {question.length < 10 ? `${10 - question.length} more chars` : '✓ Ready'}
          </span>
          <button
            type="submit"
            disabled={question.trim().length < 10}
            className="btn-primary flex items-center gap-2 py-2 px-4"
          >
            Continue
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <p className="text-xs text-muted mb-2">Examples:</p>
        <div className="flex flex-wrap justify-center gap-1">
          {[
            'What are the trade-offs between React and Vue for a startup?',
            'How should we approach pricing for our SaaS product?',
            'Is it worth investing in AI for customer support?',
          ].map((example) => (
            <button
              key={example}
              onClick={() => setQuestion(example)}
              className="text-xs px-3 py-1.5 rounded-full bg-surface border border-light hover:border-primary/30 transition-colors"
            >
              {example.slice(0, 50)}...
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
      description: 'Thorough, well-verified answer',
      icon: '🎯',
      detail: '3-4 agents • More rounds',
    },
    {
      id: 'balanced',
      title: 'Balanced',
      description: 'Good quality, reasonable cost',
      icon: '⚖️',
      detail: '2-3 agents • Standard',
    },
    {
      id: 'budget',
      title: 'Budget Friendly',
      description: 'Quick answer, minimal cost',
      icon: '💰',
      detail: '2 agents • Fast',
    },
  ];

  return (
    <div className="slide-up">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1">What's your priority?</h1>
        <p className="text-secondary text-sm">Select debate intensity and agent count.</p>
      </div>

      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {goals.map((g) => (
          <button
            key={g.id}
            onClick={() => setGoal(g.id)}
            className={`goal-card text-left p-4 ${goal === g.id ? 'selected' : ''}`}
          >
            <div className="text-2xl mb-2">{g.icon}</div>
            <h3 className="font-semibold mb-0.5">{g.title}</h3>
            <p className="text-secondary text-xs mb-2">{g.description}</p>
            <p className="text-xs text-muted">{g.detail}</p>
            {goal === g.id && (
              <CheckIcon className="absolute top-3 right-3 w-4 h-4 text-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between max-w-3xl mx-auto">
        <button onClick={onBack} className="btn-secondary py-2 px-4">Back</button>
        <button onClick={onNext} disabled={!goal} className="btn-primary flex items-center gap-2 py-2 px-4">
          See Panel <SparklesIcon className="w-4 h-4" />
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
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1">Your Debate Panel</h1>
        <p className="text-secondary text-sm">Ready to launch based on your question and priorities.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-3">
        {/* Detected Category - inline */}
        <div className="card p-3 flex items-center gap-3">
          <span className="text-xl">{categoryInfo.icon}</span>
          <span className="font-semibold">{categoryInfo.label} Question</span>
          <span className="category-badge ml-auto text-xs">{categoryInfo.description}</span>
        </div>

        {/* Recommended Agents */}
        <div className="recommendation-card p-4">
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <SparklesIcon className="w-4 h-4 text-primary" />
            Recommended Agents
          </h3>

          <div className="space-y-2 mb-3">
            {recommendation.agents.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between py-1.5 border-b last:border-0 border-light">
                <span className={`agent-chip ${agent.color} text-xs`}>{agent.name}</span>
                <span className="text-xs text-secondary">{agent.strength.split(',')[0]}</span>
              </div>
            ))}
          </div>

          {/* Reasoning - compact */}
          <div className="explanation-box text-xs p-3">
            <p className="font-medium mb-0.5">Why this panel?</p>
            <p className="leading-snug">{recommendation.reasoning.slice(0, 150)}...</p>
          </div>

          {/* Estimates - inline */}
          <div className="flex justify-between items-center pt-3 text-sm">
            <span><b>{recommendation.estimatedCost}</b> <span className="text-muted text-xs">cost</span></span>
            <span><b>{recommendation.estimatedTime}</b> <span className="text-muted text-xs">time</span></span>
            <span><b>{recommendation.confidenceLevel.split(' ')[0]}</b> <span className="text-muted text-xs">quality</span></span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button onClick={onBack} className="btn-secondary py-2 px-4">Back</button>
          <button
            onClick={() => onStart(recommendation.agents.map(a => a.id))}
            className="btn-primary flex items-center gap-2 py-2 px-4"
          >
            Start Debate <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// DEBATE VIEW - MISSION CONTROL
// ============================================

interface TurnCardProps {
  turn: TurnResponse;
}

const TurnCard: FC<TurnCardProps> = ({ turn }) => {
  const getAgentColorClass = (id: string): string => {
    if (id.includes('claude')) return 'border-l-violet-500 bg-violet-500/5';
    if (id.includes('gpt')) return 'border-l-green-500 bg-green-500/5';
    if (id.includes('gemini')) return 'border-l-blue-500 bg-blue-500/5';
    if (id.includes('deepseek')) return 'border-l-pink-500 bg-pink-500/5';
    return 'border-l-gray-500 bg-gray-500/5';
  };

  const getAgentTextColor = (id: string): string => {
    if (id.includes('claude')) return 'text-violet-400';
    if (id.includes('gpt')) return 'text-green-400';
    if (id.includes('gemini')) return 'text-blue-400';
    if (id.includes('deepseek')) return 'text-pink-400';
    return 'text-gray-400';
  };

  return (
    <div className={`turn-card border-l-2 p-3 ${getAgentColorClass(turn.participantId)}`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-mono text-sm font-semibold ${getAgentTextColor(turn.participantId)}`}>
          {turn.participantId}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {turn.tokensUsed}tok · ${turn.costUsd.toFixed(4)} · {turn.latencyMs}ms
        </span>
      </div>
      <p className="text-sm text-gray-200 leading-snug">{turn.content}</p>
    </div>
  );
};

interface DebateViewProps {
  question: string;
  selectedAgents: string[];
  onReset: () => void;
}

// API base URL - can be configured via environment
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

const DebateView: FC<DebateViewProps> = ({ question, selectedAgents, onReset }) => {
  const debateState = useDebateState();
  const turns = useTurns();
  const currentRound = useCurrentRound();
  const isRunning = useIsDebateRunning();
  const consensus = useConsensus();

  // Use real SSE stream for CCR events
  const { status: streamStatus, ccrEvents, error: streamError } = useDebateStream(API_BASE_URL);

  const totalCost = turns.reduce((sum, t) => sum + t.costUsd, 0);
  const totalTokens = turns.reduce((sum, t) => sum + t.tokensUsed, 0);
  const avgLatency = turns.length > 0
    ? Math.round(turns.reduce((sum, t) => sum + t.latencyMs, 0) / turns.length)
    : 0;

  const eventsPerSecond = ccrEvents.length > 0 ? (ccrEvents.length / ((Date.now() - ccrEvents[0]!.timestamp) / 1000)).toFixed(1) : '0';

  return (
    <div className="mission-control h-screen flex flex-col bg-slate-950 text-gray-100">
      {/* Top Bar - Dense Status */}
      <header className="status-bar bg-slate-900 border-b border-slate-700 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isRunning ? (
                <span className="status-live flex items-center gap-1.5 text-xs font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-green-400">LIVE</span>
                </span>
              ) : debateState._tag === 'Completed' ? (
                <span className="status-complete flex items-center gap-1.5 text-xs font-mono text-cyan-400">
                  <CheckIcon className="w-3 h-3" />
                  COMPLETE
                </span>
              ) : (
                <span className="text-xs font-mono text-gray-500">IDLE</span>
              )}
            </div>
            <span className="text-xs text-gray-400 font-mono truncate max-w-md">
              Q: {question.slice(0, 60)}{question.length > 60 ? '...' : ''}
            </span>
          </div>
          <div className="flex items-center gap-6 text-xs font-mono">
            <span className="text-cyan-400">R{currentRound}</span>
            <span className="text-amber-400">{turns.length} turns</span>
            <span className="text-green-400">{totalTokens.toLocaleString()} tok</span>
            <span className="text-yellow-400">${totalCost.toFixed(4)}</span>
            <span className="text-purple-400">{avgLatency}ms avg</span>
            <span className="text-gray-500">{eventsPerSecond} evt/s</span>
          </div>
        </div>
      </header>

      {/* Main Grid - 3 columns */}
      <div className="flex-1 grid grid-cols-12 gap-0 overflow-hidden">
        {/* Left: Agent Status Panel */}
        <div className="col-span-2 border-r border-slate-700 p-2 flex flex-col">
          <div className="text-xs font-mono text-gray-500 mb-2 px-1">AGENTS</div>
          <div className="space-y-1">
            {selectedAgents.map((agentId) => {
              const agent = AGENTS[agentId];
              const agentTurns = turns.filter(t => t.participantId === agentId);
              const agentCost = agentTurns.reduce((s, t) => s + t.costUsd, 0);
              const agentTokens = agentTurns.reduce((s, t) => s + t.tokensUsed, 0);

              return (
                <div key={agentId} className="agent-status-card bg-slate-800/50 rounded p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${
                      agentId.includes('claude') ? 'bg-violet-400' :
                      agentId.includes('gpt') ? 'bg-green-400' :
                      agentId.includes('gemini') ? 'bg-blue-400' :
                      'bg-pink-400'
                    }`} />
                    <span className="text-xs font-semibold truncate">{agent?.name ?? agentId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs font-mono text-gray-400">
                    <span>{agentTurns.length} turns</span>
                    <span>{agentTokens} tok</span>
                    <span className="col-span-2 text-amber-400/80">${agentCost.toFixed(4)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consensus indicator */}
          {O.isSome(consensus) && (
            <div className="mt-auto pt-2 border-t border-slate-700">
              <div className="text-xs font-mono text-gray-500 mb-1">CONSENSUS</div>
              <div className="bg-slate-800/50 rounded p-2">
                <div className="text-2xl font-bold text-cyan-400 font-mono">
                  {Math.round(consensus.value.percentage * 100)}%
                </div>
                <div className="text-xs text-gray-500 capitalize">{consensus.value.level}</div>
              </div>
            </div>
          )}

          <button
            onClick={onReset}
            className="mt-2 text-xs font-mono text-gray-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
          >
            [NEW DEBATE]
          </button>
        </div>

        {/* Center: Turns */}
        <div className="col-span-6 flex flex-col overflow-hidden">
          <div className="text-xs font-mono text-gray-500 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
            <span>DEBATE TURNS</span>
            <span className="text-gray-600">{turns.length} responses</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {turns.length === 0 && isRunning && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="typing-dots mx-auto mb-2">
                    <span /><span /><span />
                  </div>
                  <p className="text-xs text-gray-500 font-mono">Awaiting first response...</p>
                </div>
              </div>
            )}
            {turns.map((turn) => (
              <TurnCard key={turn.turnId} turn={turn} />
            ))}
          </div>
        </div>

        {/* Right: Event Log */}
        <div className="col-span-4 border-l border-slate-700 flex flex-col overflow-hidden bg-slate-900/50">
          <div className="text-xs font-mono text-gray-500 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              CCR EVENT STREAM
              {streamStatus === 'connected' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              {streamStatus === 'connecting' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />}
              {streamStatus === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-red-400" />}
            </span>
            <span className="text-green-500">{ccrEvents.length} events</span>
          </div>
          {streamError && (
            <div className="text-xs text-red-400 px-3 py-1 bg-red-900/20 border-b border-red-900/50">
              {streamError}
            </div>
          )}
          <EventLog events={ccrEvents} />
        </div>
      </div>

      {/* Bottom Stats Bar */}
      <footer className="bg-slate-900 border-t border-slate-700 px-3 py-1.5">
        <div className="flex items-center justify-between text-xs font-mono text-gray-500">
          <div className="flex items-center gap-4">
            <span>DebateUI v0.1.0</span>
            <span className="text-gray-600">|</span>
            <span className={streamStatus === 'connected' ? 'text-green-500' : streamStatus === 'error' ? 'text-red-500' : 'text-yellow-500'}>
              CCR {streamStatus}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>Storage: Qdrant + PostgreSQL</span>
            <span className="text-gray-600">|</span>
            <span>Latency: {avgLatency}ms</span>
            <span className="text-gray-600">|</span>
            <span className="text-amber-500">${totalCost.toFixed(4)} total</span>
          </div>
        </div>
      </footer>
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
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className={`step-dot w-6 h-6 text-xs ${getStepStatus(step.id)}`}>
            {getStepStatus(step.id) === 'completed' ? (
              <CheckIcon className="w-3 h-3" />
            ) : (
              i + 1
            )}
          </div>
          <span className="ml-1.5 text-xs font-medium hidden sm:inline">{step.label}</span>
          {i < steps.length - 1 && (
            <div className={`step-line w-6 mx-2 ${getStepStatus(steps[i + 1]!.id) === 'completed' || getStepStatus(steps[i + 1]!.id) === 'active' ? '' : ''}`} />
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
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const { setConfig, startDebate, debateStarted, reset: resetStore } = useDebateStore.getState();

  const handleStartDebate = useCallback((agents: string[]) => {
    setSelectedAgents(agents);
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
    setSelectedAgents([]);
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
    return <DebateView question={question} selectedAgents={selectedAgents} onReset={handleReset} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header - compact */}
      <header className="border-b border-light">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-primary" />
            <span className="font-bold">DebateUI</span>
          </div>
          <span className="text-xs text-muted">AI Multi-Agent Debates</span>
        </div>
      </header>

      {/* Main content - reduced padding */}
      <main className="flex-1 flex flex-col justify-center px-4 py-6">
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

      {/* Footer - compact */}
      <footer className="border-t border-light py-2 text-center text-xs text-muted">
        Powered by Claude, GPT-4, Gemini & DeepSeek
      </footer>
    </div>
  );
};
