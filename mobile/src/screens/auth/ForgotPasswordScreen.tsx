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
import NeumorphicView from '../../components/NeumorphicView';
import NeumorphicButton from '../../components/NeumorphicButton';
import { ThemeColors } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { authApi } from '../../services/api';

type Props = {
  navigation: StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
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
      {/* Background decoration orbs */}
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
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
            </TouchableOpacity>
            <NeumorphicView variant="raised" borderRadius={24} padding={16} style={styles.logoCard}>
              <View style={[styles.logoInner, { backgroundColor: colors.primary }]}>
                <MaterialCommunityIcons name="lock-reset" size={40} color="#fff" />
              </View>
            </NeumorphicView>
            <Text style={styles.appName}>Reset Password</Text>
            <Text style={styles.tagline}>Create a new secure password for your account</Text>
          </Animated.View>

          {/* Form Section */}
          <Animated.View
            style={[
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <NeumorphicView variant="raised" borderRadius={28} padding={24} style={styles.formCard}>
              <Text style={styles.formTitle}>Enter New Password</Text>
              <Text style={styles.formSubtitle}>Update your password to log back in</Text>

              {/* Email/Username input */}
              <NeumorphicView variant="pressed" borderRadius={16} padding={4} style={styles.inputCard}>
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
              </NeumorphicView>

              {/* New Password input */}
              <NeumorphicView variant="pressed" borderRadius={16} padding={4} style={styles.inputCard}>
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
              </NeumorphicView>

              {/* Confirm Password input */}
              <NeumorphicView variant="pressed" borderRadius={16} padding={4} style={styles.inputCard}>
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
              </NeumorphicView>

              {/* Reset Button */}
              <NeumorphicButton
                testID="forgot-password-submit-button"
                title={isLoading ? 'Resetting...' : 'Reset Password'}
                icon="check"
                variant="primary"
                size="large"
                disabled={isLoading}
                onPress={handleResetPassword}
                style={{ marginTop: 10 }}
              />

              {/* Back to Login link */}
              <TouchableOpacity
                testID="forgot-password-back-to-login-link"
                onPress={() => navigation.navigate('Login')}
                style={styles.backToLoginRow}
              >
                <Text style={styles.backToLoginLink}>Back to Sign In</Text>
              </TouchableOpacity>
            </NeumorphicView>
          </Animated.View>
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
      maxWidth: 480,
      alignSelf: 'center',
      width: '100%',
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
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    logoCard: {
      marginTop: 10,
      marginBottom: 16,
    },
    logoInner: {
      width: 60,
      height: 60,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    appName: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    tagline: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: 10,
      fontWeight: '500',
    },
    formCard: {},
    formTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
    },
    formSubtitle: {
      fontSize: 13,
      color: colors.textMuted,
      marginBottom: 20,
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
    backToLoginRow: {
      alignItems: 'center',
      marginTop: 18,
    },
    backToLoginLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '800',
    },
  });

export default ForgotPasswordScreen;
