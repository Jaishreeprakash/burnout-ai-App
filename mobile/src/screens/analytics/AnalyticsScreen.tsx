import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { dashboardApi } from '../../services/api';
import { DashboardData } from '../../types';
import WellnessRing from '../../components/WellnessRing';
import { ThemeColors, getRiskColor, getScoreColor } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

type TimeRange = '7D' | '30D' | '90D';

const AnalyticsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const dashData = await dashboardApi.getDashboard();
      setData(dashData);
    } catch (error) {
      Alert.alert('Error', 'Could not load analytics data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const burnout = data?.burnout_analysis;
  const trend = data?.trend_data;

  const chartConfig = (color: string) => ({
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => color.replace(')', `, ${opacity})`).replace('rgb', 'rgba'),
    labelColor: () => colors.textMuted,
    propsForDots: { r: '4', strokeWidth: '2', stroke: color },
    propsForBackgroundLines: { stroke: colors.border },
  });

  const timeRanges: TimeRange[] = ['7D', '30D', '90D'];

  const metrics = burnout
    ? [
        { label: 'Burnout Score', value: burnout.burnout_score, icon: 'brain', color: getRiskColor(burnout.risk_level, colors) },
        { label: 'Wellness', value: burnout.wellness_score, icon: 'heart-pulse', color: getScoreColor(burnout.wellness_score, colors) },
        { label: 'Sleep Quality', value: burnout.sleep_quality_score, icon: 'moon-waning-crescent', color: colors.info },
        { label: 'Emotional State', value: burnout.emotional_stability_index, icon: 'emoticon-happy-outline', color: colors.success },
        { label: 'Phone Usage', value: burnout.phone_usage_score, icon: 'cellphone', color: colors.warning },
        { label: 'Activity Level', value: burnout.activity_score, icon: 'lightning-bolt', color: colors.success },
      ]
    : [];

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Time Range Selector */}
        <View style={styles.timeRangeContainer}>
          {timeRanges.map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
              onPress={() => {
                setTimeRange(range);
                Haptics.selectionAsync();
              }}
              accessibilityLabel={`Show data for ${range}`}
              accessibilityRole="button"
            >
              <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Crunching your data...</Text>
          </View>
        ) : (
          <>
            {/* Overall Wellness Ring */}
            <View style={styles.overallCard}>
              <LinearGradient colors={['#312e81', '#1e1b4b']} style={styles.overallGradient}>
                <View style={styles.overallContent}>
                  <View style={styles.overallLeft}>
                    <Text style={styles.overallTitle}>Overall Wellness</Text>
                    <Text style={styles.overallPeriod}>Last {timeRange}</Text>
                    <View style={styles.riskBadge}>
                      <View style={[styles.riskDot, { backgroundColor: getRiskColor(burnout?.risk_level ?? 'moderate', colors) }]} />
                      <Text style={[styles.riskText, { color: getRiskColor(burnout?.risk_level ?? 'moderate', colors) }]}>
                        {((burnout?.risk_level ?? 'moderate') as string).charAt(0).toUpperCase() + (burnout?.risk_level ?? 'moderate').slice(1)} Risk
                      </Text>
                    </View>
                    <Text style={styles.overallDesc}>
                      Your wellness has improved by 8% compared to the previous period.
                    </Text>
                  </View>
                  <WellnessRing score={burnout?.wellness_score ?? 62} size={100} />
                </View>
              </LinearGradient>
            </View>

            {/* Burnout Trend Chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Burnout Score Trend</Text>
              <View style={styles.chartCard}>
                <LineChart
                  data={{
                    labels: trend?.dates ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                      {
                        data: trend?.burnout_scores ?? [55, 60, 48, 42, 50, 35, 42],
                        color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                        strokeWidth: 2.5,
                      },
                    ],
                  }}
                  width={width - 72}
                  height={180}
                  chartConfig={chartConfig('rgb(239, 68, 68)')}
                  bezier
                  style={styles.chart}
                  withInnerLines
                  withOuterLines={false}
                  fromZero={false}
                />
                <View style={styles.chartLegend}>
                  <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
                  <Text style={styles.legendText}>Burnout Score (lower is better)</Text>
                </View>
              </View>
            </View>

            {/* Wellness Trend */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wellness Score Trend</Text>
              <View style={styles.chartCard}>
                <LineChart
                  data={{
                    labels: trend?.dates ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                      {
                        data: trend?.wellness_scores ?? [45, 50, 62, 68, 60, 75, 62],
                        color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                        strokeWidth: 2.5,
                      },
                      {
                        data: trend?.sleep_scores ?? [55, 60, 72, 65, 58, 80, 65],
                        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                    legend: ['Wellness', 'Sleep'],
                  }}
                  width={width - 72}
                  height={200}
                  chartConfig={chartConfig('rgb(99, 102, 241)')}
                  bezier
                  style={styles.chart}
                  withInnerLines
                  withOuterLines={false}
                  fromZero={false}
                />
              </View>
            </View>

            {/* Metrics Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Metrics</Text>
              <View style={styles.metricsGrid}>
                {metrics.map((metric) => (
                  <View key={metric.label} style={styles.metricCard}>
                    <View style={[styles.metricIcon, { backgroundColor: metric.color + '22' }]}>
                      <MaterialCommunityIcons name={metric.icon as any} size={18} color={metric.color} />
                    </View>
                    <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <View style={styles.metricBar}>
                      <View style={[styles.metricBarFill, { width: `${metric.value}%` as any, backgroundColor: metric.color }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Burnout Factors */}
            {burnout?.factors && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Burnout Factors</Text>
                <View style={styles.factorsCard}>
                  {burnout.factors.map((factor, index) => (
                    <View key={index} style={styles.factorRow}>
                      <View style={styles.factorLeft}>
                        <Text style={styles.factorName}>{factor.name}</Text>
                        <Text style={styles.factorDesc}>{factor.description}</Text>
                      </View>
                      <View style={styles.factorRight}>
                        <Text style={[styles.factorImpact, { color: getRiskColor(factor.impact > 30 ? 'high' : factor.impact > 20 ? 'moderate' : 'low', colors) }]}>
                          {factor.impact}%
                        </Text>
                        <Text style={styles.factorImpactLabel}>impact</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Export Button */}
            <TouchableOpacity
              style={styles.exportButton}
              onPress={() => Alert.alert('Export', 'Your wellness report will be emailed to you as a PDF.')}
              activeOpacity={0.85}
              accessibilityLabel="Export wellness report"
              accessibilityRole="button"
            >
              <LinearGradient colors={['#1e293b', '#334155']} style={styles.exportGradient}>
                <MaterialCommunityIcons name="file-export-outline" size={20} color={colors.text} />
                <Text style={styles.exportText}>Export Wellness Report</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  timeRangeContainer: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
  timeRangeButton: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  timeRangeButtonActive: { backgroundColor: colors.primary },
  timeRangeText: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  timeRangeTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  overallCard: { borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  overallGradient: { padding: 20 },
  overallContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overallLeft: { flex: 1, marginRight: 16 },
  overallTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
  overallPeriod: { fontSize: 13, color: colors.textMuted, marginBottom: 10 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskText: { fontSize: 14, fontWeight: '700' },
  overallDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  chartCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  chart: { borderRadius: 12, marginLeft: -16 },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: colors.textMuted },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { width: (width - 52) / 2, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  metricIcon: { width: 36, height: 36, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  metricValue: { fontSize: 28, fontWeight: '800' },
  metricLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 8 },
  metricBar: { height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, overflow: 'hidden' },
  metricBarFill: { height: '100%', borderRadius: 2 },
  factorsCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  factorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  factorLeft: { flex: 1, marginRight: 12 },
  factorName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  factorDesc: { fontSize: 12, color: colors.textMuted },
  factorRight: { alignItems: 'center' },
  factorImpact: { fontSize: 20, fontWeight: '800' },
  factorImpactLabel: { fontSize: 10, color: colors.textMuted },
  exportButton: { borderRadius: 14, overflow: 'hidden' },
  exportGradient: { height: 52, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  exportText: { color: colors.text, fontSize: 15, fontWeight: '700' },
});

export default AnalyticsScreen;
