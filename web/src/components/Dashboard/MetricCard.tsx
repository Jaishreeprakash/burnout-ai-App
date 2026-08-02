import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { SparklineChart } from '../Charts/TrendChart';

type TrendDirection = 'up' | 'down' | 'stable';
type MetricStatus = 'good' | 'warning' | 'danger' | 'neutral';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  unit?: string;
  trend?: TrendDirection;
  trendValue?: string;
  status?: MetricStatus;
  sparklineData?: number[];
  subtitle?: string;
  className?: string;
}

const statusColors: Record<MetricStatus, string> = {
  good: 'text-green-400',
  warning: 'text-amber-400',
  danger: 'text-red-400',
  neutral: 'text-slate-400',
};

const statusBg: Record<MetricStatus, string> = {
  good: 'bg-green-500/10',
  warning: 'bg-amber-500/10',
  danger: 'bg-red-500/10',
  neutral: 'bg-slate-700/50',
};

const trendColors: Record<TrendDirection, string> = {
  up: 'text-green-400',
  down: 'text-red-400',
  stable: 'text-slate-400',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  value,
  unit,
  trend,
  trendValue,
  status = 'neutral',
  sparklineData,
  subtitle,
  className,
}) => {
  const TrendIcon =
    trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={clsx(
        'bg-slate-800 border border-slate-700 rounded-xl p-4',
        'hover:border-slate-600 transition-all duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('p-2 rounded-lg', statusBg[status])}>
          <span className={statusColors[status]}>{icon}</span>
        </div>
        {trend && (
          <div className={clsx('flex items-center gap-1 text-xs font-medium', trendColors[trend])}>
            <TrendIcon size={12} />
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>

      <div className="mb-1">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-white">{value}</span>
          {unit && <span className="text-sm text-slate-400">{unit}</span>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 -mx-1">
          <SparklineChart
            data={sparklineData}
            color={
              status === 'good' ? '#22c55e' :
              status === 'warning' ? '#f59e0b' :
              status === 'danger' ? '#ef4444' :
              '#6366f1'
            }
          />
        </div>
      )}
    </div>
  );
};
