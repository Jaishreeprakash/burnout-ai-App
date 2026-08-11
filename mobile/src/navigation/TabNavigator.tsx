import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import DashboardScreen from '../screens/main/DashboardScreen';
import SleepScreen from '../screens/main/SleepScreen';
import EmotionScreen from '../screens/main/EmotionScreen';
import ActivityScreen from '../screens/main/ActivityScreen';
import ChatScreen from '../screens/main/ChatScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import NeumorphicView from '../components/NeumorphicView';
import { ThemeColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

export type TabParamList = {
  Dashboard: undefined;
  Sleep: undefined;
  Emotion: undefined;
  Activity: undefined;
  Chat: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_CONFIG: Record<string, { label: string; activeIcon: string; inactiveIcon: string }> = {
  Dashboard: { label: 'Home', activeIcon: 'view-dashboard', inactiveIcon: 'view-dashboard-outline' },
  Sleep: { label: 'Sleep', activeIcon: 'moon-waning-crescent', inactiveIcon: 'moon-waning-crescent' },
  Emotion: { label: 'Emotion', activeIcon: 'heart', inactiveIcon: 'heart-outline' },
  Activity: { label: 'Activity', activeIcon: 'lightning-bolt', inactiveIcon: 'lightning-bolt-outline' },
  Chat: { label: 'Coach', activeIcon: 'chat-processing', inactiveIcon: 'chat-processing-outline' },
  Profile: { label: 'Profile', activeIcon: 'account-circle', inactiveIcon: 'account-circle-outline' },
};

const ResponsiveTabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const isDesktop = width >= 768;
  const isLight = scheme === 'light';

  const styles = useMemo(() => createStyles(colors, isLight, isDesktop, insets.bottom), [
    colors,
    isLight,
    isDesktop,
    insets.bottom,
  ]);

  if (isDesktop) {
    // ── DESKTOP SIDEBAR NAVIGATION BAR ─────────────────────────────────────────
    return (
      <View style={styles.sidebarContainer}>
        {/* Brand Header */}
        <View style={styles.sidebarHeader}>
          <NeumorphicView variant="raised" borderRadius={16} padding={10} style={styles.logoBadge}>
            <MaterialCommunityIcons name="brain" size={24} color={colors.primary} />
          </NeumorphicView>
          <View style={styles.brandTextContainer}>
            <Text style={styles.brandTitle}>BurnoutAI</Text>
            <Text style={styles.brandSubtitle}>Wellness Studio</Text>
          </View>
        </View>

        {/* Navigation Items */}
        <View style={styles.sidebarNavList}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const config = TAB_CONFIG[route.name] || {
              label: route.name,
              activeIcon: 'circle',
              inactiveIcon: 'circle-outline',
            };

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                Haptics.selectionAsync();
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.8}
                style={styles.sidebarItemWrapper}
              >
                <NeumorphicView
                  variant={isFocused ? 'pressed' : 'flat'}
                  borderRadius={16}
                  padding={12}
                  style={[
                    styles.sidebarItem,
                    isFocused && { backgroundColor: colors.primary + '1A', borderColor: colors.primary + '40' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={(isFocused ? config.activeIcon : config.inactiveIcon) as any}
                    size={22}
                    color={isFocused ? colors.primary : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.sidebarItemLabel,
                      isFocused && { color: colors.primary, fontWeight: '800' },
                    ]}
                  >
                    {config.label}
                  </Text>
                  {isFocused && (
                    <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
                  )}
                </NeumorphicView>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.sidebarFooter}>
          <Text style={styles.footerText}>BurnoutAI • v1.0</Text>
        </View>
      </View>
    );
  }

  // ── MOBILE BOTTOM NAVIGATION BAR ───────────────────────────────────────────
  return (
    <View style={styles.mobileBarContainer}>
      <NeumorphicView variant="raised" borderRadius={24} padding={4} style={styles.mobileBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] || {
            label: route.name,
            activeIcon: 'circle',
            inactiveIcon: 'circle-outline',
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name);
            }
          };



          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={styles.tabItem}>
              <MaterialCommunityIcons
                name={(isFocused ? config.activeIcon : config.inactiveIcon) as any}
                size={22}
                color={isFocused ? colors.primary : colors.textDim}
              />
              <Text style={[styles.tabLabel, isFocused && { color: colors.primary, fontWeight: '800' }]}>
                {config.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </NeumorphicView>
    </View>
  );
};

const TabNavigator: React.FC = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        tabBar={(props) => <ResponsiveTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          sceneStyle: isDesktop ? { paddingLeft: 240 } : undefined,
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
        <Tab.Screen name="Sleep" component={SleepScreen} />
        <Tab.Screen name="Emotion" component={EmotionScreen} options={{ tabBarLabel: 'Emotion' }} />
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Chat" component={ChatScreen} options={{ title: 'Coach' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </View>
  );
};

const createStyles = (
  colors: ThemeColors,
  isLight: boolean,
  isDesktop: boolean,
  bottomInset: number
) =>
  StyleSheet.create({
    navigatorWrapper: {
      flex: 1,
    },
    // Desktop Sidebar Styles
    sidebarContainer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      width: 240,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.borderLight,
      paddingHorizontal: 16,
      paddingTop: 24,
      paddingBottom: 20,
      justifyContent: 'space-between',
      zIndex: 100,
      shadowColor: isLight ? colors.shadowDark : '#000000',
      shadowOffset: { width: 4, height: 0 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 12,
    },
    sidebarHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 32,
      paddingHorizontal: 4,
    },
    logoBadge: {},
    brandTextContainer: {},
    brandTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5,
    },
    brandSubtitle: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    sidebarNavList: {
      flex: 1,
      gap: 8,
    },
    sidebarItemWrapper: {
      width: '100%',
    },
    sidebarItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      position: 'relative',
    },
    sidebarItemLabel: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '600',
      flex: 1,
    },
    activeIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    sidebarFooter: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
      alignItems: 'center',
    },
    footerText: {
      fontSize: 11,
      color: colors.textDim,
      fontWeight: '600',
    },

    mobileBarContainer: {
      position: 'absolute',
      bottom: Math.max(bottomInset, 8),
      left: 8,
      right: 8,
      alignItems: 'center',
    },
    mobileBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      width: '100%',
      maxWidth: 500,
      height: 64,
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 4,
    },
    tabLabel: {
      fontSize: 9,
      color: colors.textDim,
      fontWeight: '600',
      marginTop: 2,
    },
  });

export default TabNavigator;
