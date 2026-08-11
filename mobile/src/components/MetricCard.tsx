import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors, getScoreColor } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import NeumorphicView from './NeumorphicView';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  change?: number;
  unit?: string;
  score?: number;
  onPress?: () => void;
  width?: number;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  change,
  unit,
  score,
  onPress,
  width = 145,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = score !== undefined ? getScoreColor(score, colors) : colors.primary;
  const isPositive = change !== undefined && change >= 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{ marginRight: 14 }}
    >
      <NeumorphicView
        variant="raised"
        borderRadius={20}
        padding={14}
        style={StyleSheet.flatten([styles.card, { width, borderLeftWidth: 3, borderLeftColor: color }])}
      >
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: color + '1A' }]}>
            <MaterialCommunityIcons name={icon as any} size={18} color={color} />
          </View>
          {change !== undefined && (
            <View
              style={[
                styles.changeBadge,
                { backgroundColor: isPositive ? colors.success + '1F' : colors.danger + '1F' },
              ]}
            >
              <MaterialCommunityIcons
                name={isPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={isPositive ? colors.success : colors.danger}
              />
              <Text style={[styles.changeText, { color: isPositive ? colors.success : colors.danger }]}>
                {Math.abs(change)}%
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.value, { color }]}>
          {value}
          {unit && <Text style={styles.unit}>{unit}</Text>}
        </Text>

        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {score !== undefined && (
          <View style={styles.scoreBarBackground}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${Math.min(100, Math.max(0, score))}%` as any, backgroundColor: color },
              ]}
            />
          </View>
        )}
      </NeumorphicView>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      justifyContent: 'space-between',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    changeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 8,
      gap: 2,
    },
    changeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    value: {
      fontSize: 24,
      fontWeight: '800',
      lineHeight: 28,
      marginBottom: 4,
    },
    unit: {
      fontSize: 13,
      fontWeight: '600',
      opacity: 0.7,
    },
    title: {
      fontSize: 12,
      color: colors.textMuted,
      fontWeight: '600',
      marginBottom: 8,
    },
    scoreBarBackground: {
      height: 4,
      backgroundColor: colors.surfacePressed,
      borderRadius: 2,
      overflow: 'hidden',
    },
    scoreBarFill: {
      height: '100%',
      borderRadius: 2,
    },
  });

export default MetricCard;
