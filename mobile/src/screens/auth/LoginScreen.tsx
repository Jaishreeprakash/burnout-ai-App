import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, demoLogin } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      Alert.alert('Missing Fields', 'Please enter your username/email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login({ username: cleanUsername, password });
    } catch (error: any) {
      let msg = 'Incorrect username/email or password.';
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d: any) => d.msg || String(d)).join('\n');
      } else if (error?.code === 'ERR_NETWORK' || error?.code === 'ECONNABORTED' || error?.message?.includes('Network Error')) {
        msg = 'Unable to connect to the backend server.\n\n• If using local backend: Ensure FastAPI is running (`cd backend && venv\\Scripts\\activate && uvicorn main:app --reload --port 8000`).\n• If using cloud backend: The server may be performing a cold start (takes ~30s). Please try logging in again.\n• Alternatively, tap "Explore Demo Mode" below.';
      } else if (error?.message) {
        msg = error.message;
      }
      Alert.alert('Login Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      await demoLogin();
    } catch (error) {
      Alert.alert('Error', 'Demo login failed. Please try again.');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Soft Neumorphic Background Ambient Orbs */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.innerContainer}>
            {/* Logo Section */}
            <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
              <NeumorphicView variant="raised" borderRadius={28} padding={16} style={styles.logoCard}>
                <View style={[styles.logoInner, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="brain" size={44} color="#fff" />
                </View>
              </NeumorphicView>
              <Text style={styles.appName}>BurnoutAI</Text>
              <Text style={styles.tagline}>Your AI Mental Wellness Companion</Text>
            </Animated.View>

            {/* Form Section Card */}
            <Animated.View
              style={[
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <NeumorphicView variant="raised" borderRadius={28} padding={24} style={styles.formCard}>
                <Text style={styles.formTitle}>Welcome Back</Text>
                <Text style={styles.formSubtitle}>Sign in to continue your wellness journey</Text>

                {/* Username input */}
                <NeumorphicView variant="pressed" borderRadius={16} padding={4} style={styles.inputCard}>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIcon}>
                      <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} />
                    </View>
                    <TextInput
                      testID="login-username-input"
                      style={styles.input}
                      placeholder="Username"
                      placeholderTextColor={colors.textMuted}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                    />
                  </View>
                </NeumorphicView>

                {/* Password input */}
                <NeumorphicView variant="pressed" borderRadius={16} padding={4} style={styles.inputCard}>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIcon}>
                      <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />
                    </View>
                    <TextInput
                      testID="login-password-input"
                      style={[styles.input, { paddingRight: 50 }]}
                      placeholder="Password"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                    />
                    <TouchableOpacity
                      testID="login-password-toggle"
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      accessibilityRole="button"
                    >
                      <MaterialCommunityIcons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </NeumorphicView>

                {/* Forgot Password Link */}
                <TouchableOpacity
                  testID="login-forgot-password-link"
                  onPress={() => navigation.navigate('ForgotPassword')}
                  style={styles.forgotPasswordWrapper}
                  activeOpacity={0.8}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Login Button */}
                <NeumorphicButton
                  testID="login-submit-button"
                  title={isLoading ? 'Signing In...' : 'Sign In'}
                  icon="arrow-right"
                  variant="primary"
                  size="large"
                  disabled={isLoading}
                  onPress={handleLogin}
                />

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Demo Button */}
                <NeumorphicButton
                  testID="login-demo-button"
                  title={isDemoLoading ? 'Loading Demo...' : 'Try Demo Mode'}
                  icon="play-circle-outline"
                  variant="raised"
                  size="large"
                  disabled={isDemoLoading}
                  onPress={handleDemoLogin}
                />

                {/* Register Link */}
                <View style={styles.registerRow}>
                  <Text style={styles.registerText}>Don't have an account? </Text>
                  <TouchableOpacity testID="login-register-link" onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerLink}>Sign up</Text>
                  </TouchableOpacity>
                </View>
              </NeumorphicView>
            </Animated.View>

            {/* Footer */}
            <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
              <Text style={styles.footerText}>Powered by AI • Built for your wellbeing</Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    decorCircle: {
      position: 'absolute',
      borderRadius: 999,
      opacity: 0.12,
    },
    decorCircle1: {
      width: 320,
      height: 320,
      backgroundColor: colors.primary,
      top: -100,
      right: -100,
    },
    decorCircle2: {
      width: 240,
      height: 240,
      backgroundColor: colors.primaryLight,
      bottom: 60,
      left: -80,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 24,
      justifyContent: 'center',
    },
    innerContainer: {
      maxWidth: 480,
      alignSelf: 'center',
      width: '100%',
    },
    logoSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoCard: {
      marginBottom: 16,
    },
    logoInner: {
      width: 68,
      height: 68,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appName: {
      fontSize: 34,
      fontWeight: '900',
      color: colors.text,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    tagline: {
      fontSize: 14,
      color: colors.textMuted,
      textAlign: 'center',
      fontWeight: '500',
    },
    formCard: {
      marginBottom: 16,
    },
    formTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    formSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 22,
      fontWeight: '500',
    },
    inputCard: {
      marginBottom: 14,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    inputIcon: {
      paddingLeft: 8,
      paddingRight: 6,
    },
    input: {
      flex: 1,
      height: 46,
      color: colors.text,
      fontSize: 15,
    },
    eyeButton: {
      position: 'absolute',
      right: 8,
      height: 46,
      justifyContent: 'center',
    },
    forgotPasswordWrapper: {
      alignSelf: 'flex-end',
      marginBottom: 18,
      marginTop: 2,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 18,
      gap: 12,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.borderLight,
    },
    dividerText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    registerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 18,
    },
    registerText: {
      color: colors.textMuted,
      fontSize: 14,
    },
    registerLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
    },
    footer: {
      alignItems: 'center',
      marginTop: 24,
    },
    footerText: {
      color: colors.textDim,
      fontSize: 12,
      fontWeight: '500',
    },
  });

export default LoginScreen;
