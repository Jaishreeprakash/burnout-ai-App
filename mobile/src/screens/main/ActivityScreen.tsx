import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { activityApi } from '../../services/api';
import { ActivityRecord } from '../../types';
import { ThemeColors, getScoreColor } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

interface ProgressCircleProps {
  label: string;
  current: number;
  goal: number;
  unit: string;
  color: string;
  icon: string;
  size?: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ label, current, goal, unit, color, icon, size = 100 }) => {
  const { colors } = useTheme();
  const progressStyles = useMemo(() => createProgressStyles(colors), [colors]);
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, current / goal);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[progressStyles.container, { width: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.surfaceLight} strokeWidth={strokeWidth} fill="none"
        />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={progressStyles.center}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
        <Text style={[progressStyles.value, { color }]}>{current}</Text>
        <Text style={progressStyles.unit}>{unit}</Text>
      </View>
      <Text style={progressStyles.label}>{label}</Text>
      <Text style={progressStyles.goalText}>Goal: {goal}{unit}</Text>
    </View>
  );
};

const createProgressStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { alignItems: 'center' },
  center: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  value: { fontSize: 18, fontWeight: '800' },
  unit: { fontSize: 10, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: '700', color: colors.text, marginTop: 8 },
  goalText: { fontSize: 10, color: colors.textMuted },
});

const ActivityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [studyHours, setStudyHours] = useState('');
  const [workHours, setWorkHours] = useState('');
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [breakCount, setBreakCount] = useState('');
  const [activityNotes, setActivityNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await activityApi.getActivityRecords(28);
      setRecords(data);
    } finally {
      setIsLoading(false);
    }
  };

  const today = records[records.length - 1];
  const focusScore = today?.focus_score ?? 0;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await activityApi.logActivity({
        study_hours: parseFloat(studyHours) || 0,
        work_hours: parseFloat(workHours) || 0,
        exercise_minutes: parseInt(exerciseMinutes) || 0,
        break_count: parseInt(breakCount) || 0,
        notes: activityNotes,
        date: new Date().toISOString(),
        focus_score: focusScore,
      });
      Alert.alert('Saved!', 'Activity logged successfully.', [
        { text: 'OK', onPress: () => { loadData(); setShowForm(false); } },
      ]);
      setStudyHours('');
      setWorkHours('');
      setExerciseMinutes('');
      setBreakCount('');
      setActivityNotes('');
    } catch {
      Alert.alert('Error', 'Failed to log activity. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Heatmap data (4 weeks x 7 days = 28 cells)
  const heatmapData = Array.from({ length: 28 }, (_, i) => {
    const record = records[i];
    if (!record) return 0;
    const totalActive = record.study_hours + record.work_hours + record.exercise_minutes / 60;
    return Math.min(1, totalActive / 12);
  });

  const heatmapColor = (intensity: number) => {
    if (intensity === 0) return colors.surfaceLight;
    if (intensity < 0.3) return colors.success + '40';
    if (intensity < 0.6) return colors.success + '80';
    return colors.success;
  };

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        {/* Fixed (not theme-driven) decorative banner gradient, matching the auth screens' hero background. */}
        <LinearGradient colors={['#14532d', '#0f172a']} style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Activity Tracker</Text>
            <MaterialCommunityIcons name="lightning-bolt" size={24} color={colors.warning} />
          </View>
          <View style={styles.focusCard}>
            <View>
              <Text style={styles.focusLabel}>Focus Score</Text>
              <Text style={[styles.focusScore, { color: getScoreColor(focusScore, colors) }]}>{focusScore}</Text>
              <Text style={styles.focusSubtext}>/ 100</Text>
            </View>
            <View style={styles.focusBars}>
              {[...Array(10)].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.focusBar,
                    { backgroundColor: i < Math.floor(focusScore / 10) ? getScoreColor(focusScore, colors) : colors.surfaceLight },
                  ]}
                />
              ))}
            </View>
          </View>
        </LinearGradient>

        {/* Progress Circles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Goals</Text>
          <View style={styles.circlesRow}>
            <ProgressCircle
              label="Study"
              current={today?.study_hours ?? 0}
              goal={4}
              unit="h"
              color={colors.info}
              icon="book-open-outline"
            />
            <ProgressCircle
              label="Work"
              current={today?.work_hours ?? 0}
              goal={8}
              unit="h"
              color={colors.warning}
              icon="briefcase-outline"
            />
            <ProgressCircle
              label="Exercise"
              current={today?.exercise_minutes ?? 0}
              goal={30}
              unit="min"
              color={colors.success}
              icon="run"
            />
          </View>

          <View style={styles.breakRow}>
            <View style={styles.breakCard}>
              <MaterialCommunityIcons name="coffee-outline" size={20} color={colors.primary} />
              <View>
                <Text style={styles.breakValue}>{today?.break_count ?? 0}</Text>
                <Text style={styles.breakLabel}>Breaks taken</Text>
              </View>
            </View>
            <View style={styles.breakCard}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={colors.success} />
              <View>
                <Text style={styles.breakValue}>
                  {(((today?.study_hours ?? 0) + (today?.work_hours ?? 0)) * 60 / ((today?.break_count ?? 0) + 1)).toFixed(0)} min
                </Text>
                <Text style={styles.breakLabel}>Avg focus block</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Activity Heatmap */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Heatmap (4 Weeks)</Text>
          <View style={styles.heatmapCard}>
            {/* Day labels */}
            <View style={styles.heatmapDayLabels}>
              {days.map((d, i) => (
                <Text key={i} style={styles.heatmapDayLabel}>{d}</Text>
              ))}
            </View>
            {/* Grid */}
            <View style={styles.heatmapGrid}>
              {Array.from({ length: 4 }, (_, week) => (
                <View key={week} style={styles.heatmapRow}>
                  {Array.from({ length: 7 }, (_, day) => {
                    const index = week * 7 + day;
                    return (
                      <View
                        key={day}
                        style={[
                          styles.heatmapCell,
                          { backgroundColor: heatmapColor(heatmapData[index] ?? 0) },
                        ]}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
            <View style={styles.heatmapLegend}>
              <Text style={styles.heatmapLegendLabel}>Less</Text>
              {[0, 0.3, 0.6, 1].map((v, i) => (
                <View key={i} style={[styles.heatmapLegendCell, { backgroundColor: heatmapColor(v) }]} />
              ))}
              <Text style={styles.heatmapLegendLabel}>More</Text>
            </View>
          </View>
        </View>

        {/* Log Activity Button */}
        <TouchableOpacity
          style={styles.logButtonWrapper}
          onPress={() => { setShowForm(!showForm); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          activeOpacity={0.85}
          accessibilityLabel={showForm ? "Close activity log form" : "Log today's activity"}
          accessibilityRole="button"
        >
          <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.logButton}>
            <MaterialCommunityIcons name={showForm ? 'close' : 'plus-circle-outline'} size={20} color="#fff" />
            <Text style={styles.logButtonText}>{showForm ? 'Close' : 'Log Today\'s Activity'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Log Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log Activity</Text>

            <View style={styles.formGrid}>
              <ActivityInput label="Study Hours" icon="book-open-outline" value={studyHours} onChangeText={setStudyHours} placeholder="3.0" colors={colors} styles={styles} />
              <ActivityInput label="Work Hours" icon="briefcase-outline" value={workHours} onChangeText={setWorkHours} placeholder="6.0" colors={colors} styles={styles} />
              <ActivityInput label="Exercise (min)" icon="run" value={exerciseMinutes} onChangeText={setExerciseMinutes} placeholder="30" keyboardType="number-pad" colors={colors} styles={styles} />
              <ActivityInput label="Breaks Taken" icon="coffee-outline" value={breakCount} onChangeText={setBreakCount} placeholder="4" keyboardType="number-pad" colors={colors} styles={styles} />
            </View>

            <View style={styles.notesContainer}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={activityNotes}
                onChangeText={setActivityNotes}
                placeholder="How was your productivity today?"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={styles.submitWrapper}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityLabel="Save activity log"
              accessibilityRole="button"
            >
              <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.submitButton}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Save Activity Log</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const ActivityInput: React.FC<{
  label: string;
  icon: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, icon, value, onChangeText, placeholder, keyboardType, colors, styles }) => (
  <View style={styles.activityInput}>
    <View style={styles.activityInputHeader}>
      <MaterialCommunityIcons name={icon as any} size={14} color={colors.textMuted} />
      <Text style={styles.inputLabel}>{label}</Text>
    </View>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      keyboardType={keyboardType ?? 'decimal-pad'}
    />
  </View>
);

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20 },
  header: { borderRadius: 24, padding: 20, marginVertical: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  // Pinned (not theme-driven): sits on the fixed-color end of the header gradient, not the themed surface.
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  focusCard: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  // focusLabel/focusSubtext are pinned (not theme-driven): they sit inside the fixed-color header banner.
  focusLabel: { fontSize: 13, color: '#94a3b8' },
  focusScore: { fontSize: 48, fontWeight: '900', lineHeight: 54 },
  focusSubtext: { fontSize: 13, color: '#94a3b8' },
  focusBars: { flex: 1, flexDirection: 'row', gap: 4 },
  focusBar: { flex: 1, height: 36, borderRadius: 6 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  circlesRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  breakRow: { flexDirection: 'row', gap: 12 },
  breakCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  breakValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  breakLabel: { fontSize: 11, color: colors.textMuted },
  heatmapCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border },
  heatmapDayLabels: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 },
  heatmapDayLabel: { fontSize: 10, color: colors.textMuted, width: 24, textAlign: 'center' },
  heatmapGrid: { gap: 4 },
  heatmapRow: { flexDirection: 'row', gap: 4, justifyContent: 'space-around' },
  heatmapCell: { width: 28, height: 28, borderRadius: 6 },
  heatmapLegend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 4 },
  heatmapLegendLabel: { fontSize: 10, color: colors.textMuted },
  heatmapLegendCell: { width: 16, height: 16, borderRadius: 4 },
  logButtonWrapper: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  logButton: { height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  formCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  activityInput: { width: '47%' },
  activityInputHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  inputLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 12, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  notesContainer: { marginBottom: 14 },
  notesInput: { backgroundColor: colors.background, borderRadius: 12, padding: 12, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 80 },
  submitWrapper: { borderRadius: 14, overflow: 'hidden' },
  submitButton: { height: 52, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default ActivityScreen;
