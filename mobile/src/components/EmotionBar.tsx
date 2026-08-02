import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { ThemeColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

interface EmotionBarProps {
  emotion: string;
  confidence: number;
  isTop?: boolean;
}

const EMOTION_EMOJIS: Record<string, string> = {
  Happy: '😊',
  Sad: '😢',
  Angry: '😡',
  Neutral: '😐',
  Surprised: '😲',
  Anxious: '😰',
  Fear: '😨',
  Disgust: '🤢',
  Contempt: '😒',
  Excited: '🤩',
};

const EMOTION_COLORS: Record<string, string> = {
  Happy: '#22c55e',
  Sad: '#3b82f6',
  Angry: '#ef4444',
  Neutral: '#94a3b8',
  Surprised: '#f59e0b',
  Anxious: '#f97316',
  Fear: '#8b5cf6',
  Disgust: '#84cc16',
  Contempt: '#64748b',
  Excited: '#ec4899',
};

const EmotionBar: React.FC<EmotionBarProps> = ({ emotion, confidence, isTop = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const widthAnim = useRef(new Animated.Value(0)).current;
  const percentage = Math.round(confidence * 100);
  const color = EMOTION_COLORS[emotion] || colors.primary;
  const emoji = EMOTION_EMOJIS[emotion] || '😐';

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: confidence,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [confidence]);

  const barWidth = widthAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, isTop && styles.topContainer]}>
      <View style={styles.leftSection}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={[styles.emotionName, isTop && styles.topEmotionName]}>{emotion}</Text>
      </View>
      <View style={styles.barContainer}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[styles.barFill, { width: barWidth, backgroundColor: color }]}
          />
        </View>
      </View>
      <Text style={[styles.percentage, { color }]}>{percentage}%</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  topContainer: {
    marginVertical: 6,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
    gap: 6,
  },
  emoji: {
    fontSize: 18,
  },
  emotionName: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '500',
  },
  topEmotionName: {
    fontSize: 15,
    fontWeight: '700',
  },
  barContainer: {
    flex: 1,
  },
  barTrack: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    width: 40,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
});

export default EmotionBar;
