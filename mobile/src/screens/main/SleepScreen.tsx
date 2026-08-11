import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { predictSleepQuality } from '../../services/mlEngine';
import WellnessRing from '../../components/WellnessRing';
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors, getScoreColor } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const contentWidth = Math.min(width, 680);

const SleepScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

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

  const duration = calculateDuration();
  const [bH] = bedtime.split(':').map(Number);
  const [wH] = wakeTime.split(':').map(Number);
  const mlPrediction = useMemo(() => {
    return predictSleepQuality(
      bH || 23,
      wH || 7,
      duration,
      parseInt(interruptions) || 0,
      4.0,
      (bH >= 0 && bH <= 4) || bH >= 23,
      30,
      5
    );
  }, [bH, wH, duration, interruptions]);

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
    color: (opacity = 1) => `rgba(108, 92, 231, ${opacity})`,
    labelColor: () => colors.textMuted,
    propsForBackgroundLines: { stroke: colors.borderLight },
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
          <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>Sleep Analysis</Text>
                <Text style={styles.headerSubtitle}>Quality rest for total recovery</Text>
              </View>
              <MaterialCommunityIcons name="moon-waning-crescent" size={28} color={colors.primary} />
            </View>
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <WellnessRing score={avgQuality} label="Quality" size={84} />
              </View>
              <View style={styles.statsRight}>
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
                  <View>
                    <Text style={styles.statValue}>{avgDuration}h</Text>
                    <Text style={styles.statLabel}>Avg Duration</Text>
                  </View>
                </View>
                <View style={styles.statRow}>
                  <MaterialCommunityIcons name="calendar-check" size={20} color={colors.success} />
                  <View>
                    <Text style={styles.statValue}>{records.length}</Text>
                    <Text style={styles.statLabel}>Days Tracked</Text>
                  </View>
                </View>
              </View>
            </View>
          </NeumorphicView>

          {/* Weekly Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Week's Duration</Text>
            {isLoading ? (
              <View style={styles.chartPlaceholder}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <NeumorphicView variant="raised" borderRadius={24} padding={12} style={styles.chartCard} pointerEvents="none">
                <BarChart
                  data={chartData}
                  width={contentWidth - 64}
                  height={180}
                  chartConfig={chartConfig}
                  style={styles.chart}
                  yAxisLabel=""
                  yAxisSuffix="h"
                  fromZero
                  showBarTops={false}
                />
              </NeumorphicView>
            )}
          </View>

          {/* Log Sleep Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Log Sleep</Text>
            <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.formCard}>
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>Bedtime</Text>
                  <NeumorphicView variant="pressed" borderRadius={14} padding={10} style={styles.timeInput}>
                    <MaterialCommunityIcons name="bed-clock" size={20} color={colors.info} />
                    <TextInput
                      style={styles.timeText}
                      value={bedtime}
                      onChangeText={setBedtime}
                      placeholder="23:00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </NeumorphicView>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={20} color={colors.textMuted} style={{ marginTop: 24 }} />
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>Wake Time</Text>
                  <NeumorphicView variant="pressed" borderRadius={14} padding={10} style={styles.timeInput}>
                    <MaterialCommunityIcons name="alarm" size={20} color={colors.warning} />
                    <TextInput
                      style={styles.timeText}
                      value={wakeTime}
                      onChangeText={setWakeTime}
                      placeholder="07:00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numbers-and-punctuation"
                    />
                  </NeumorphicView>
                </View>
              </View>

              {/* Duration preview */}
              <View style={styles.durationPreview}>
                <MaterialCommunityIcons name="timer-sand" size={16} color={colors.primary} />
                <Text style={styles.durationText}>
                  Total sleep duration: {calculateDuration()} hours
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
                        { backgroundColor: q <= quality ? getScoreColor(q * 10, colors) : colors.surfacePressed },
                      ]}
                      onPress={() => { setQuality(q); Haptics.selectionAsync(); }}
                    />
                  ))}
                </View>
                <View style={styles.qualityLabels}>
                  <Text style={styles.qualityLabel}>Restless</Text>
                  <Text style={styles.qualityLabel}>Deep Sleep</Text>
                </View>
              </View>

              {/* Interruptions */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Night wake-ups</Text>
                <View style={styles.inputRow}>
                  {['0', '1', '2', '3', '4+'].map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={{ flex: 1 }}
                      onPress={() => setInterruptions(v)}
                    >
                      <NeumorphicView
                        variant={interruptions === v ? 'pressed' : 'raised'}
                        active={interruptions === v}
                        borderRadius={12}
                        padding={10}
                        style={styles.countButton}
                      >
                        <Text style={[styles.countButtonText, interruptions === v && { color: colors.primary }]}>
                          {v}
                        </Text>
                      </NeumorphicView>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Notes (optional)</Text>
                <NeumorphicView variant="pressed" borderRadius={14} padding={10} style={styles.notesInputCard}>
                  <TextInput
                    style={styles.notesInput}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="How did you feel? Any dreams or disruptions?"
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </NeumorphicView>
              </View>

              <NeumorphicButton
                title={isSubmitting ? 'Saving...' : 'Save Sleep Record'}
                icon="content-save"
                variant="primary"
                size="large"
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={{ marginTop: 6 }}
              />
            </NeumorphicView>
          </View>

          {/* Sleep Tips */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sleep Optimizations</Text>
            {sleepTips.map((tip, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => {
                  setExpandedTip(expandedTip === index ? null : index);
                  Haptics.selectionAsync();
                }}
                activeOpacity={0.85}
                style={{ marginBottom: 10 }}
              >
                <NeumorphicView variant="raised" borderRadius={18} padding={14} style={styles.tipCard}>
                  <View style={styles.tipHeader}>
                    <View style={[styles.tipIconWrapper, { backgroundColor: colors.warning + '1F' }]}>
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
                </NeumorphicView>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 30 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    header: { marginVertical: 14 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    headerStats: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    statItem: {},
    statsRight: { flex: 1, gap: 12 },
    statRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500' },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
    chartCard: { overflow: 'hidden' },
    chartPlaceholder: { height: 180, justifyContent: 'center', alignItems: 'center' },
    chart: { borderRadius: 12, marginLeft: -8 },
    formCard: {},
    timeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    timeField: { flex: 1 },
    fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
    timeInput: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timeText: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
    durationPreview: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '1A', padding: 10, borderRadius: 12, marginBottom: 16 },
    durationText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
    qualitySection: { marginBottom: 16 },
    qualitySlider: { flexDirection: 'row', gap: 6, marginVertical: 8 },
    qualityDot: { flex: 1, height: 32, borderRadius: 8 },
    qualityLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    qualityLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
    fieldContainer: { marginBottom: 16 },
    inputRow: { flexDirection: 'row', gap: 8 },
    countButton: { alignItems: 'center', justifyContent: 'center' },
    countButtonText: { color: colors.textMuted, fontWeight: '700' },
    notesInputCard: {},
    notesInput: { color: colors.text, minHeight: 70, fontSize: 14 },
    tipCard: {},
    tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    tipIconWrapper: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    tipTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
    tipContent: { fontSize: 13, color: colors.textMuted, lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderLight },
  });

export default SleepScreen;
