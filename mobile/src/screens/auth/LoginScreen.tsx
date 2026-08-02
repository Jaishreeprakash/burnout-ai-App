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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, demoLogin } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
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
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your username/email and password.');
      return;
    }
    setIsLoading(true);
    try {
      await login({ username: username.trim(), password });
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Incorrect username/email or password.';
      Alert.alert('Login Failed', msg);
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
      <LinearGradient
        colors={['#1e1b4b', '#0f172a', '#0f172a']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Background decoration circles */}
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
          {/* Logo Section */}
          <Animated.View style={[styles.logoSection, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoContainer}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.logoGradient}>
                <MaterialCommunityIcons name="brain" size={48} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>BurnoutAI</Text>
            <Text style={styles.tagline}>Your AI Mental Wellness Companion</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View
            style={[
              styles.formCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.formTitle}>Welcome back</Text>
            <Text style={styles.formSubtitle}>Sign in to continue your wellness journey</Text>

            {/* Username input */}
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

            {/* Password input */}
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
            <TouchableOpacity
              testID="login-submit-button"
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              style={styles.loginButtonWrapper}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Demo Button */}
            <TouchableOpacity
              testID="login-demo-button"
              style={styles.demoButton}
              onPress={handleDemoLogin}
              disabled={isDemoLoading}
              activeOpacity={0.8}
            >
              {isDemoLoading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="play-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.demoButtonText}>Try Demo Mode</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity testID="login-register-link" onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
            <Text style={styles.footerText}>Powered by AI • Built for your wellbeing</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.07,
  },
  decorCircle1: {
    width: 300,
    height: 300,
    backgroundColor: colors.primary,
    top: -80,
    right: -80,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    backgroundColor: colors.primaryLight,
    bottom: 100,
    left: -60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    width: 90,
    height: 90,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    // Pinned (not theme-driven): sits on the fixed dark hero gradient above, not the themed surface.
    color: '#f1f5f9',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    // Pinned (not theme-driven): sits on the fixed dark hero gradient above, not the themed surface.
    color: '#94a3b8',
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 28,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  inputIcon: {
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    height: 52,
    color: colors.text,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    height: 52,
    justifyContent: 'center',
  },
  forgotPasswordWrapper: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButtonWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButton: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  demoButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: 8,
    marginBottom: 20,
  },
  demoButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  registerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    // Pinned (not theme-driven): sits on the fixed dark hero gradient, not the themed surface.
    color: '#64748b',
    fontSize: 12,
  },
});

export default LoginScreen;
