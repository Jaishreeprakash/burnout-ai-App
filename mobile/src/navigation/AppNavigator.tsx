import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TabNavigator from './TabNavigator';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import RecommendationsScreen from '../screens/main/RecommendationsScreen';
import PhoneUsageScreen from '../screens/main/PhoneUsageScreen';
import { useTheme } from '../context/ThemeContext';

export type AppStackParamList = {
  MainTabs: undefined;
  Analytics: undefined;
  Recommendations: undefined;
  PhoneUsage: undefined;
};

const Stack = createStackNavigator<AppStackParamList>();

const AppNavigator: React.FC = () => {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
        presentation: 'modal',
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitle: 'Analytics',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitle: 'AI Recommendations',
          headerBackTitleVisible: false,
        }}
      />
      <Stack.Screen
        name="PhoneUsage"
        component={PhoneUsageScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitle: 'Phone Usage',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
