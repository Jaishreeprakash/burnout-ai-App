import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// Flexible wellness prop accepted by this card
export interface WellnessCardData {
  overall_score: number;
  sleep_component: number;
  activity_component: number;
  emotion_component: number;
  balance_component: number;
  trend: 'improving' | 'stable' | 'declining';
  calculated_at: string;
}

interface WellnessCardProps {
  wellness: WellnessCardData;
}

const ScoreRing: React.FC<{ score: number; color: string; size?: number }> = ({ score, color, size = 40 }) => {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }} />
    </svg>
  );
};

const COMPONENTS = [
  { key: 'sleep_component',    label: 'Sleep',    color: '#818cf8' },
  { key: 'activity_component', label: 'Activity', color: '#34d399' },
  { key: 'emotion_component',  label: 'Emotions', color: '#fb923c' },
  { key: 'balance_component',  label: 'Balance',  color: '#a78bfa' },
];

export const WellnessCard: React.FC<WellnessCardProps> = ({ wellness }) => {
  const TrendIcon =
    wellness.trend === 'improving' ? TrendingUp :
    wellness.trend === 'declining' ? TrendingDown : Minus;

  const trendColor =
    wellness.trend === 'improving' ? 'text-green-400' :
    wellness.trend === 'declining' ? 'text-red-400' : 'text-slate-400';

  const overallColor =
    wellness.overall_score >= 75 ? '#22c55e' :
    wellness.overall_score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Overall ring */}
      <div className="relative">
        <svg width={120} height={120} className="transform -rotate-90">
          <circle cx={60} cy={60} r={50} fill="none" stroke="#1e293b" strokeWidth={8} />
          <circle cx={60} cy={60} r={50} fill="none" stroke={overallColor} strokeWidth={8}
            strokeDasharray={2 * Math.PI * 50}
            strokeDashoffset={2 * Math.PI * 50 * (1 - wellness.overall_score / 100)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1.5s ease-out', filter: `drop-shadow(0 0 8px ${overallColor}60)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white">{Math.round(wellness.overall_score)}</span>
          <span className="text-xs text-slate-400">Wellness</span>
        </div>
      </div>

      {/* Trend */}
      <div className={`flex items-center gap-1.5 text-sm font-medium ${trendColor}`}>
        <TrendIcon size={16} />
        <span className="capitalize">{wellness.trend}</span>
      </div>

      {/* Component rings */}
      <div className="grid grid-cols-2 gap-3 w-full">
        {COMPONENTS.map((comp) => {
          const value = Math.round(wellness[comp.key as keyof WellnessCardData] as number);
          return (
            <div key={comp.key} className="flex items-center gap-2">
              <ScoreRing score={value} color={comp.color} size={36} />
              <div>
                <p className="text-xs text-slate-400">{comp.label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
