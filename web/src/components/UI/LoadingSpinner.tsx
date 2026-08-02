import React from 'react';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label,
}) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-3',
  };

  return (
    <div className={clsx('flex flex-col items-center justify-center gap-2', className)}>
      <div
        className={clsx(
          'rounded-full border-slate-700 border-t-indigo-500 animate-spin',
          sizes[size]
        )}
      />
      {label && <p className="text-sm text-slate-400">{label}</p>}
    </div>
  );
};

export const PageLoader: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => (
  <div className="flex items-center justify-center min-h-[400px]">
    <LoadingSpinner size="xl" label={message} />
  </div>
);

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('bg-slate-800 border border-slate-700 rounded-xl p-5 animate-pulse', className)}>
    <div className="h-4 bg-slate-700 rounded w-1/3 mb-3" />
    <div className="h-8 bg-slate-700 rounded w-1/2 mb-2" />
    <div className="h-3 bg-slate-700 rounded w-2/3" />
  </div>
);
