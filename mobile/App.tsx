import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import LoadingScreen from './src/components/LoadingScreen';

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

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer linking={linking}>
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
