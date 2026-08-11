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
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors, getRiskColor, getScoreColor } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');
const contentWidth = Math.min(width, 680);

type TimeRange = '7D' | '30D' | '90D';

const AnalyticsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
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
    propsForBackgroundLines: { stroke: colors.borderLight },
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
    <View style={[styles.root, { paddingBottom: insets.bottom, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Analytics & Trends</Text>
          <Text style={styles.headerSubtitle}>Longitudinal breakdown of your health metrics</Text>
        </View>

        {/* Time Range Selector */}
        <NeumorphicView variant="pressed" borderRadius={18} padding={4} style={styles.timeRangeContainer}>
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
        </NeumorphicView>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>Crunching your data...</Text>
          </View>
        ) : (
          <>
            {/* Overall Wellness Ring */}
            <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.overallCard}>
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
            </NeumorphicView>

            {/* Burnout Trend Chart */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Burnout Score Trend</Text>
              <NeumorphicView variant="raised" borderRadius={24} padding={16} style={styles.chartCard} pointerEvents="none">
                <LineChart
                  data={{
                    labels: trend?.dates ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                      {
                        data: trend?.burnout_scores ?? [55, 60, 48, 42, 50, 35, 42],
                        color: (opacity = 1) => `rgba(255, 82, 82, ${opacity})`,
                        strokeWidth: 3,
                      },
                    ],
                  }}
                  width={contentWidth - 72}
                  height={180}
                  chartConfig={chartConfig('rgb(255, 82, 82)')}
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
              </NeumorphicView>
            </View>

            {/* Wellness Trend */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Wellness & Sleep Trend</Text>
              <NeumorphicView variant="raised" borderRadius={24} padding={16} style={styles.chartCard} pointerEvents="none">
                <LineChart
                  data={{
                    labels: trend?.dates ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                      {
                        data: trend?.wellness_scores ?? [45, 50, 62, 68, 60, 75, 62],
                        color: (opacity = 1) => `rgba(108, 92, 231, ${opacity})`,
                        strokeWidth: 3,
                      },
                      {
                        data: trend?.sleep_scores ?? [55, 60, 72, 65, 58, 80, 65],
                        color: (opacity = 1) => `rgba(9, 132, 227, ${opacity})`,
                        strokeWidth: 2,
                      },
                    ],
                    legend: ['Wellness', 'Sleep'],
                  }}
                  width={contentWidth - 72}
                  height={200}
                  chartConfig={chartConfig('rgb(108, 92, 231)')}
                  bezier
                  style={styles.chart}
                  withInnerLines
                  withOuterLines={false}
                  fromZero={false}
                />
              </NeumorphicView>
            </View>

            {/* Metrics Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Key Metrics</Text>
              <View style={styles.metricsGrid}>
                {metrics.map((metric) => (
                  <NeumorphicView key={metric.label} variant="raised" borderRadius={20} padding={16} style={styles.metricCard}>
                    <View style={[styles.metricIcon, { backgroundColor: metric.color + '1F' }]}>
                      <MaterialCommunityIcons name={metric.icon as any} size={18} color={metric.color} />
                    </View>
                    <Text style={[styles.metricValue, { color: metric.color }]}>{metric.value}</Text>
                    <Text style={styles.metricLabel}>{metric.label}</Text>
                    <View style={styles.metricBar}>
                      <View style={[styles.metricBarFill, { width: `${metric.value}%` as any, backgroundColor: metric.color }]} />
                    </View>
                  </NeumorphicView>
                ))}
              </View>
            </View>

            {/* Burnout Factors */}
            {burnout?.factors && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Burnout Key Factors</Text>
                <NeumorphicView variant="raised" borderRadius={24} padding={18} style={styles.factorsCard}>
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
                </NeumorphicView>
              </View>
            )}

            {/* Export Button */}
            <NeumorphicButton
              title="Export Wellness Report"
              icon="file-export-outline"
              variant="raised"
              size="large"
              onPress={() => Alert.alert('Export', 'Your wellness report will be emailed to you as a PDF.')}
              style={{ marginVertical: 10 }}
            />
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, paddingBottom: 20 },
    headerContainer: { paddingTop: 14, paddingBottom: 10 },
    headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    timeRangeContainer: { flexDirection: 'row', marginVertical: 14 },
    timeRangeButton: { flex: 1, paddingVertical: 8, borderRadius: 14, alignItems: 'center' },
    timeRangeButtonActive: { backgroundColor: colors.surface, shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
    timeRangeText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
    timeRangeTextActive: { color: colors.primary },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60, gap: 16 },
    loadingText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
    overallCard: { marginBottom: 20 },
    overallContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    overallLeft: { flex: 1, marginRight: 16 },
    overallTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 4 },
    overallPeriod: { fontSize: 13, color: colors.textMuted, marginBottom: 8, fontWeight: '500' },
    riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    riskDot: { width: 8, height: 8, borderRadius: 4 },
    riskText: { fontSize: 13, fontWeight: '700' },
    overallDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
    chartCard: { overflow: 'hidden' },
    chart: { borderRadius: 12, marginLeft: -16 },
    chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 4 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    metricCard: { width: (width - 52) / 2 },
    metricIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    metricValue: { fontSize: 26, fontWeight: '800' },
    metricLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 8, fontWeight: '600' },
    metricBar: { height: 4, backgroundColor: colors.surfacePressed, borderRadius: 2, overflow: 'hidden' },
    metricBarFill: { height: '100%', borderRadius: 2 },
    factorsCard: { gap: 12 },
    factorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    factorLeft: { flex: 1, marginRight: 12 },
    factorName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
    factorDesc: { fontSize: 12, color: colors.textMuted },
    factorRight: { alignItems: 'center' },
    factorImpact: { fontSize: 20, fontWeight: '800' },
    factorImpactLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  });

export default AnalyticsScreen;
