import React, { useState } from 'react';
import { CheckCircle2, Circle, ArrowRight, Moon, Smartphone, Activity, Brain, Users, Apple } from 'lucide-react';
import { Recommendation, RecommendationCategory } from '../../types';
import { PriorityBadge } from '../UI/Badge';
import { clsx } from 'clsx';

const categoryIcons: Record<RecommendationCategory, React.ReactNode> = {
  sleep: <Moon size={16} />,
  phone: <Smartphone size={16} />,
  activity: <Activity size={16} />,
  mental: <Brain size={16} />,
  social: <Users size={16} />,
  nutrition: <Apple size={16} />,
};

const categoryColors: Record<RecommendationCategory, string> = {
  sleep: 'text-indigo-400 bg-indigo-500/10',
  phone: 'text-cyan-400 bg-cyan-500/10',
  activity: 'text-green-400 bg-green-500/10',
  mental: 'text-purple-400 bg-purple-500/10',
  social: 'text-pink-400 bg-pink-500/10',
  nutrition: 'text-orange-400 bg-orange-500/10',
};

interface RecommendationCardProps {
  recommendation: Recommendation;
  onComplete?: (id: number) => void;
  expanded?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onComplete,
  expanded = false,
}) => {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [isExpanded, setIsExpanded] = useState(expanded);

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const completionPercentage = recommendation.action_steps.length > 0
    ? Math.round((checkedSteps.size / recommendation.action_steps.length) * 100)
    : 0;

  const colorClass = categoryColors[recommendation.category];

  return (
    <div className={clsx(
      'bg-slate-800 border rounded-xl overflow-hidden transition-all duration-200',
      recommendation.completed
        ? 'border-green-500/20 opacity-60'
        : 'border-slate-700 hover:border-slate-600'
    )}>
      {/* Header */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={clsx('p-2 rounded-lg flex-shrink-0', colorClass)}>
              {categoryIcons[recommendation.category]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <PriorityBadge priority={recommendation.priority} />
                <span className="text-xs text-slate-400 capitalize">{recommendation.category}</span>
              </div>
              <h4 className="text-sm font-semibold text-white">{recommendation.title}</h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{recommendation.description}</p>
            </div>
          </div>
          <div className="text-slate-400 flex-shrink-0">
            <ArrowRight
              size={16}
              className={clsx('transition-transform', isExpanded && 'rotate-90')}
            />
          </div>
        </div>

        {/* Progress bar */}
        {checkedSteps.size > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">Progress</span>
              <span className="text-indigo-400 font-medium">{completionPercentage}%</span>
            </div>
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50">
          {/* Meta info */}
          <div className="flex items-center gap-4 py-3 text-xs text-slate-400">
            <span>Impact: <span className="text-slate-300">{recommendation.estimated_impact}</span></span>
            <span>•</span>
            <span>Time: <span className="text-slate-300">{recommendation.time_to_implement}</span></span>
          </div>

          {/* Action steps */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Action Steps</p>
            {recommendation.action_steps.map((step, i) => (
              <button
                key={i}
                onClick={() => toggleStep(i)}
                className="flex items-start gap-3 w-full text-left group hover:bg-slate-700/30 p-2 rounded-lg transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {checkedSteps.has(i) ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <Circle size={16} className="text-slate-400 group-hover:text-slate-400" />
                  )}
                </div>
                <span className={clsx(
                  'text-sm',
                  checkedSteps.has(i)
                    ? 'text-slate-400 line-through'
                    : 'text-slate-300'
                )}>
                  {step}
                </span>
              </button>
            ))}
          </div>

          {/* Complete button */}
          {!recommendation.completed && onComplete && recommendation.id && (
            <button
              onClick={() => onComplete(recommendation.id!)}
              className="mt-4 w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg py-2 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={15} />
              Mark as Complete
            </button>
          )}
        </div>
      )}
    </div>
  );
};
