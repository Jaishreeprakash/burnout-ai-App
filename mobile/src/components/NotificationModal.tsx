import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import NeumorphicView from './NeumorphicView';
import NeumorphicButton from './NeumorphicButton';
import { ThemeColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import {
  NotificationService,
  WellnessNotification,
} from '../services/notificationService';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigate?: (screenName: string) => void;
}

const CATEGORY_CONFIG: Record<
  string,
  { icon: string; colorKey: 'danger' | 'info' | 'warning' | 'primary' | 'success' }
> = {
  stress: { icon: 'alert-decagram-outline', colorKey: 'danger' },
  sleep: { icon: 'moon-waning-crescent', colorKey: 'info' },
  phone: { icon: 'cellphone', colorKey: 'warning' },
  wellness: { icon: 'heart-pulse', colorKey: 'primary' },
  system: { icon: 'bell-outline', colorKey: 'success' },
};

const NotificationModal: React.FC<NotificationModalProps> = ({
  visible,
  onClose,
  onNavigate,
}) => {
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [notifications, setNotifications] = useState<WellnessNotification[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    setNotifications(NotificationService.getNotifications());
    const unsubscribe = NotificationService.subscribe(() => {
      setNotifications(NotificationService.getNotifications());
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionGranted(window.Notification.permission === 'granted');
    } else {
      setPermissionGranted(true);
    }

    return unsubscribe;
  }, []);

  const unreadCount = NotificationService.getUnreadCount();

  const handleRequestPushPermission = async () => {
    const granted = await NotificationService.requestPermission();
    setPermissionGranted(granted);
    if (granted) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      NotificationService.sendRealPushNotification(
        'Push Notifications Enabled! 🔔',
        'You will now receive real-time wellness alerts and reminders.'
      );
    }
  };

  const handleSendTestPush = () => {
    NotificationService.sendRealPushNotification(
      'Take a 5-minute Mindful Break 🌿',
      'Your recent screen time markers suggest it\'s a great time to rest your eyes.'
    );
  };

  const handleNotificationPress = (item: WellnessNotification) => {
    Haptics.selectionAsync();
    NotificationService.markAsRead(item.id);
    onClose();
    if (item.targetScreen && onNavigate) {
      onNavigate(item.targetScreen);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <NeumorphicView variant="raised" borderRadius={24} padding={20} style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="bell-ring-outline" size={24} color={colors.primary} />
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Quick Push Permission Banner */}
          {!permissionGranted && Platform.OS === 'web' && (
            <TouchableOpacity
              onPress={handleRequestPushPermission}
              activeOpacity={0.8}
              style={[styles.pushBanner, { backgroundColor: colors.primary + '1A' }]}
            >
              <MaterialCommunityIcons name="bell-plus-outline" size={20} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pushBannerTitle, { color: colors.primary }]}>Enable Web Push Notifications</Text>
                <Text style={styles.pushBannerSub}>Get real desktop pop-up alerts for wellness breaks</Text>
              </View>
              <Text style={[styles.enableText, { color: colors.primary }]}>Enable →</Text>
            </TouchableOpacity>
          )}

          {/* Action Bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                NotificationService.markAllAsRead();
              }}
              style={styles.actionBtn}
            >
              <MaterialCommunityIcons name="check-all" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Mark all read</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSendTestPush} style={styles.actionBtn}>
              <MaterialCommunityIcons name="send-outline" size={16} color={colors.info} />
              <Text style={[styles.actionBtnText, { color: colors.info }]}>Test Push Alert</Text>
            </TouchableOpacity>
          </View>

          {/* Notification List */}
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="bell-off-outline" size={48} color={colors.textDim} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptySub}>You are all caught up for today!</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              renderItem={({ item }) => {
                const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.wellness;
                const catColor = colors[config.colorKey];

                return (
                  <TouchableOpacity
                    onPress={() => handleNotificationPress(item)}
                    activeOpacity={0.8}
                    style={styles.itemWrapper}
                  >
                    <NeumorphicView
                      variant={item.read ? 'flat' : 'pressed'}
                      borderRadius={18}
                      padding={14}
                      style={[
                        styles.itemCard,
                        !item.read && { backgroundColor: colors.primary + '0D' },
                      ]}
                    >
                      <View style={[styles.catIcon, { backgroundColor: catColor + '1F' }]}>
                        <MaterialCommunityIcons name={config.icon as any} size={20} color={catColor} />
                      </View>
                      <View style={styles.itemContent}>
                        <View style={styles.itemTitleRow}>
                          <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>
                            {item.title}
                          </Text>
                          {!item.read && <View style={[styles.dot, { backgroundColor: colors.danger }]} />}
                        </View>
                        <Text style={styles.itemBody} numberOfLines={2}>
                          {item.body}
                        </Text>
                        <Text style={styles.itemTime}>{item.time}</Text>
                      </View>
                    </NeumorphicView>
                  </TouchableOpacity>
                );
              }}
            />
          )}

          {/* Footer */}
          <NeumorphicButton
            title="Close Notifications"
            variant="primary"
            size="medium"
            onPress={onClose}
            style={{ marginTop: 12 }}
          />
        </NeumorphicView>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    container: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      fontSize: 20,
      fontWeight: '800',
      color: colors.text,
    },
    unreadBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    unreadBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
    },
    closeBtn: {
      padding: 4,
    },
    pushBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 14,
      marginBottom: 12,
    },
    pushBannerTitle: {
      fontSize: 12,
      fontWeight: '700',
    },
    pushBannerSub: {
      fontSize: 11,
      color: colors.textMuted,
    },
    enableText: {
      fontSize: 12,
      fontWeight: '700',
    },
    actionBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionBtnText: {
      fontSize: 12,
      fontWeight: '600',
    },
    list: {
      maxHeight: 340,
    },
    itemWrapper: {
      marginBottom: 10,
    },
    itemCard: {
      flexDirection: 'row',
      gap: 12,
    },
    catIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    itemContent: {
      flex: 1,
    },
    itemTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    itemTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      flex: 1,
    },
    itemTitleUnread: {
      fontWeight: '800',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    itemBody: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
      lineHeight: 17,
    },
    itemTime: {
      fontSize: 10,
      color: colors.textDim,
      marginTop: 4,
      fontWeight: '500',
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 36,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    emptySub: {
      fontSize: 12,
      color: colors.textMuted,
    },
  });

export default NotificationModal;
