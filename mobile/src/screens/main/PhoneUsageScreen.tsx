import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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
import { predictDigitalAddiction } from '../../services/mlEngine';
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const contentWidth = Math.min(width, 680);

const PhoneUsageScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
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

  const mlPrediction = useMemo(() => {
    return predictDigitalAddiction(
      parseFloat(totalHours) || today?.total_hours || 4.5,
      parseFloat(socialMedia) || today?.social_media_hours || 2.0,
      parseFloat(entertainment) || today?.entertainment_hours || 1.5,
      parseFloat(productive) || today?.productive_hours || 1.0,
      parseInt(pickups) || today?.pickups_count || 60,
      lateNight,
      25.0
    );
  }, [totalHours, socialMedia, entertainment, productive, pickups, lateNight, today]);

  let streak = 0;
  if (records.length) {
    for (let i = records.length - 1; i >= 0; i--) {
      if ((records[i]?.total_hours ?? 0) < 4.0) {
        streak++;
      } else {
        break;
      }
    }
  }

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
    datasets: [{ data: records.length ? records.slice(-7).map((r) => r?.total_hours ?? 0) : [0, 0, 0, 0, 0, 0, 0] }],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(255, 82, 82, ${opacity})`,
    labelColor: () => colors.textMuted,
    propsForBackgroundLines: { stroke: colors.borderLight },
    barPercentage: 0.7,
  };

  const categories = today
    ? [
        { label: 'Social Media', hours: today.social_media_hours, color: '#FF7675', icon: 'instagram' },
        { label: 'Productive', hours: today.productive_hours, color: colors.success, icon: 'briefcase-outline' },
        { label: 'Entertainment', hours: today.entertainment_hours, color: colors.warning, icon: 'youtube' },
      ]
    : [
        { label: 'Social Media', hours: 0, color: '#FF7675', icon: 'instagram' },
        { label: 'Productive', hours: 0, color: colors.success, icon: 'briefcase-outline' },
        { label: 'Entertainment', hours: 0, color: colors.warning, icon: 'youtube' },
      ];

  const totalCategoryHours = categories.reduce((s, c) => s + c.hours, 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header Card */}
          <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.headerTitle}>Digital Wellbeing</Text>
                <Text style={styles.headerSubtitle}>Monitor screen time & pickups</Text>
              </View>
              <MaterialCommunityIcons name="cellphone" size={28} color={colors.danger} />
            </View>

            <View style={styles.todayCard}>
              <View style={styles.todayLeft}>
                <Text style={styles.todayHours}>{today?.total_hours ?? 0}</Text>
                <Text style={styles.todayUnit}>hours today</Text>
                <View style={[
                  styles.usageBadge,
                  { backgroundColor: (today?.total_hours ?? 0) > 6 ? colors.danger + '1A' : colors.success + '1A' },
                ]}>
                  <MaterialCommunityIcons
                    name={(today?.total_hours ?? 0) > 6 ? 'alert' : 'check-circle'}
                    size={12}
                    color={(today?.total_hours ?? 0) > 6 ? colors.danger : colors.success}
                  />
                  <Text style={[
                    styles.usageBadgeText,
                    { color: (today?.total_hours ?? 0) > 6 ? colors.danger : colors.success },
                  ]}>
                    {(today?.total_hours ?? 0) > 6 ? 'High Usage' : 'Balanced'}
                  </Text>
                </View>
              </View>
              <View style={styles.todayRight}>
                <View style={styles.statBox}>
                  <MaterialCommunityIcons name="hand-back-right-outline" size={20} color={colors.warning} />
                  <Text style={styles.statValue}>{today?.pickups_count ?? 0}</Text>
                  <Text style={styles.statLabel}>Pickups</Text>
                </View>
                <View style={styles.statBox}>
                  <MaterialCommunityIcons name="weather-night" size={20} color={colors.info} />
                  <Text style={styles.statValue}>{today?.late_night_usage ? 'Yes' : 'No'}</Text>
                  <Text style={styles.statLabel}>Late Night</Text>
                </View>
              </View>
            </View>
          </NeumorphicView>

          {/* Streak Banner */}
          <LinearGradient
            colors={[colors.success + '20', colors.success + '0D']}
            style={styles.streakBanner}
          >
            <MaterialCommunityIcons name="fire" size={22} color={colors.success} />
            <Text style={styles.streakText}>
              {streak} day streak under 4 hours! Excellent focus.
            </Text>
            <Text style={styles.streakEmoji}>🎯</Text>
          </LinearGradient>

          {/* App Category Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.breakdownCard}>
              {categories.map((cat) => (
                <View key={cat.label} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: cat.color + '1F' }]}>
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
            </NeumorphicView>
          </View>

          {/* Weekly Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Weekly Screen Time</Text>
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
                />
                <View style={styles.recommendedLine}>
                  <View style={styles.dashedLine} />
                  <Text style={styles.recommendedLabel}>4h recommended</Text>
                </View>
              </NeumorphicView>
            )}
          </View>

          {/* Log Button */}
          <NeumorphicButton
            title={showForm ? 'Close Form' : 'Log Screen Time'}
            icon={showForm ? 'close' : 'plus-circle-outline'}
            variant="primary"
            size="large"
            onPress={() => setShowForm(!showForm)}
            style={{ marginBottom: 16 }}
          />

          {/* Form */}
          {showForm && (
            <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.formCard}>
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
                  trackColor={{ false: colors.surfacePressed, true: colors.primary + '66' }}
                  thumbColor={lateNight ? colors.primary : colors.textMuted}
                />
              </View>

              <NeumorphicButton
                title={isSubmitting ? 'Saving...' : 'Save Usage Record'}
                variant="danger"
                size="large"
                disabled={isSubmitting}
                onPress={handleSubmit}
                style={{ marginTop: 6 }}
              />
            </NeumorphicView>
          )}

          <View style={{ height: 180 }} />
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
    <NeumorphicView variant="pressed" borderRadius={12} padding={8} style={styles.formInputCard}>
      {children}
    </NeumorphicView>
  </View>
);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20 },
    header: { marginVertical: 14 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    todayCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    todayLeft: {},
    todayHours: { fontSize: 48, fontWeight: '900', color: colors.text, lineHeight: 52 },
    todayUnit: { fontSize: 13, color: colors.textMuted, marginBottom: 8, fontWeight: '500' },
    usageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    usageBadgeText: { fontSize: 12, fontWeight: '700' },
    todayRight: { gap: 12 },
    statBox: { alignItems: 'center', gap: 2 },
    statValue: { fontSize: 18, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '500' },
    streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16, marginBottom: 20 },
    streakText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.success },
    streakEmoji: { fontSize: 20 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
    breakdownCard: { gap: 14 },
    categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    categoryLeft: { flexDirection: 'row', alignItems: 'center', width: 120, gap: 8 },
    categoryIcon: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    categoryLabel: { fontSize: 13, color: colors.text, fontWeight: '600', flex: 1 },
    categoryBarContainer: { flex: 1 },
    categoryBarTrack: { height: 8, backgroundColor: colors.surfacePressed, borderRadius: 4, overflow: 'hidden' },
    categoryBarFill: { height: '100%', borderRadius: 4 },
    categoryHours: { width: 38, fontSize: 13, fontWeight: '800', textAlign: 'right' },
    chartCard: { overflow: 'hidden' },
    chartPlaceholder: { height: 180, justifyContent: 'center', alignItems: 'center' },
    chart: { borderRadius: 12, marginLeft: -8 },
    recommendedLine: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, paddingHorizontal: 8 },
    dashedLine: { flex: 1, height: 1, borderWidth: 1, borderColor: colors.success, borderStyle: 'dashed' },
    recommendedLabel: { fontSize: 11, color: colors.success, fontWeight: '600' },
    formCard: { marginBottom: 16 },
    formTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 16 },
    formRow: { marginBottom: 14 },
    formRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    formLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    formInputCard: {},
    input: { color: colors.text, fontSize: 15, paddingHorizontal: 4 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, marginBottom: 14 },
    switchLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    switchLabel: { fontSize: 13, color: colors.text, fontWeight: '600' },
  });

export default PhoneUsageScreen;
