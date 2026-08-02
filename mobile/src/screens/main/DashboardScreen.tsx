import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LineChart } from 'react-native-chart-kit';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../hooks/useDashboard';
import BurnoutGauge from '../../components/BurnoutGauge';
import WellnessRing from '../../components/WellnessRing';
import MetricCard from '../../components/MetricCard';
import RecommendationCard from '../../components/RecommendationCard';
import { ThemeColors, getRiskColor, getScoreColor } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');

type DashboardNav = StackNavigationProp<AppStackParamList>;

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isRefreshing, refresh } = useDashboard();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<DashboardNav>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]).start();
    }
  }, [isLoading]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || user?.username || 'there';
  const today = format(new Date(), 'EEEE, MMMM d');
  const burnout = data?.burnout_analysis;
  const riskColor = burnout ? getRiskColor(burnout.risk_level, colors) : colors.primary;

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: () => colors.textMuted,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
    propsForBackgroundLines: { stroke: colors.border, strokeDasharray: '' },
  };

  const quickActions = [
    { icon: 'moon-waning-crescent', label: 'Log Sleep', color: colors.info, screen: 'Sleep' },
    { icon: 'emoticon-happy-outline', label: 'Log Mood', color: colors.success, screen: 'Emotion' },
    { icon: 'lightning-bolt', label: 'Activity', color: colors.warning, screen: 'Activity' },
    { icon: 'camera-outline', label: 'Face Scan', color: colors.primary, screen: 'Emotion' },
  ];

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <SkeletonLoader colors={colors} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refresh(); }}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
              <Text style={styles.date}>{today}</Text>
            </View>
            <TouchableOpacity style={styles.notifButton} accessibilityLabel="Notifications" accessibilityRole="button">
              <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text} />
              <View style={styles.notifDot} />
            </TouchableOpacity>
          </View>

          {/* Burnout Risk Section */}
          <View style={styles.burnoutSection}>
            <Text style={styles.sectionTitle}>Burnout Risk Score</Text>
            <View style={styles.gaugeContainer}>
              <BurnoutGauge
                score={burnout?.burnout_score ?? 0}
                riskLevel={burnout?.risk_level ?? 'low'}
                size={220}
              />
            </View>
            <LinearGradient
              colors={[riskColor + '22', riskColor + '11']}
              style={styles.riskBanner}
            >
              <MaterialCommunityIcons
                name={burnout?.risk_level === 'low' ? 'shield-check' : 'alert-circle-outline'}
                size={18}
                color={riskColor}
              />
              <Text style={[styles.riskBannerText, { color: riskColor }]}>
                {burnout?.risk_level === 'low'
                  ? 'Great job! Keep up your healthy habits.'
                  : burnout?.risk_level === 'moderate'
                  ? 'You\'re doing okay. Small improvements will help.'
                  : 'High stress detected. Take breaks and rest.'}
              </Text>
            </LinearGradient>
          </View>

          {/* Metrics Row */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Today's Metrics</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <MetricCard
                title="Sleep Score"
                value={burnout?.sleep_quality_score ?? 0}
                icon="moon-waning-crescent"
                unit="%"
                score={burnout?.sleep_quality_score ?? 0}
                change={data?.recent_sleep ? -5 : undefined}
                onPress={() => navigation.navigate('Sleep' as any)}
              />
              <MetricCard
                title="Phone Usage"
                value={data?.recent_phone_usage ? `${data.recent_phone_usage.total_hours.toFixed(1)}` : '0.0'}
                icon="cellphone"
                unit="h"
                score={burnout?.phone_usage_score ?? 0}
                change={data?.recent_phone_usage ? 12 : undefined}
                onPress={() => navigation.navigate('PhoneUsage' as any)}
              />
              <MetricCard
                title="Activity"
                value={burnout?.activity_score ?? 0}
                icon="lightning-bolt"
                unit="%"
                score={burnout?.activity_score ?? 0}
                change={data?.recent_activity ? 8 : undefined}
                onPress={() => navigation.navigate('Activity' as any)}
              />
              <MetricCard
                title="Mood Stability"
                value={burnout?.emotional_stability_index ?? 0}
                icon="heart-pulse"
                unit="%"
                score={burnout?.emotional_stability_index ?? 0}
                change={data?.recent_emotion ? 3 : undefined}
                onPress={() => navigation.navigate('Emotion' as any)}
              />
            </ScrollView>
          </View>

          {/* Wellness Score */}
          <View style={styles.wellnessSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overall Wellness</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
                <Text style={styles.seeAll}>View Analytics →</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.wellnessCard}>
              <View style={styles.wellnessLeft}>
                <WellnessRing score={burnout?.wellness_score ?? 0} label="Wellness" size={110} />
              </View>
              <View style={styles.wellnessRight}>
                <WellnessRingLegend score={burnout?.sleep_quality_score ?? 0} label="Sleep" colors={colors} styles={styles} />
                <WellnessRingLegend score={burnout?.emotional_stability_index ?? 0} label="Mood" colors={colors} styles={styles} />
                <WellnessRingLegend score={burnout?.activity_score ?? 0} label="Activity" colors={colors} styles={styles} />
                <WellnessRingLegend score={burnout?.phone_usage_score ?? 0} label="Screen" colors={colors} styles={styles} />
              </View>
            </View>
          </View>

          {/* Emotional Stability Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Emotional Stability (7 Days)</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={{
                  labels: data?.trend_data.dates ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  datasets: [
                    {
                      data: data?.trend_data.emotion_scores ?? [50, 55, 68, 72, 60, 75, 68],
                      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                      strokeWidth: 2.5,
                    },
                  ],
                }}
                width={width - 48}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines
                withOuterLines={false}
                fromZero={false}
              />
            </View>
          </View>

          {/* AI Recommendation */}
          {burnout?.recommendations?.[0] && (
            <View style={styles.recSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top AI Recommendation</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Recommendations')}>
                  <Text style={styles.seeAll}>See all →</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recWrapper}>
                <View style={styles.aiTag}>
                  <MaterialCommunityIcons name="brain" size={14} color={colors.primary} />
                  <Text style={styles.aiTagText}>AI Powered</Text>
                </View>
                <RecommendationCard recommendation={burnout.recommendations[0]} compact={false} />
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsSection}>
            <Text style={styles.sectionTitle}>Quick Log</Text>
            <View style={styles.quickActionsRow}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickAction}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    (navigation as any).navigate('MainTabs', { screen: action.screen });
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '22' }]}>
                    <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 30 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const WellnessRingLegend: React.FC<{ score: number; label: string; colors: ThemeColors; styles: ReturnType<typeof createStyles> }> = ({ score, label, colors, styles }) => {
  const color = getScoreColor(score, colors);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={[styles.legendScore, { color }]}>{score}%</Text>
    </View>
  );
};

const SkeletonLoader: React.FC<{ colors: ThemeColors }> = ({ colors }) => {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <View style={{ padding: 24, gap: 16 }}>
      {[200, 120, 80, 160, 100].map((h, i) => (
        <Animated.View
          key={i}
          style={{ height: h, backgroundColor: colors.surface, borderRadius: 16, opacity }}
        />
      ))}
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  date: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  notifButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, borderWidth: 1.5, borderColor: colors.background },
  burnoutSection: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  gaugeContainer: { alignItems: 'center', marginVertical: 8 },
  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, marginTop: 12 },
  riskBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  metricsSection: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  wellnessSection: { marginBottom: 16 },
  wellnessCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  wellnessLeft: { marginRight: 24 },
  wellnessRight: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 13, color: colors.textMuted, flex: 1 },
  legendScore: { fontSize: 13, fontWeight: '700' },
  chartSection: { marginBottom: 16 },
  chartCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  chart: { borderRadius: 12, marginLeft: -10 },
  recSection: { marginBottom: 16 },
  recWrapper: { position: 'relative' },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  aiTagText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  quickActionsSection: { marginBottom: 16 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickAction: { alignItems: 'center', gap: 8 },
  quickActionIcon: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
});

export default DashboardScreen;
