import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure foreground notification behavior for mobile (iOS/Android)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface WellnessNotification {
  id: string;
  title: string;
  body: string;
  category: 'stress' | 'sleep' | 'phone' | 'wellness' | 'system';
  time: string;
  timestamp: number;
  read: boolean;
  priority: 'high' | 'medium' | 'low';
  targetScreen?: string;
}

const INITIAL_NOTIFICATIONS: WellnessNotification[] = [
  {
    id: '1',
    title: 'Elevated Stress Level Detected',
    body: 'Your emotional markers show elevated stress today. Try a 2-minute box breathing exercise.',
    category: 'stress',
    time: '10 min ago',
    timestamp: Date.now() - 10 * 60 * 1000,
    read: false,
    priority: 'high',
    targetScreen: 'Emotion',
  },
  {
    id: '2',
    title: 'Sleep Target Reached 🎉',
    body: 'Great job! You logged 7.5 hours of sleep last night, improving your circadian score.',
    category: 'sleep',
    time: '2 hours ago',
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    read: false,
    priority: 'medium',
    targetScreen: 'Sleep',
  },
  {
    id: '3',
    title: 'Digital Wellness Alert 📱',
    body: 'You reached 4.2 hours of screen time today. Consider taking a 15-minute screen break.',
    category: 'phone',
    time: '5 hours ago',
    timestamp: Date.now() - 5 * 60 * 60 * 1000,
    read: true,
    priority: 'medium',
    targetScreen: 'PhoneUsage',
  },
  {
    id: '4',
    title: 'Weekly Wellness Report',
    body: 'Your overall wellness index increased by +8% this week! View full analytics.',
    category: 'wellness',
    time: '1 day ago',
    timestamp: Date.now() - 24 * 60 * 60 * 1000,
    read: true,
    priority: 'low',
    targetScreen: 'Analytics',
  },
];

let notifications: WellnessNotification[] = [...INITIAL_NOTIFICATIONS];
let listeners: Array<() => void> = [];

export const NotificationService = {
  getNotifications(): WellnessNotification[] {
    return [...notifications];
  },

  getUnreadCount(): number {
    return notifications.filter((n) => !n.read).length;
  },

  markAsRead(id: string): void {
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    NotificationService.notifyListeners();
  },

  markAllAsRead(): void {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    NotificationService.notifyListeners();
  },

  deleteNotification(id: string): void {
    notifications = notifications.filter((n) => n.id !== id);
    NotificationService.notifyListeners();
  },

  subscribe(listener: () => void): () => void {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  },

  notifyListeners(): void {
    listeners.forEach((l) => l());
  },

  /** Request real OS / browser Web Push Notification permission and get Expo Push Token. */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await window.Notification.requestPermission();
        return result === 'granted';
      } catch (err) {
        console.warn('Web notification permission error:', err);
        return false;
      }
    } else if (Platform.OS !== 'web') {
      // Mobile Push Notification Permissions
      if (!Device.isDevice) {
        console.warn('Must use physical device for native Push Notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('Failed to get permissions for push notification!');
        return false;
      }

      // Note: Expo Go (SDK 53+) removed support for remote push notifications (getExpoPushTokenAsync).
      // Since we are scheduling *Local* Push Notifications (scheduleNotificationAsync),
      // we do not need a remote token, so we can skip fetching it entirely.
      return true;
    }
    return true; // Fallback
  },

  /** Trigger a real Push Notification (OS / Web Push API). */
  async sendRealPushNotification(title: string, body: string, targetScreen?: string): Promise<void> {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Add to in-app notifications
    const newNotif: WellnessNotification = {
      id: Date.now().toString(),
      title,
      body,
      category: 'wellness',
      time: 'Just now',
      timestamp: Date.now(),
      read: false,
      priority: 'high',
      targetScreen,
    };
    notifications = [newNotif, ...notifications];
    NotificationService.notifyListeners();

    // Trigger Real Web Desktop Push Notification if supported
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'granted') {
        new window.Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } else if (window.Notification.permission !== 'denied') {
        window.Notification.requestPermission().then((permission) => {
          if (permission === 'granted') {
            new window.Notification(title, {
              body,
              icon: '/favicon.ico',
            });
          }
        });
      }
    } else {
      // Trigger Native Mobile Push Notification (iOS/Android)
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { targetScreen },
          sound: true,
        },
        trigger: null, // null means trigger immediately
      });
    }
  },
};
