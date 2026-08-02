import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useDashboard } from '../../hooks/useDashboard';

const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, isLoading } = useDashboard();
  const burnout = data?.burnout_analysis;

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? 'AI';

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          try {
            await logout();
          } catch (error) {
            Alert.alert('Sign Out Failed', 'Something went wrong while signing out. Please try again.');
          }
        },
      },
    ]);
  };

  // Calculate dynamic stats
  let activeDays = 0;
  let streak = 0;
  if (data?.trend_data) {
    const { sleep_scores, emotion_scores, burnout_scores } = data.trend_data;
    // Days Tracked
    for (let i = 0; i < 7; i++) {
      if ((sleep_scores?.[i] ?? 0) > 0 || (emotion_scores?.[i] ?? 0) > 0 || (burnout_scores?.[i] ?? 0) > 0) {
        activeDays++;
      }
    }
    // Streak
    for (let i = 6; i >= 0; i--) {
      if ((sleep_scores?.[i] ?? 0) > 0 || (emotion_scores?.[i] ?? 0) > 0 || (burnout_scores?.[i] ?? 0) > 0) {
        streak++;
      } else {
        break;
      }
    }
  }

  const avgWellnessVal = burnout ? Math.round(burnout.wellness?.overall_score ?? burnout.wellness_score ?? 0) : 0;

  const stats = [
    { label: 'Days Tracked', value: `${activeDays}`, icon: 'calendar-check' },
    { label: 'Current Streak', value: `${streak}`, icon: 'fire' },
    { label: 'Avg Wellness', value: `${avgWellnessVal}%`, icon: 'heart-pulse' },
  ];

  const settingSections = [
    {
      title: 'Notifications',
      items: [
        {
          icon: 'bell-outline',
          label: 'All Notifications',
          type: 'toggle' as const,
          value: notificationsEnabled,
          onToggle: () => setNotificationsEnabled(!notificationsEnabled),
        },
        {
          icon: 'alarm',
          label: 'Daily Check-in Reminder',
          type: 'toggle' as const,
          value: dailyReminders,
          onToggle: () => setDailyReminders(!dailyReminders),
        },
        {
          icon: 'chart-bar',
          label: 'Weekly Wellness Report',
          type: 'toggle' as const,
          value: weeklyReport,
          onToggle: () => setWeeklyReport(!weeklyReport),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: 'account-edit-outline',
          label: 'Edit Profile',
          type: 'link' as const,
          onPress: () => Alert.alert('Coming Soon', 'Profile editing will be available in the next update.'),
        },
        {
          icon: 'lock-outline',
          label: 'Change Password',
          type: 'link' as const,
          onPress: () => Alert.alert('Coming Soon', 'Password change will be available in the next update.'),
        },
        {
          icon: 'export-variant',
          label: 'Export My Data',
          type: 'link' as const,
          onPress: () => Alert.alert('Export Data', 'Your wellness data will be exported as CSV.'),
        },
      ],
    },
    {
      title: 'Privacy & Legal',
      items: [
        {
          icon: 'shield-check-outline',
          label: 'Privacy Policy',
          type: 'link' as const,
          onPress: () => Alert.alert('Privacy Policy', 'Your data is encrypted and stored securely. We never sell your personal information.'),
        },
        {
          icon: 'file-document-outline',
          label: 'Terms of Service',
          type: 'link' as const,
          onPress: () => Alert.alert('Terms', 'By using BurnoutAI, you agree to our terms of service.'),
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          icon: 'information-outline',
          label: 'App Version',
          type: 'info' as const,
          value: '1.0.0',
        },
        {
          icon: 'brain',
          label: 'AI Model',
          type: 'info' as const,
          value: 'GPT-4 Enhanced',
        },
        {
          icon: 'star-outline',
          label: 'Rate BurnoutAI',
          type: 'link' as const,
          onPress: () => Alert.alert('Thank You!', 'Your support means a lot to us!'),
        },
        {
          icon: 'message-text-outline',
          label: 'Send Feedback',
          type: 'link' as const,
          onPress: () => Alert.alert('Feedback', 'Thank you for your interest! Email us at feedback@burnoutai.com'),
        },
      ],
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        {/* Fixed (not theme-driven) decorative banner gradient, matching the auth screens' hero background. */}
        <LinearGradient colors={['#312e81', '#0f172a']} style={styles.header}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.full_name ?? user?.username ?? 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email ?? 'demo@burnoutai.com'}</Text>
              <View style={styles.memberBadge}>
                <MaterialCommunityIcons name="shield-star" size={12} color={colors.warning} />
                <Text style={styles.memberText}>Premium Member</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <MaterialCommunityIcons name={stat.icon as any} size={20} color={colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Burnout Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="brain" size={18} color={colors.primary} />
            <Text style={styles.summaryTitle}>Your Wellness Summary</Text>
          </View>
          <View style={styles.summaryStats}>
            {[
              { label: 'Burnout Risk', value: burnout ? `${Math.round(burnout.burnout_score)}%` : '0%', color: colors.warning },
              { label: 'Wellness Score', value: burnout ? `${Math.round(burnout.wellness?.overall_score ?? burnout.wellness_score ?? 0)}/100` : '0/100', color: colors.success },
              { label: 'Risk Level', value: burnout ? (burnout.risk_level.charAt(0).toUpperCase() + burnout.risk_level.slice(1)) : 'Low', color: colors.warning },
            ].map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <Text style={[styles.summaryItemValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.summaryItemLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Settings Sections */}
        {settingSections.map((section) => (
          <View key={section.title} style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>{section.title}</Text>
            <View style={styles.settingCard}>
              {section.items.map((item, index) => (
                <View key={item.label}>
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <View style={styles.settingIcon}>
                        <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.settingRight}>
                      {item.type === 'toggle' && (
                        <Switch
                          value={item.value as boolean}
                          onValueChange={() => {
                            Haptics.selectionAsync();
                            (item as any).onToggle?.();
                          }}
                          trackColor={{ false: colors.surfaceLight, true: colors.primary + '66' }}
                          thumbColor={(item.value as boolean) ? colors.primary : colors.textMuted}
                        />
                      )}
                      {item.type === 'link' && (
                        <TouchableOpacity
                          onPress={(item as any).onPress}
                          activeOpacity={0.7}
                          accessibilityLabel={item.label}
                          accessibilityRole="button"
                        >
                          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                        </TouchableOpacity>
                      )}
                      {item.type === 'info' && (
                        <Text style={styles.settingInfoValue}>{(item as any).value}</Text>
                      )}
                    </View>
                  </View>
                  {index < section.items.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity testID="profile-logout-button" style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
          <MaterialCommunityIcons name="logout" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>BurnoutAI v1.0.0 • Built with care for your wellbeing</Text>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20 },
  header: { borderRadius: 24, padding: 20, marginVertical: 16 },
  avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userInfo: { flex: 1 },
  // Pinned (not theme-driven): sit on the fixed-color end of the header gradient, not the themed surface.
  userName: { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  userEmail: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: colors.warning + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  memberText: { fontSize: 11, color: colors.warning, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, padding: 16, gap: 4, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  summaryCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: colors.primary + '33', borderLeftWidth: 3, borderLeftColor: colors.primary },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryItemValue: { fontSize: 18, fontWeight: '800' },
  summaryItemLabel: { fontSize: 11, color: colors.textMuted },
  settingSection: { marginBottom: 20 },
  settingSectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  settingCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary + '22', justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 14, color: colors.text, fontWeight: '500' },
  settingRight: {},
  settingInfoValue: { fontSize: 13, color: colors.textMuted },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 60 },
  logoutButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: colors.danger + '11', borderWidth: 1, borderColor: colors.danger + '44', marginBottom: 20 },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.danger },
  footer: { textAlign: 'center', fontSize: 12, color: colors.textDim, marginBottom: 8 },
});

export default ProfileScreen;
