export const DarkColors = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceLight: '#334155',
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  border: '#334155',
  borderLight: '#475569',
  // Risk levels
  low: '#22c55e',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
  // Gradients
  gradientStart: '#6366f1',
  gradientEnd: '#8b5cf6',
  // Chart colors
  chart1: '#6366f1',
  chart2: '#22c55e',
  chart3: '#f59e0b',
  chart4: '#3b82f6',
  chart5: '#ec4899',
};

export const LightColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceLight: '#e2e8f0',
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  info: '#2563eb',
  text: '#0f172a',
  textMuted: '#475569',
  textDim: '#64748b',
  border: '#e2e8f0',
  borderLight: '#cbd5e1',
  // Risk levels
  low: '#16a34a',
  moderate: '#d97706',
  high: '#ea580c',
  critical: '#dc2626',
  // Gradients
  gradientStart: '#6366f1',
  gradientEnd: '#8b5cf6',
  // Chart colors
  chart1: '#6366f1',
  chart2: '#16a34a',
  chart3: '#d97706',
  chart4: '#2563eb',
  chart5: '#db2777',
};

export type ThemeColors = typeof DarkColors;

// Static default export kept for any code that hasn't migrated to useTheme() yet.
// Always resolves to the dark palette (the app's original, still-supported look).
export const Colors = DarkColors;

export const getRiskColor = (risk: string, colors: ThemeColors = DarkColors): string => {
  switch (risk) {
    case 'low': return colors.low;
    case 'moderate': return colors.moderate;
    case 'high': return colors.high;
    case 'critical': return colors.critical;
    default: return colors.primary;
  }
};

export const getScoreColor = (score: number, colors: ThemeColors = DarkColors): string => {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.moderate;
  if (score >= 40) return colors.high;
  return colors.critical;
};
