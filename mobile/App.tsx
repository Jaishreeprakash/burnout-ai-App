import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform, LogBox } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import LoadingScreen from './src/components/LoadingScreen';

// Filter React DOM dev warnings for third-party SVG touch responder properties on Web
if (Platform.OS === 'web' && typeof console !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.join(' ');
    if (
      msg.includes('Unknown event handler property') ||
      msg.includes('TouchableMixin is deprecated')
    ) {
      return;
    }
    originalError(...args);
  };

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const msg = args.join(' ');
    if (
      msg.includes('Unknown event handler property') ||
      msg.includes('TouchableMixin is deprecated') ||
      msg.includes('props.pointerEvents is deprecated')
    ) {
      return;
    }
    originalWarn(...args);
  };
}

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  '`shouldShowAlert` is deprecated',
]);

SplashScreen.preventAutoHideAsync();

const linking = {
  prefixes: ['burnoutai://'],
  config: {
    screens: {
      // Auth stack (mounted when logged out)
      Login: 'login',
      Register: 'register',
      ForgotPassword: 'forgot-password',
      // App stack (mounted when logged in)
      MainTabs: {
        path: 'main',
        screens: {
          Dashboard: 'dashboard',
          Sleep: 'sleep',
          Emotion: 'emotion',
          Activity: 'activity',
          Profile: 'profile',
        },
      },
      Analytics: 'analytics',
      Recommendations: 'recommendations',
      PhoneUsage: 'phone-usage',
    },
  },
};

const RootNavigation: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { colors, scheme } = useTheme();

  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  useEffect(() => {
    // Listen for when a user taps a Push Notification
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const targetScreen = response.notification.request.content.data?.targetScreen as string | undefined;
      if (targetScreen && navigationRef.isReady()) {
        const nav = navigationRef as any;
        if (['Dashboard', 'Sleep', 'Emotion', 'Activity', 'Profile'].includes(targetScreen)) {
          nav.navigate('MainTabs' as any, { screen: targetScreen } as any);
        } else {
          nav.navigate(targetScreen as any);
        }
      }
    });
    return () => subscription.remove();
  }, [navigationRef]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer linking={linking} ref={navigationRef}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} backgroundColor={colors.background} />
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootNavigation />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
