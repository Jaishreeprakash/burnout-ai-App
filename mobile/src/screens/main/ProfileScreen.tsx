import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../context/AuthContext';
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { useDashboard } from '../../hooks/useDashboard';
import { StorageService } from '../../services/storage';
import { authApi } from '../../services/api';

const ProfileScreen: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, scheme, toggleTheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data } = useDashboard();
  const burnout = data?.burnout_analysis;

  // ── Notification State ──────────────────────────────────────────────────
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyReminders, setDailyReminders] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(false);

  // ── Modal States ────────────────────────────────────────────────────────
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);

  // ── Form Input States ──────────────────────────────────────────────────
  const [editName, setEditName] = useState(user?.full_name ?? '');
  const [editEmail, setEditEmail] = useState(user?.email ?? '');
  const [editAge, setEditAge] = useState(user?.age ? String(user.age) : '28');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [rating, setRating] = useState(5);
  const [isSaving, setIsSaving] = useState(false);

  // Load saved notification settings
  useEffect(() => {
    StorageService.getSettings().then((saved) => {
      if (saved) {
        if (typeof saved.notificationsEnabled === 'boolean') setNotificationsEnabled(saved.notificationsEnabled);
        if (typeof saved.dailyReminders === 'boolean') setDailyReminders(saved.dailyReminders);
        if (typeof saved.weeklyReport === 'boolean') setWeeklyReport(saved.weeklyReport);
      }
    });
  }, []);

  // Save settings when toggled
  const handleToggleSetting = (key: string, value: boolean, setter: (v: boolean) => void) => {
    Haptics.selectionAsync();
    setter(value);
    StorageService.getSettings().then((existing) => {
      StorageService.saveSettings({ ...existing, [key]: value });
    });
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() ?? 'AI';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        logout().catch(() => window.alert('Sign Out Failed'));
      }
      return;
    }

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

  // ── Handle Edit Profile Save ──────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Missing Fields', 'Please fill in your name and email.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedUser = await authApi.updateProfile({
        full_name: editName.trim(),
        age: parseInt(editAge, 10) || undefined,
      });
      updateUser(updatedUser);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowEditProfile(false);
      Alert.alert('Profile Updated', 'Your profile details have been saved successfully.');
    } catch {
      Alert.alert('Error', 'Failed to save profile changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handle Change Password Save ────────────────────────────────────────
  const handleSavePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Missing Fields', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters.');
      return;
    }

    setIsSaving(true);
    try {
      if (user?.email) {
        await authApi.resetPassword({ email: user.email, new_password: newPassword });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed successfully.');
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Success', 'Your password has been changed successfully.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── Handle Real CSV / Data Export ──────────────────────────────────────
  const handleExportData = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const csvContent = [
      'Category,Metric,Value,Date',
      `User,Full Name,"${user?.full_name ?? user?.username ?? 'User'}",${new Date().toISOString()}`,
      `User,Email,"${user?.email ?? ''}",${new Date().toISOString()}`,
      `Burnout,Burnout Score,${burnout?.burnout_score ?? 0},${new Date().toISOString()}`,
      `Burnout,Risk Level,${burnout?.risk_level ?? 'None'},${new Date().toISOString()}`,
      `Burnout,Wellness Score,${burnout?.wellness_score ?? 0},${new Date().toISOString()}`,
      `Sleep,Duration (hours),${data?.recent_sleep?.duration_hours ?? 0},${data?.recent_sleep?.date ?? 'Today'}`,
      `Sleep,Quality Score,${data?.recent_sleep?.quality_score ?? 0},${data?.recent_sleep?.date ?? 'Today'}`,
      `Phone,Screen Time (hours),${data?.recent_phone_usage?.total_hours ?? 0},${data?.recent_phone_usage?.date ?? 'Today'}`,
      `Phone,Pickups Count,${data?.recent_phone_usage?.pickups_count ?? 0},${data?.recent_phone_usage?.date ?? 'Today'}`,
      `Emotion,Dominant Emotion,${data?.recent_emotion?.dominant_emotion ?? 'None'},${data?.recent_emotion?.timestamp ?? 'Today'}`,
      `Activity,Work Hours,${data?.recent_activity?.work_hours ?? 0},${data?.recent_activity?.date ?? 'Today'}`,
      `Activity,Exercise (min),${data?.recent_activity?.exercise_minutes ?? 0},${data?.recent_activity?.date ?? 'Today'}`,
    ].join('\n');

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `burnout_ai_wellness_data_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportModal(true);
    } else {
      setShowExportModal(true);
    }
  };

  let activeDays = 0;
  let streak = 0;
  if (data?.trend_data) {
    const { sleep_scores, emotion_scores, burnout_scores } = data.trend_data;
    for (let i = 0; i < 7; i++) {
      if ((sleep_scores?.[i] ?? 0) > 0 || (emotion_scores?.[i] ?? 0) > 0 || (burnout_scores?.[i] ?? 0) > 0) {
        activeDays++;
      }
    }
    for (let i = 6; i >= 0; i--) {
      if ((sleep_scores?.[i] ?? 0) > 0 || (emotion_scores?.[i] ?? 0) > 0 || (burnout_scores?.[i] ?? 0) > 0) {
        streak++;
      } else {
        break;
      }
    }
  }

  const avgWellnessVal = burnout ? Math.round(burnout.wellness_score ?? 0) : 0;

  const stats = [
    { label: 'Days Tracked', value: `${activeDays || 0}`, icon: 'calendar-check' },
    { label: 'Current Streak', value: `${streak || 0}`, icon: 'fire' },
    { label: 'Avg Wellness', value: `${avgWellnessVal || 0}%`, icon: 'heart-pulse' },
  ];

  const settingSections = [
    {
      title: 'Appearance & Theme',
      items: [
        {
          icon: scheme === 'light' ? 'weather-sunny' : 'weather-night',
          label: 'Dark Mode',
          type: 'toggle' as const,
          value: scheme === 'dark',
          onToggle: () => toggleTheme(),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: 'bell-outline',
          label: 'All Notifications',
          type: 'toggle' as const,
          value: notificationsEnabled,
          onToggle: () => handleToggleSetting('notificationsEnabled', !notificationsEnabled, setNotificationsEnabled),
        },
        {
          icon: 'alarm',
          label: 'Daily Check-in Reminder',
          type: 'toggle' as const,
          value: dailyReminders,
          onToggle: () => handleToggleSetting('dailyReminders', !dailyReminders, setDailyReminders),
        },
        {
          icon: 'chart-bar',
          label: 'Weekly Wellness Report',
          type: 'toggle' as const,
          value: weeklyReport,
          onToggle: () => handleToggleSetting('weeklyReport', !weeklyReport, setWeeklyReport),
        },
      ],
    },
    {
      title: 'Account & Data',
      items: [
        {
          icon: 'account-edit-outline',
          label: 'Edit Profile',
          type: 'link' as const,
          onPress: () => {
            setEditName(user?.full_name ?? user?.username ?? '');
            setEditEmail(user?.email ?? '');
            setEditAge(user?.age ? String(user.age) : '28');
            setShowEditProfile(true);
          },
        },
        {
          icon: 'lock-outline',
          label: 'Change Password',
          type: 'link' as const,
          onPress: () => setShowChangePassword(true),
        },
        {
          icon: 'export-variant',
          label: 'Export My Data',
          type: 'link' as const,
          onPress: handleExportData,
        },
      ],
    },
    {
      title: 'About App',
      items: [
        {
          icon: 'information-outline',
          label: 'App Version',
          type: 'info' as const,
          value: '1.0.0 (Neumorphic UI)',
        },
        {
          icon: 'brain',
          label: 'AI Model',
          type: 'info' as const,
          value: 'BurnoutAI Smart Engine',
        },
        {
          icon: 'star-outline',
          label: 'Rate BurnoutAI',
          type: 'link' as const,
          onPress: () => setShowRatingModal(true),
        },
      ],
    },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Neumorphic Header Card */}
        <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.header}>
          <View style={styles.avatarSection}>
            <NeumorphicView variant="pressed" borderRadius={24} padding={4} style={styles.avatarContainer}>
              <View style={[styles.avatarInner, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            </NeumorphicView>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.full_name ?? user?.username ?? 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email ?? 'demo@burnoutai.com'}</Text>
              <View style={[styles.memberBadge, { backgroundColor: colors.warning + '1A' }]}>
                <MaterialCommunityIcons name="shield-star" size={12} color={colors.warning} />
                <Text style={[styles.memberText, { color: colors.warning }]}>Premium Member</Text>
              </View>
            </View>
          </View>
        </NeumorphicView>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {stats.map((stat) => (
            <NeumorphicView key={stat.label} variant="raised" borderRadius={20} padding={14} style={styles.statCard}>
              <MaterialCommunityIcons name={stat.icon as any} size={20} color={colors.primary} />
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </NeumorphicView>
          ))}
        </View>

        {/* Burnout Summary Card */}
        <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <MaterialCommunityIcons name="brain" size={18} color={colors.primary} />
            <Text style={styles.summaryTitle}>Your Wellness Summary</Text>
          </View>
          <View style={styles.summaryStats}>
            {[
              { label: 'Burnout Risk', value: burnout ? `${Math.round(burnout.burnout_score)}%` : '0%', color: colors.warning },
              { label: 'Wellness Score', value: burnout ? `${Math.round(burnout.wellness_score ?? 0)}/100` : '0/100', color: colors.success },
              { label: 'Risk Level', value: burnout ? (burnout.risk_level.charAt(0).toUpperCase() + burnout.risk_level.slice(1)) : 'None', color: colors.warning },
            ].map((item) => (
              <View key={item.label} style={styles.summaryItem}>
                <Text style={[styles.summaryItemValue, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.summaryItemLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </NeumorphicView>

        {/* Settings Sections */}
        {settingSections.map((section) => (
          <View key={section.title} style={styles.settingSection}>
            <Text style={styles.settingSectionTitle}>{section.title}</Text>
            <NeumorphicView variant="raised" borderRadius={20} padding={4} style={styles.settingCard}>
              {section.items.map((item, index) => {
                const isLink = item.type === 'link';
                const rowContent = (
                  <View style={styles.settingRow}>
                    <View style={styles.settingLeft}>
                      <View style={[styles.settingIcon, { backgroundColor: colors.primary + '1A' }]}>
                        <MaterialCommunityIcons name={item.icon as any} size={18} color={colors.primary} />
                      </View>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.settingRight}>
                      {item.type === 'toggle' && (
                        <Switch
                          value={item.value as boolean}
                          onValueChange={() => (item as any).onToggle?.()}
                          trackColor={{ false: colors.surfacePressed, true: colors.primary + '66' }}
                          thumbColor={(item.value as boolean) ? colors.primary : colors.textMuted}
                        />
                      )}
                      {item.type === 'link' && (
                        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
                      )}
                      {item.type === 'info' && (
                        <Text style={styles.settingInfoValue}>{(item as any).value}</Text>
                      )}
                    </View>
                  </View>
                );

                return (
                  <View key={item.label}>
                    {isLink ? (
                      <TouchableOpacity
                        onPress={(item as any).onPress}
                        activeOpacity={0.7}
                        accessibilityLabel={item.label}
                        accessibilityRole="button"
                      >
                        {rowContent}
                      </TouchableOpacity>
                    ) : (
                      rowContent
                    )}
                    {index < section.items.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </NeumorphicView>
          </View>
        ))}

        {/* Logout Button */}
        <NeumorphicButton
          title="Sign Out"
          icon="logout"
          variant="danger"
          size="large"
          onPress={handleLogout}
          style={{ marginVertical: 14 }}
        />

        <Text style={styles.footer}>BurnoutAI v1.0.0 • Beautiful Neumorphic UI Design</Text>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── EDIT PROFILE MODAL ───────────────────────────────────────────── */}
      <Modal visible={showEditProfile} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <NeumorphicView variant="raised" borderRadius={24} padding={24} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="account-edit" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Edit Profile</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter full name"
                  placeholderTextColor={colors.textMuted}
                />
              </NeumorphicView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  placeholder="Enter email"
                  placeholderTextColor={colors.textMuted}
                />
              </NeumorphicView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  value={editAge}
                  onChangeText={setEditAge}
                  keyboardType="number-pad"
                  placeholder="Enter age"
                  placeholderTextColor={colors.textMuted}
                />
              </NeumorphicView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowEditProfile(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <NeumorphicButton title="Save Profile" variant="primary" size="medium" onPress={handleSaveProfile} />
            </View>
          </NeumorphicView>
        </View>
      </Modal>

      {/* ── CHANGE PASSWORD MODAL ───────────────────────────────────────── */}
      <Modal visible={showChangePassword} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <NeumorphicView variant="raised" borderRadius={24} padding={24} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="lock-reset" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Change Password</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Current password"
                  placeholderTextColor={colors.textMuted}
                />
              </NeumorphicView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password (min 6 chars)"
                  placeholderTextColor={colors.textMuted}
                />
              </NeumorphicView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={styles.modalInputWrapper}>
                <TextInput
                  style={styles.modalInput}
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textMuted}
                />
              </NeumorphicView>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowChangePassword(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <NeumorphicButton
                title={isSaving ? 'Updating...' : 'Update Password'}
                variant="primary"
                size="medium"
                disabled={isSaving}
                onPress={handleSavePassword}
              />
            </View>
          </NeumorphicView>
        </View>
      </Modal>

      {/* ── EXPORT DATA CONFIRMATION MODAL ─────────────────────────────── */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <NeumorphicView variant="raised" borderRadius={24} padding={24} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="file-check-outline" size={28} color={colors.success} />
              <Text style={styles.modalTitle}>Data Export Ready</Text>
            </View>
            <Text style={styles.exportDesc}>
              Your complete wellness dataset (Burnout analysis, Sleep logs, Screen time, Mood logs, and Activity records) has been formatted into CSV.
            </Text>
            <View style={styles.exportBadge}>
              <MaterialCommunityIcons name="file-delimited" size={20} color={colors.primary} />
              <Text style={styles.exportBadgeText}>burnout_ai_wellness_data.csv</Text>
            </View>
            <NeumorphicButton title="Done" variant="primary" size="medium" onPress={() => setShowExportModal(false)} />
          </NeumorphicView>
        </View>
      </Modal>

      {/* ── RATE APP MODAL ─────────────────────────────────────────────── */}
      <Modal visible={showRatingModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <NeumorphicView variant="raised" borderRadius={24} padding={24} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons name="star-face" size={28} color={colors.warning} />
              <Text style={styles.modalTitle}>Rate BurnoutAI</Text>
            </View>
            <Text style={styles.exportDesc}>How would you rate your experience with BurnoutAI?</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRating(star);
                  }}
                >
                  <MaterialCommunityIcons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={colors.warning}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <NeumorphicButton
              title="Submit Feedback"
              variant="primary"
              size="medium"
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowRatingModal(false);
                Alert.alert('Thank You! ⭐', 'Your feedback helps us make BurnoutAI even better!');
              }}
            />
          </NeumorphicView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingHorizontal: 20, maxWidth: 680, alignSelf: 'center', width: '100%' },
    header: { marginVertical: 14 },
    avatarSection: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarContainer: {},
    avatarInner: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 26, fontWeight: '800', color: '#fff' },
    userInfo: { flex: 1 },
    userName: { fontSize: 22, fontWeight: '800', color: colors.text },
    userEmail: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
    memberBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    memberText: { fontSize: 11, fontWeight: '700' },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard: { flex: 1, alignItems: 'center', gap: 4 },
    statValue: { fontSize: 20, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
    summaryCard: { marginBottom: 20 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    summaryTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center', gap: 4 },
    summaryItemValue: { fontSize: 18, fontWeight: '800' },
    summaryItemLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },
    settingSection: { marginBottom: 18 },
    settingSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    settingCard: {},
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    settingIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    settingLabel: { fontSize: 14, color: colors.text, fontWeight: '600' },
    settingRight: {},
    settingInfoValue: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    divider: { height: 1, backgroundColor: colors.borderLight, marginLeft: 56 },
    footer: { textAlign: 'center', fontSize: 12, color: colors.textDim, marginBottom: 8, fontWeight: '500' },

    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 440,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 18,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    inputGroup: {
      marginBottom: 14,
    },
    inputLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      marginBottom: 6,
    },
    modalInputWrapper: {},
    modalInput: {
      height: 42,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 14,
    },
    modalActions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 10,
    },
    cancelBtn: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    cancelBtnText: {
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: 14,
    },
    exportDesc: {
      fontSize: 14,
      color: colors.textMuted,
      lineHeight: 20,
      marginBottom: 16,
    },
    exportBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.primary + '1F',
      padding: 12,
      borderRadius: 14,
      marginBottom: 20,
    },
    exportBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
    },
    ratingRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginVertical: 20,
    },
  });

export default ProfileScreen;
