import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ThemeColors, getScoreColor } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

interface WellnessRingProps {
  score: number;
  label?: string;
  size?: number;
  showLabel?: boolean;
}

const WellnessRing: React.FC<WellnessRingProps> = ({
  score,
  label = 'Wellness',
  size = 90,
  showLabel = true,
}) => {
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const strokeWidth = size * 0.11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score, colors);
  const isLight = scheme === 'light';

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <View style={[styles.container, { width: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={`ringGrad_${score}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={colors.primaryLight} stopOpacity="0.8" />
          </SvgGradient>
        </Defs>
        {/* Outer track channel shadow */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isLight ? '#E4E9F2' : '#141720'}
          strokeWidth={strokeWidth + 3}
          fill="none"
        />
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isLight ? '#CBD5E1' : '#282D3C'}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.5}
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#ringGrad_${score})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.centerContent]}>
        <Text style={[styles.scoreText, { color, fontSize: size * 0.23 }]}>{score}</Text>
        {showLabel && <Text style={[styles.labelText, { fontSize: size * 0.11 }]}>%</Text>}
      </View>
      {showLabel && <Text style={[styles.ringLabel, { color }]}>{label}</Text>}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontWeight: '800',
    color: colors.text,
  },
  labelText: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  ringLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    color: colors.textMuted,
  },
});

export default WellnessRing;
