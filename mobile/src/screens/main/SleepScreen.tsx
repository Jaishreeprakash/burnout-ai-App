import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { sleepApi } from '../../services/api';
import { SleepRecord } from '../../types';
import WellnessRing from '../../components/WellnessRing';
import { ThemeColors, getScoreColor } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const SleepScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<SleepRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [bedtime, setBedtime] = useState('23:00');
  const [wakeTime, setWakeTime] = useState('07:00');
  const [quality, setQuality] = useState(7);
  const [interruptions, setInterruptions] = useState('1');
  const [notes, setNotes] = useState('');

  // Tips accordion
  const [expandedTip, setExpandedTip] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await sleepApi.getSleepRecords(7);
      setRecords(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDuration = (): number => {
    const [bH, bM] = bedtime.split(':').map(Number);
    const [wH, wM] = wakeTime.split(':').map(Number);
    let diff = (wH * 60 + wM) - (bH * 60 + bM);
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await sleepApi.logSleep({
        bedtime,
        wake_time: wakeTime,
        duration_hours: calculateDuration(),
        quality_score: quality * 10,
        interruptions: parseInt(interruptions) || 0,
        notes,
        date: new Date().toISOString(),
      });
      Alert.alert('Logged!', 'Your sleep record has been saved.', [
        { text: 'OK', onPress: loadData },
      ]);
      setBedtime('23:00');
      setWakeTime('07:00');
      setQuality(7);
      setNotes('');
    } catch (err) {
      Alert.alert('Error', 'Failed to log sleep. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgQuality = records.length
    ? Math.round(records.reduce((s, r) => s + r.quality_score, 0) / records.length)
    : 0;

  const avgDuration = records.length
    ? Math.round((records.reduce((s, r) => s + r.duration_hours, 0) / records.length) * 10) / 10
    : 0.0;

  const getPastSevenDays = () => {
    const labels = [];
    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(weekdays[d.getDay()]);
    }
    return labels;
  };

  const chartData = {
    labels: records.length
      ? records.slice(-7).map((r) => {
          const d = new Date(r.date);
          return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][d.getDay()];
        })
      : getPastSevenDays(),
    datasets: [{ data: records.length ? records.slice(-7).map((r) => r.duration_hours) : [0, 0, 0, 0, 0, 0, 0] }],
  };

  const sleepTips = [
    {
      title: 'Consistent Sleep Schedule',
      content: 'Go to bed and wake up at the same time every day, even on weekends. This regulates your body\'s internal clock.',
    },
    {
      title: 'Limit Screen Time Before Bed',
      content: 'The blue light from screens suppresses melatonin production. Avoid screens 1-2 hours before sleep.',
    },
    {
      title: 'Create a Sleep-Friendly Environment',
      content: 'Keep your room cool (65-68°F), dark, and quiet. Use blackout curtains and white noise if needed.',
    },
    {
      title: 'Avoid Caffeine After 2 PM',
      content: 'Caffeine has a half-life of 5-7 hours. Having coffee after 2 PM can still be active in your system at bedtime.',
    },
    {
      title: 'Wind Down Routine',
      content: 'A 30-minute relaxation routine—reading, meditation, or light stretching—signals your body it\'s time to sleep.',
    },
  ];

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: () => colors.textMuted,
    propsForBackgroundLines: { stroke: colors.border },
    barPercentage: 0.7,
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <LinearGradient
          // Fixed (not theme-driven) decorative banner gradient, matching the auth screens' hero background.
          colors={['#1e3a5f', '#0f172a']}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Sleep Tracker</Text>
            <MaterialCommunityIcons name="moon-waning-crescent" size={24} color="#3b82f6" />
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <WellnessRing score={avgQuality} label="Quality" size={80} />
            </View>
            <View style={styles.statsRight}>
              <View style={styles.statRow}>
                <MaterialCommunityIcons name="clock-outline" size={18} color="#3b82f6" />
                <View>
                  <Text style={styles.statValue}>{avgDuration}h</Text>
                  <Text style={styles.statLabel}>Avg Duration</Text>
                </View>
              </View>
              <View style={styles.statRow}>
                <MaterialCommunityIcons name="calendar-check" size={18} color={colors.success} />
                <View>
                  <Text style={styles.statValue}>{records.length}</Text>
                  <Text style={styles.statLabel}>Days Tracked</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          {isLoading ? (
            <View style={[styles.chartPlaceholder]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.chartCard}>
              <BarChart
                data={chartData}
                width={width - 48}
                height={180}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="h"
                fromZero
                showBarTops={false}
              />
            </View>
          )}
        </View>

        {/* Log Sleep Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Log Tonight's Sleep</Text>
          <View style={styles.formCard}>
            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Bedtime</Text>
                <View style={styles.timeInput}>
                  <MaterialCommunityIcons name="bed-clock" size={20} color={colors.info} />
                  <TextInput
                    style={styles.timeText}
                    value={bedtime}
                    onChangeText={setBedtime}
                    placeholder="23:00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textMuted} style={{ marginTop: 30 }} />
              <View style={styles.timeField}>
                <Text style={styles.fieldLabel}>Wake Time</Text>
                <View style={styles.timeInput}>
                  <MaterialCommunityIcons name="alarm" size={20} color={colors.warning} />
                  <TextInput
                    style={styles.timeText}
                    value={wakeTime}
                    onChangeText={setWakeTime}
                    placeholder="07:00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              </View>
            </View>

            {/* Duration preview */}
            <View style={styles.durationPreview}>
              <MaterialCommunityIcons name="timer-sand" size={16} color={colors.primary} />
              <Text style={styles.durationText}>
                Sleep duration: {calculateDuration()} hours
              </Text>
            </View>

            {/* Quality Slider */}
            <View style={styles.qualitySection}>
              <Text style={styles.fieldLabel}>Sleep Quality: {quality}/10</Text>
              <View style={styles.qualitySlider}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[
                      styles.qualityDot,
                      q <= quality && { backgroundColor: getScoreColor(q * 10, colors) },
                    ]}
                    onPress={() => { setQuality(q); Haptics.selectionAsync(); }}
                    accessibilityLabel={`Rate sleep quality ${q} out of 10`}
                    accessibilityRole="button"
                  />
                ))}
              </View>
              <View style={styles.qualityLabels}>
                <Text style={styles.qualityLabel}>Poor</Text>
                <Text style={styles.qualityLabel}>Excellent</Text>
              </View>
            </View>

            {/* Interruptions */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Wake-ups during the night</Text>
              <View style={styles.inputRow}>
                {['0', '1', '2', '3', '4+'].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.countButton, interruptions === v && styles.countButtonActive]}
                    onPress={() => setInterruptions(v)}
                    accessibilityLabel={`${v} wake-ups during the night`}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.countButtonText, interruptions === v && styles.countButtonTextActive]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How did you feel? Any dreams?"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={styles.submitButtonWrapper}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityLabel="Save Sleep Record"
              accessibilityRole="button"
            >
              <LinearGradient colors={['#3b82f6', '#6366f1']} style={styles.submitButton}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save" size={20} color="#fff" />
                    <Text style={styles.submitText}>Save Sleep Record</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sleep Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Tips</Text>
          {sleepTips.map((tip, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tipCard}
              onPress={() => {
                setExpandedTip(expandedTip === index ? null : index);
                Haptics.selectionAsync();
              }}
              activeOpacity={0.8}
              accessibilityLabel={`${tip.title}, tap to ${expandedTip === index ? 'collapse' : 'expand'}`}
              accessibilityRole="button"
            >
              <View style={styles.tipHeader}>
                <View style={styles.tipIconWrapper}>
                  <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={colors.warning} />
                </View>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <MaterialCommunityIcons
                  name={expandedTip === index ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.textMuted}
                />
              </View>
              {expandedTip === index && (
                <Text style={styles.tipContent}>{tip.content}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20 },
  header: { borderRadius: 24, padding: 20, marginVertical: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  // Pinned (not theme-driven): sits on the fixed-color end of the header gradient, not the themed surface.
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  statItem: {},
  statsRight: { flex: 1, gap: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // Pinned (not theme-driven): sit inside the fixed-color header banner, not the themed surface.
  statValue: { fontSize: 20, fontWeight: '800', color: '#f1f5f9' },
  statLabel: { fontSize: 12, color: '#94a3b8' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  chartCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  chartPlaceholder: { height: 180, backgroundColor: colors.surface, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  chart: { borderRadius: 12, marginLeft: -8 },
  formCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  timeField: { flex: 1 },
  fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
  timeInput: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.border },
  timeText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  durationPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '11', padding: 10, borderRadius: 10, marginBottom: 16 },
  durationText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  qualitySection: { marginBottom: 16 },
  qualitySlider: { flexDirection: 'row', gap: 6, marginVertical: 8 },
  qualityDot: { flex: 1, height: 32, borderRadius: 8, backgroundColor: colors.surfaceLight },
  qualityLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  qualityLabel: { fontSize: 11, color: colors.textMuted },
  fieldContainer: { marginBottom: 16 },
  inputRow: { flexDirection: 'row', gap: 8 },
  countButton: { flex: 1, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  countButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  countButtonText: { color: colors.textMuted, fontWeight: '600' },
  countButtonTextActive: { color: '#fff' },
  notesInput: { backgroundColor: colors.background, borderRadius: 12, padding: 12, color: colors.text, borderWidth: 1, borderColor: colors.border, minHeight: 80 },
  submitButtonWrapper: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  submitButton: { height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tipCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipIconWrapper: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.warning + '22', justifyContent: 'center', alignItems: 'center' },
  tipTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  tipContent: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
});

export default SleepScreen;
