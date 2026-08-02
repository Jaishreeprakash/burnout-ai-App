import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientCardProps {
  children: ReactNode;
  style?: ViewStyle;
  colors?: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'dark';
}

const GRADIENT_VARIANTS = {
  primary: ['#6366f1', '#8b5cf6'] as [string, string],
  success: ['#22c55e', '#16a34a'] as [string, string],
  warning: ['#f59e0b', '#d97706'] as [string, string],
  danger: ['#ef4444', '#dc2626'] as [string, string],
  dark: ['#1e293b', '#0f172a'] as [string, string],
};

const GradientCard: React.FC<GradientCardProps> = ({
  children,
  style,
  colors,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
  variant = 'primary',
}) => {
  const gradientColors = colors || GRADIENT_VARIANTS[variant];

  return (
    <LinearGradient
      colors={gradientColors}
      start={start}
      end={end}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
  },
});

export default GradientCard;
