import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import { Recommendation } from '../types';

interface RecommendationCardProps {
  recommendation: Recommendation;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  sleep: 'moon-waning-crescent',
  phone: 'cellphone',
  activity: 'run',
  mental: 'brain',
  general: 'heart-pulse',
};

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation, compact = false }) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  const priorityColors = { high: colors.danger, medium: colors.warning, low: colors.success };
  const priorityColor = priorityColors[recommendation.priority];
  const categoryIcon = CATEGORY_ICONS[recommendation.category] || 'lightbulb-on';

  const toggleStep = (index: number) => {
    const newSet = new Set(checkedSteps);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setCheckedSteps(newSet);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: priorityColor }]}
      onPress={() => !compact && setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBadge, { backgroundColor: priorityColor + '22' }]}>
            <MaterialCommunityIcons name={categoryIcon as any} size={18} color={priorityColor} />
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={compact ? 1 : 2}>
                {recommendation.title}
              </Text>
              <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22' }]}>
                <Text style={[styles.priorityText, { color: priorityColor }]}>
                  {recommendation.priority.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>
        {!compact && (
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.textMuted}
          />
        )}
      </View>

      <Text style={styles.description} numberOfLines={compact ? 2 : undefined}>
        {recommendation.description}
      </Text>

      {!compact && (
        <View style={styles.impactRow}>
          <MaterialCommunityIcons name="lightning-bolt" size={14} color={colors.warning} />
          <Text style={styles.impactText}>
            +{recommendation.estimated_impact} wellness points impact
          </Text>
        </View>
      )}

      {expanded && !compact && (
        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Action Steps</Text>
          {recommendation.action_steps.map((step, index) => (
            <TouchableOpacity
              key={index}
              style={styles.stepRow}
              onPress={() => toggleStep(index)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox,
                checkedSteps.has(index) && { backgroundColor: colors.success, borderColor: colors.success }
              ]}>
                {checkedSteps.has(index) && (
                  <MaterialCommunityIcons name="check" size={12} color="#fff" />
                )}
              </View>
              <Text style={[
                styles.stepText,
                checkedSteps.has(index) && styles.stepChecked
              ]}>
                {step}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 10,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 8,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  impactText: {
    fontSize: 12,
    color: colors.warning,
    fontWeight: '600',
  },
  stepsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stepsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  stepChecked: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
});

export default RecommendationCard;
