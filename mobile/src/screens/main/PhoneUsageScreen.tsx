import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BarChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { phoneApi } from '../../services/api';
import { PhoneUsageRecord } from '../../types';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const PhoneUsageScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [records, setRecords] = useState<PhoneUsageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form
  const [totalHours, setTotalHours] = useState('');
  const [socialMedia, setSocialMedia] = useState('');
  const [productive, setProductive] = useState('');
  const [entertainment, setEntertainment] = useState('');
  const [pickups, setPickups] = useState('');
  const [lateNight, setLateNight] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await phoneApi.getPhoneUsageRecords(7);
      setRecords(data);
    } finally {
      setIsLoading(false);
    }
  };

  const today = records[records.length - 1];
  const avgHours = records.length
    ? Math.round((records.reduce((s, r) => s + r.total_hours, 0) / records.length) * 10) / 10
    : 0.0;

  // Streak: consecutive days under 4 hours
  let streak = 0;
  if (records.length) {
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].total_hours < 4.0) {
        streak++;
      } else {
        break;
      }
    }
  }

  const usageScore = today ? Math.max(0, 100 - (today.total_hours - 2) * 15) : 0;

  const handleSubmit = async () => {
    if (!totalHours) {
      Alert.alert('Required', 'Please enter total screen time.');
      return;
    }
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await phoneApi.logPhoneUsage({
        total_hours: parseFloat(totalHours) || 0,
        social_media_hours: parseFloat(socialMedia) || 0,
        productive_hours: parseFloat(productive) || 0,
        entertainment_hours: parseFloat(entertainment) || 0,
        pickups_count: parseInt(pickups) || 0,
        late_night_usage: lateNight,
        date: new Date().toISOString(),
      });
      Alert.alert('Saved!', 'Phone usage logged successfully.', [
        { text: 'OK', onPress: () => { loadData(); setShowForm(false); } },
      ]);
      setTotalHours('');
      setSocialMedia('');
      setProductive('');
      setEntertainment('');
      setPickups('');
      setLateNight(false);
    } catch {
      Alert.alert('Error', 'Failed to save. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    datasets: [{ data: records.length ? records.slice(-7).map((r) => r.total_hours) : [0, 0, 0, 0, 0, 0, 0] }],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
    labelColor: () => colors.textMuted,
    propsForBackgroundLines: { stroke: colors.border },
    barPercentage: 0.7,
  };

  const categories = today
    ? [
        { label: 'Social Media', hours: today.social_media_hours, color: '#ec4899', icon: 'instagram' },
        { label: 'Productive', hours: today.productive_hours, color: colors.success, icon: 'briefcase-outline' },
        { label: 'Entertainment', hours: today.entertainment_hours, color: colors.warning, icon: 'youtube' },
      ]
    : [
        { label: 'Social Media', hours: 2.1, color: '#ec4899', icon: 'instagram' },
        { label: 'Productive', hours: 1.8, color: colors.success, icon: 'briefcase-outline' },
        { label: 'Entertainment', hours: 1.3, color: colors.warning, icon: 'youtube' },
      ];

  const totalCategoryHours = categories.reduce((s, c) => s + c.hours, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Header */}
        {/* Fixed (not theme-driven) decorative banner gradient, matching the auth screens' hero background. */}
        <LinearGradient colors={['#7f1d1d', '#0f172a']} style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Phone Usage</Text>
            <MaterialCommunityIcons name="cellphone" size={24} color={colors.danger} />
          </View>

          {/* Today's usage big display */}
          <View style={styles.todayCard}>
            <View style={styles.todayLeft}>
              <Text style={styles.todayHours}>{today?.total_hours ?? 5.2}</Text>
              <Text style={styles.todayUnit}>hours today</Text>
              <View style={[
                styles.usageBadge,
                { backgroundColor: (today?.total_hours ?? 5.2) > 6 ? colors.danger + '22' : colors.success + '22' }
              ]}>
                <MaterialCommunityIcons
                  name={(today?.total_hours ?? 5.2) > 6 ? 'alert' : 'check-circle'}
                  size={12}
                  color={(today?.total_hours ?? 5.2) > 6 ? colors.danger : colors.success}
                />
                <Text style={[
                  styles.usageBadgeText,
                  { color: (today?.total_hours ?? 5.2) > 6 ? colors.danger : colors.success }
                ]}>
                  {(today?.total_hours ?? 5.2) > 6 ? 'Above limit' : 'Under control'}
                </Text>
              </View>
            </View>
            <View style={styles.todayRight}>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="hand-back-right-outline" size={18} color={colors.warning} />
                <Text style={styles.statValue}>{today?.pickups_count ?? 87}</Text>
                <Text style={styles.statLabel}>Pickups</Text>
              </View>
              <View style={styles.statBox}>
                <MaterialCommunityIcons name="weather-night" size={18} color={colors.info} />
                <Text style={styles.statValue}>{today?.late_night_usage ? 'Yes' : 'No'}</Text>
                <Text style={styles.statLabel}>Late Night</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Streak Banner */}
        <LinearGradient
          colors={[colors.success + '22', colors.success + '11']}
          style={styles.streakBanner}
        >
          <MaterialCommunityIcons name="fire" size={22} color={colors.success} />
          <Text style={styles.streakText}>
            {streak} day streak under 4 hours! Keep it up!
          </Text>
          <Text style={styles.streakEmoji}>🎯</Text>
        </LinearGradient>

        {/* App Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Breakdown</Text>
          <View style={styles.breakdownCard}>
            {categories.map((cat) => (
              <View key={cat.label} style={styles.categoryRow}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '22' }]}>
                    <MaterialCommunityIcons name={cat.icon as any} size={16} color={cat.color} />
                  </View>
                  <Text style={styles.categoryLabel}>{cat.label}</Text>
                </View>
                <View style={styles.categoryBarContainer}>
                  <View style={styles.categoryBarTrack}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${totalCategoryHours > 0 ? (cat.hours / totalCategoryHours) * 100 : 0}%` as any,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[styles.categoryHours, { color: cat.color }]}>
                  {cat.hours.toFixed(1)}h
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Overview</Text>
          {isLoading ? (
            <View style={styles.chartPlaceholder}>
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
              />
              {/* Recommended line label */}
              <View style={styles.recommendedLine}>
                <View style={styles.dashedLine} />
                <Text style={styles.recommendedLabel}>4h recommended</Text>
              </View>
            </View>
          )}
        </View>

        {/* Log Button */}
        <TouchableOpacity
          style={styles.logButtonWrapper}
          onPress={() => {
            setShowForm(!showForm);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          activeOpacity={0.85}
          accessibilityLabel={showForm ? "Close form" : "Log screen time"}
          accessibilityRole="button"
        >
          <LinearGradient colors={['#ef4444', '#f97316']} style={styles.logButton}>
            <MaterialCommunityIcons name={showForm ? 'close' : 'plus-circle-outline'} size={20} color="#fff" />
            <Text style={styles.logButtonText}>{showForm ? 'Close Form' : 'Log Screen Time'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log Phone Usage</Text>

            <FormRow label="Total Screen Time (hours)" icon="timer-outline" colors={colors} styles={styles}>
              <TextInput
                style={styles.input}
                value={totalHours}
                onChangeText={setTotalHours}
                placeholder="5.2"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
              />
            </FormRow>

            <FormRow label="Social Media (hours)" icon="instagram" colors={colors} styles={styles}>
              <TextInput style={styles.input} value={socialMedia} onChangeText={setSocialMedia} placeholder="2.1" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
            </FormRow>

            <FormRow label="Productive Use (hours)" icon="briefcase-outline" colors={colors} styles={styles}>
              <TextInput style={styles.input} value={productive} onChangeText={setProductive} placeholder="1.8" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
            </FormRow>

            <FormRow label="Entertainment (hours)" icon="youtube" colors={colors} styles={styles}>
              <TextInput style={styles.input} value={entertainment} onChangeText={setEntertainment} placeholder="1.3" placeholderTextColor={colors.textMuted} keyboardType="decimal-pad" />
            </FormRow>

            <FormRow label="Number of Phone Pickups" icon="hand-back-right-outline" colors={colors} styles={styles}>
              <TextInput style={styles.input} value={pickups} onChangeText={setPickups} placeholder="87" placeholderTextColor={colors.textMuted} keyboardType="number-pad" />
            </FormRow>

            <View style={styles.switchRow}>
              <View style={styles.switchLeft}>
                <MaterialCommunityIcons name="weather-night" size={20} color={colors.info} />
                <Text style={styles.switchLabel}>Late Night Usage (after 11 PM)</Text>
              </View>
              <Switch
                value={lateNight}
                onValueChange={setLateNight}
                trackColor={{ false: colors.surfaceLight, true: colors.primary + '66' }}
                thumbColor={lateNight ? colors.primary : colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={styles.submitWrapper}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityLabel="Save phone usage log"
              accessibilityRole="button"
            >
              <LinearGradient colors={['#ef4444', '#f97316']} style={styles.submitButton}>
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>Save Usage Record</Text>
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

const FormRow: React.FC<{
  label: string;
  icon: string;
  children: React.ReactNode;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
}> = ({ label, icon, children, colors, styles }) => (
  <View style={styles.formRow}>
    <View style={styles.formRowHeader}>
      <MaterialCommunityIcons name={icon as any} size={16} color={colors.textMuted} />
      <Text style={styles.formLabel}>{label}</Text>
    </View>
    {children}
  </View>
);

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20 },
  header: { borderRadius: 24, padding: 20, marginVertical: 16 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  // Pinned (not theme-driven): sits on the fixed-color end of the header gradient, not the themed surface.
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  todayCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  todayLeft: {},
  // Pinned (not theme-driven): sit inside the fixed-color header banner, not the themed surface.
  todayHours: { fontSize: 52, fontWeight: '900', color: '#f1f5f9', lineHeight: 58 },
  todayUnit: { fontSize: 14, color: '#94a3b8', marginBottom: 10 },
  usageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, alignSelf: 'flex-start' },
  usageBadgeText: { fontSize: 12, fontWeight: '700' },
  todayRight: { gap: 12 },
  statBox: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#f1f5f9' },
  statLabel: { fontSize: 10, color: '#94a3b8' },
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16, marginBottom: 20 },
  streakText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.success },
  streakEmoji: { fontSize: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  breakdownCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 14 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', width: 120, gap: 8 },
  categoryIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { fontSize: 13, color: colors.text, fontWeight: '500', flex: 1 },
  categoryBarContainer: { flex: 1 },
  categoryBarTrack: { height: 8, backgroundColor: colors.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  categoryBarFill: { height: '100%', borderRadius: 4 },
  categoryHours: { width: 36, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  chartCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  chartPlaceholder: { height: 180, backgroundColor: colors.surface, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  chart: { borderRadius: 12, marginLeft: -8 },
  recommendedLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 8 },
  dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: colors.success, borderStyle: 'dashed' },
  recommendedLabel: { fontSize: 11, color: colors.success },
  logButtonWrapper: { borderRadius: 14, overflow: 'hidden', marginBottom: 16 },
  logButton: { height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  logButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  formCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
  formRow: { marginBottom: 14 },
  formRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  formLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  input: { backgroundColor: colors.background, borderRadius: 12, padding: 12, color: colors.text, borderWidth: 1, borderColor: colors.border, fontSize: 15 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, marginBottom: 14 },
  switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  switchLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  submitWrapper: { borderRadius: 14, overflow: 'hidden' },
  submitButton: { height: 52, justifyContent: 'center', alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default PhoneUsageScreen;
