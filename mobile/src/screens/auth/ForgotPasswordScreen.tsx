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
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authApi } from '../../services/api';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedEmail || !trimmedPassword || !trimmedConfirm) {
      Alert.alert('Missing Fields', 'Please fill in all the fields.');
      return;
    }

    if (trimmedPassword.length < 6) {
      Alert.alert('Invalid Password', 'Your new password must be at least 6 characters long.');
      return;
    }

    if (trimmedPassword !== trimmedConfirm) {
      Alert.alert('Password Mismatch', 'New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.resetPassword({
        email: trimmedEmail,
        new_password: trimmedPassword,
      });
      Alert.alert(
        'Success',
        response.message || 'Your password has been reset successfully. Please sign in with your new password.',
        [
          {
            text: 'Sign In',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Could not reset your password. Please verify your email/username.';
      Alert.alert('Reset Failed', msg);
    } finally {
      setIsLoading(false);
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
          {/* Header Section */}
          <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
            <TouchableOpacity
              testID="forgot-password-back-button"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.8}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#f1f5f9" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.logoGradient}>
                <MaterialCommunityIcons name="lock-reset" size={40} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>Reset Password</Text>
            <Text style={styles.tagline}>Create a new secure password for your account</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View
            style={[
              styles.formCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.formTitle}>Enter new password</Text>
            <Text style={styles.formSubtitle}>Update your password to log back in</Text>

            {/* Email/Username input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <MaterialCommunityIcons name="account-outline" size={20} color={colors.textMuted} />
              </View>
              <TextInput
                testID="forgot-password-email-input"
                style={styles.input}
                placeholder="Username or Email"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* New Password input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />
              </View>
              <TextInput
                testID="forgot-password-new-password-input"
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="New Password"
                placeholderTextColor={colors.textMuted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <TouchableOpacity
                testID="forgot-password-new-password-toggle"
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

            {/* Confirm Password input */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <MaterialCommunityIcons name="lock-check-outline" size={20} color={colors.textMuted} />
              </View>
              <TextInput
                testID="forgot-password-confirm-password-input"
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                returnKeyType="done"
                onSubmitEditing={handleResetPassword}
              />
              <TouchableOpacity
                testID="forgot-password-confirm-password-toggle"
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
                accessibilityRole="button"
              >
                <MaterialCommunityIcons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              testID="forgot-password-submit-button"
              onPress={handleResetPassword}
              disabled={isLoading}
              activeOpacity={0.85}
              style={styles.resetButtonWrapper}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.resetButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.resetButtonText}>Reset Password</Text>
                    <MaterialCommunityIcons name="check" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Back to Login link */}
            <TouchableOpacity
              testID="forgot-password-back-to-login-link"
              onPress={() => navigation.navigate('Login')}
              style={styles.backToLoginRow}
            >
              <Text style={styles.backToLoginLink}>Back to Sign In</Text>
            </TouchableOpacity>
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoContainer: {
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    marginTop: 20,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // appName/tagline are pinned (not theme-driven): they sit on the fixed dark hero gradient, not the themed surface.
  appName: {
    fontSize: 30,
    fontWeight: '900',
    color: '#f1f5f9',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
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
  resetButtonWrapper: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  resetButton: {
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  backToLoginRow: {
    alignItems: 'center',
    marginTop: 20,
  },
  backToLoginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;
