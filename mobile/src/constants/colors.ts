export const DarkColors = {
  background: '#161922',
  surface: '#1D212C',
  surfaceLight: '#282D3C',
  surfacePressed: '#141720',
  shadowLight: '#262B3A',
  shadowDark: '#101218',
  primary: '#818cf8',
  primaryLight: '#a5b4fc',
  primaryDark: '#6366f1',
  success: '#34d399',
  warning: '#fbbf24',
  danger: '#f87171',
  info: '#60a5fa',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  border: '#282d3c',
  borderLight: '#333a4d',
  // Risk levels
  low: '#34d399',
  moderate: '#fbbf24',
  high: '#f97316',
  critical: '#f87171',
  // Gradients
  gradientStart: '#818cf8',
  gradientEnd: '#c084fc',
  // Chart colors
  chart1: '#818cf8',
  chart2: '#34d399',
  chart3: '#fbbf24',
  chart4: '#60a5fa',
  chart5: '#f472b6',
};

export const LightColors = {
  background: '#F0F3F8',
  surface: '#F0F3F8',
  surfaceLight: '#E6EBF2',
  surfacePressed: '#E4E9F2',
  shadowLight: '#FFFFFF',
  shadowDark: '#A6B4C8',
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5B4BC4',
  success: '#00B894',
  warning: '#FFAB00',
  danger: '#FF5252',
  info: '#0984E3',
  text: '#2D3436',
  textMuted: '#636E72',
  textDim: '#B2BEC3',
  border: '#E2E8F0',
  borderLight: '#EDF2F7',
  // Risk levels
  low: '#00B894',
  moderate: '#FFAB00',
  high: '#FF7675',
  critical: '#FF5252',
  // Gradients
  gradientStart: '#6C5CE7',
  gradientEnd: '#A29BFE',
  // Chart colors
  chart1: '#6C5CE7',
  chart2: '#00B894',
  chart3: '#FFAB00',
  chart4: '#0984E3',
  chart5: '#FF7675',
};

export type ThemeColors = typeof LightColors;

// Static default export resolved to LightColors for a fresh, attractive light look.
export const Colors = LightColors;

export const getRiskColor = (risk: string, colors: ThemeColors = LightColors): string => {
  switch (risk) {
    case 'low': return colors.low;
    case 'moderate': return colors.moderate;
    case 'high': return colors.high;
    case 'critical': return colors.critical;
    default: return colors.primary;
  }
};

export const getScoreColor = (score: number, colors: ThemeColors = LightColors): string => {
  if (score >= 80) return colors.success;
  if (score >= 60) return colors.moderate;
  if (score >= 40) return colors.high;
  return colors.critical;
};
