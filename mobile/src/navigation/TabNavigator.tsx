import React, { useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/main/DashboardScreen';
import SleepScreen from '../screens/main/SleepScreen';
import EmotionScreen from '../screens/main/EmotionScreen';
import ActivityScreen from '../screens/main/ActivityScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { ThemeColors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';

export type TabParamList = {
  Dashboard: undefined;
  Sleep: undefined;
  Emotion: undefined;
  Activity: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -2,
        },
        tabBarAllowFontScaling: false,
        tabBarIcon: ({ color, focused, size }) => {
          const iconMap: Record<string, string> = {
            Dashboard: focused ? 'view-dashboard' : 'view-dashboard-outline',
            Sleep: focused ? 'moon-waning-crescent' : 'moon-waning-crescent',
            Emotion: focused ? 'heart' : 'heart-outline',
            Activity: focused ? 'lightning-bolt' : 'lightning-bolt-outline',
            Profile: focused ? 'account-circle' : 'account-circle-outline',
          };

          const iconName = iconMap[route.name] || 'circle';

          if (route.name === 'Emotion') {
            return (
              <View style={[styles.centerIcon, { backgroundColor: focused ? colors.primary : colors.surfaceLight }]}>
                <MaterialCommunityIcons
                  name={iconName as any}
                  size={26}
                  color={focused ? '#fff' : colors.textMuted}
                />
              </View>
            );
          }

          return (
            <MaterialCommunityIcons name={iconName as any} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Sleep" component={SleepScreen} />
      <Tab.Screen
        name="Emotion"
        component={EmotionScreen}
        options={{
          tabBarLabel: 'Emotion',
        }}
      />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  centerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default TabNavigator;
