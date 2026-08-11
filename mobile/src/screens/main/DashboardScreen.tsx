import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Animated,
  useWindowDimensions,
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
import { predictMasterBurnout } from '../../services/mlEngine';
import BurnoutGauge from '../../components/BurnoutGauge';
import WellnessRing from '../../components/WellnessRing';
import MetricCard from '../../components/MetricCard';
import RecommendationCard from '../../components/RecommendationCard';
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import ParallaxScrollView from '../../components/ParallaxScrollView';
import { ThemeColors, getRiskColor } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { format } from 'date-fns';

import NotificationModal from '../../components/NotificationModal';
import { NotificationService } from '../../services/notificationService';



type DashboardNav = StackNavigationProp<AppStackParamList>;

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const { data, isLoading, isRefreshing, refresh } = useDashboard();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<DashboardNav>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, 680);

  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(NotificationService.getUnreadCount());

  useEffect(() => {
    setUnreadCount(NotificationService.getUnreadCount());
    const unsubscribe = NotificationService.subscribe(() => {
      setUnreadCount(NotificationService.getUnreadCount());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
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

  const mlPrediction = useMemo(() => {
    const sleepQual = data?.recent_sleep?.quality_score ?? 75;
    const sleepDur = data?.recent_sleep?.duration_hours ?? 7.5;
    const screenTime = data?.recent_phone_usage?.total_hours ?? 4.0;
    const pickups = data?.recent_phone_usage?.pickups_count ?? 50;
    const workHours = data?.recent_activity?.work_hours ?? 6.0;
    const exercise = data?.recent_activity?.exercise_minutes ?? 30;

    return predictMasterBurnout(
      sleepQual,
      sleepDur,
      screenTime,
      pickups,
      workHours,
      exercise,
      0.2,
      75.0
    );
  }, [data]);

  const riskColor = burnout ? getRiskColor(burnout.risk_level, colors) : colors.primary;

  const chartConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(108, 92, 231, ${opacity})`,
    labelColor: () => colors.textMuted,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary },
    propsForBackgroundLines: { stroke: colors.borderLight, strokeDasharray: '' },
  };

  const quickActions = [
    { icon: 'moon-waning-crescent', label: 'Log Sleep', color: colors.info, screen: 'Sleep' },
    { icon: 'emoticon-happy-outline', label: 'Log Mood', color: colors.success, screen: 'Emotion' },
    { icon: 'lightning-bolt', label: 'Activity', color: colors.warning, screen: 'Activity' },
    { icon: 'camera-outline', label: 'Face Scan', color: colors.primary, screen: 'Emotion' },
  ];

  const headerComponent = (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>{getGreeting()}, {firstName} 👋</Text>
        <Text style={styles.date}>{today}</Text>
      </View>
      <TouchableOpacity
        style={styles.notifButtonWrapper}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setShowNotifModal(true);
        }}
        accessibilityLabel="Notifications"
        accessibilityRole="button"
      >
        <NeumorphicView variant="raised" borderRadius={16} padding={10} style={styles.notifButton}>
          <MaterialCommunityIcons name="bell-ring-outline" size={22} color={colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.notifDot, { backgroundColor: colors.danger }]}>
              {unreadCount > 1 && <Text style={styles.notifDotText}>{unreadCount}</Text>}
            </View>
          )}
        </NeumorphicView>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <SkeletonLoader colors={colors} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ParallaxScrollView
        headerComponent={headerComponent}
        headerHeight={140}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); refresh(); }}
            tintColor={colors.primary}
          />
        }
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Burnout Risk Section */}
          <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.burnoutSection}>
            <Text style={styles.sectionTitle}>Burnout Risk Score</Text>
            <View style={styles.gaugeContainer}>
              <BurnoutGauge
                score={burnout?.burnout_score ?? 0}
                riskLevel={burnout?.risk_level ?? 'low'}
                size={220}
              />
            </View>
            <LinearGradient
              colors={[riskColor + '20', riskColor + '0D']}
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
                  : 'High burnout risk detected. Take immediate breaks.'}
              </Text>
            </LinearGradient>
          </NeumorphicView>

          {/* Today's Metrics Grid */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Today's Metrics</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <View style={{ flex: 1, minWidth: 140 }}>
                <MetricCard
                  title="Sleep Score"
                  value={burnout?.sleep_quality_score ?? 0}
                  unit="%"
                  score={burnout?.sleep_quality_score ?? 0}
                  icon="moon-waning-crescent"
                  change={0}
                  onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Sleep' })}
                />
              </View>

              <View style={{ flex: 1, minWidth: 140 }}>
                <MetricCard
                  title="Screen Time"
                  value={data?.recent_phone_usage?.total_hours ? `${data.recent_phone_usage.total_hours.toFixed(1)}` : '0.0'}
                  unit="h"
                  score={burnout?.phone_usage_score ?? 0}
                  icon="cellphone"
                  change={0}
                  onPress={() => (navigation as any).navigate('PhoneUsage')}
                />
              </View>

              <View style={{ flex: 1, minWidth: 140 }}>
                <MetricCard
                  title="Activity"
                  value={burnout?.activity_score ?? 0}
                  unit="%"
                  score={burnout?.activity_score ?? 0}
                  icon="lightning-bolt"
                  change={0}
                  onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Activity' })}
                />
              </View>

              <View style={{ flex: 1, minWidth: 140 }}>
                <MetricCard
                  title="Mood Stability"
                  value={burnout?.emotional_stability_index ?? 0}
                  unit="%"
                  score={burnout?.emotional_stability_index ?? 0}
                  icon="emoticon-outline"
                  change={0}
                  onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Emotion' })}
                />
              </View>
            </View>
          </View>

          {/* Wellness Balance */}
          <View style={styles.wellnessSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Wellness Balance</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Analytics')}>
                <Text style={styles.seeAll}>Analytics →</Text>
              </TouchableOpacity>
            </View>
            <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.wellnessCard}>
              <View style={styles.wellnessLeft}>
                <WellnessRing
                  score={burnout?.wellness_score ?? 0}
                  label="Wellness"
                  size={110}
                />
              </View>
              <View style={styles.wellnessRight}>
                <WellnessRingLegend score={burnout?.sleep_quality_score ?? 0} label="Sleep" colors={colors} styles={styles} />
                <WellnessRingLegend score={burnout?.emotional_stability_index ?? 0} label="Emotion" colors={colors} styles={styles} />
                <WellnessRingLegend score={burnout?.activity_score ?? 0} label="Activity" colors={colors} styles={styles} />
                <WellnessRingLegend score={burnout?.phone_usage_score ?? 0} label="Screen" colors={colors} styles={styles} />
              </View>
            </NeumorphicView>
          </View>

          {/* Emotional Stability Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.sectionTitle}>Emotional Stability (7 Days)</Text>
            <NeumorphicView variant="raised" borderRadius={24} padding={12} style={styles.chartCard} pointerEvents="none">
              <LineChart
                data={{
                  labels: data?.trend_data.dates ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                  datasets: [
                    {
                      data: data?.trend_data.emotion_scores ?? [0, 0, 0, 0, 0, 0, 0],
                      color: (opacity = 1) => `rgba(108, 92, 231, ${opacity})`,
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={contentWidth - 64}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </NeumorphicView>
          </View>

          {/* AI Recommendation Spotlight */}
          {burnout?.recommendations && burnout.recommendations.length > 0 && (
            <View style={styles.recSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Top AI Insight</Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('Recommendations')}>
                  <Text style={styles.seeAll}>All ({burnout.recommendations.length}) →</Text>
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
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    (navigation as any).navigate('MainTabs', { screen: action.screen });
                  }}
                  activeOpacity={0.8}
                  style={styles.quickActionItem}
                >
                  <NeumorphicView variant="raised" borderRadius={20} padding={16} style={styles.quickActionIcon}>
                    <MaterialCommunityIcons name={action.icon as any} size={24} color={action.color} />
                  </NeumorphicView>
                  <Text style={styles.quickActionLabel}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </ParallaxScrollView>

      {/* Notification Center Modal */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        onNavigate={(screen) => (navigation as any).navigate(screen)}
      />
    </View>
  );
};

const WellnessRingLegend: React.FC<{ score: number; label: string; colors: ThemeColors; styles: ReturnType<typeof createStyles> }> = ({ score, label, colors, styles }) => {
  const color = getRiskColor('low', colors);
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  date: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  notifButtonWrapper: {},
  notifButton: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  notifDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notifDotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  burnoutSection: { marginBottom: 18 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
  gaugeContainer: { alignItems: 'center', marginVertical: 4 },
  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, marginTop: 8 },
  riskBannerText: { fontSize: 13, fontWeight: '600', flex: 1 },
  metricsSection: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  wellnessSection: { marginBottom: 20 },
  wellnessCard: { flexDirection: 'row', alignItems: 'center' },
  wellnessLeft: { marginRight: 24 },
  wellnessRight: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 13, color: colors.textMuted, flex: 1, fontWeight: '500' },
  legendScore: { fontSize: 13, fontWeight: '700' },
  chartSection: { marginBottom: 20 },
  chartCard: { overflow: 'hidden' },
  chart: { borderRadius: 12, marginLeft: -10 },
  recSection: { marginBottom: 20 },
  recWrapper: { position: 'relative' },
  aiTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  aiTagText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  quickActionsSection: { marginBottom: 20 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickActionItem: { alignItems: 'center', gap: 8 },
  quickActionIcon: { width: 62, height: 62, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  quickActionLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
});

export default DashboardScreen;
