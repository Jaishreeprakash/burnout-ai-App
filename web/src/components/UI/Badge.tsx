import React from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
}) => {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-slate-700 text-slate-300 border-slate-600',
    success: 'bg-green-500/10 text-green-400 border-green-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    danger:  'bg-red-500/10 text-red-400 border-red-500/30',
    info:    'bg-blue-500/10 text-blue-400 border-blue-500/30',
    purple:  'bg-purple-500/10 text-purple-400 border-purple-500/30',
  };

  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-slate-400',
    success: 'bg-green-400',
    warning: 'bg-amber-400',
    danger:  'bg-red-400',
    info:    'bg-blue-400',
    purple:  'bg-purple-400',
  };

  const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-xs px-2.5 py-1' };

  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border font-medium',
      variants[variant], sizes[size], className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};

// ── RiskBadge ─────────────────────────────────────────────────────────────────
// Accepts backend values in any case: "low" | "LOW" | "moderate" | "MODERATE" …
const RISK_CONFIG: Record<string, { variant: BadgeVariant; label: string }> = {
  low:      { variant: 'success', label: 'Low Risk' },
  moderate: { variant: 'warning', label: 'Moderate' },
  high:     { variant: 'danger',  label: 'High Risk' },
  critical: { variant: 'danger',  label: 'Critical'  },
};

export const RiskBadge: React.FC<{ level?: string | null; showDot?: boolean }> = ({
  level,
  showDot = true,
}) => {
  const key = (level ?? '').toLowerCase();
  const cfg = RISK_CONFIG[key] ?? RISK_CONFIG['low'];
  return <Badge variant={cfg.variant} dot={showDot}>{cfg.label}</Badge>;
};

// ── PriorityBadge ─────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { variant: BadgeVariant; label: string }> = {
  high:   { variant: 'danger',  label: 'High Priority' },
  medium: { variant: 'warning', label: 'Medium' },
  low:    { variant: 'success', label: 'Low' },
};

export const PriorityBadge: React.FC<{ priority?: string | null }> = ({ priority }) => {
  const key = (priority ?? '').toLowerCase();
  const cfg = PRIORITY_CONFIG[key] ?? PRIORITY_CONFIG['low'];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

// Re-export types so existing imports keep working
export type { BadgeVariant };
