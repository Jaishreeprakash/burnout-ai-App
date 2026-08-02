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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = getScoreColor(score, colors);

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: score,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <View style={[styles.container, { width: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id={`ringGrad_${score}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.6" />
          </SvgGradient>
        </Defs>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceLight}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFillObject, styles.centerContent]}>
        <Text style={[styles.scoreText, { color, fontSize: size * 0.22 }]}>{score}</Text>
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
    lineHeight: undefined,
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
