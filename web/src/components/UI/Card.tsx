import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glass = false,
  hover = false,
  padding = 'md',
}) => {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={clsx(
        'rounded-xl border',
        glass
          ? 'bg-slate-800/60 backdrop-blur-sm border-slate-700/50'
          : 'bg-slate-800 border-slate-700',
        hover && 'hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-200',
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, action, icon, className }) => (
  <div className={clsx('flex items-start justify-between mb-4', className)}>
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);
