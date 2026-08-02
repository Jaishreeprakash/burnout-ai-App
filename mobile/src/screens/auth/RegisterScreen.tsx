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
  navigation: StackNavigationProp<AuthStackParamList, 'Register'>;
};

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / 3,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [step]);

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 0) {
      if (!fullName.trim()) newErrors.fullName = 'Full name is required';
      if (!username.trim() || username.length < 3) newErrors.username = 'Username must be at least 3 characters';
      if (!email.trim() || !email.includes('@')) newErrors.email = 'Valid email is required';
    } else if (currentStep === 1) {
      if (!password || password.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleRegister = async () => {
    if (!validateStep(step)) return;

    setIsLoading(true);
    try {
      await register({
        full_name: fullName,
        username,
        email,
        password,
        age: age ? parseInt(age) : undefined,
        gender: gender || undefined,
      });
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Unable to create account. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const stepTitles = ['Personal Info', 'Security', 'About You'];
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1e1b4b', '#0f172a', '#0f172a']}
        style={StyleSheet.absoluteFillObject}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <TouchableOpacity
              testID="register-back-button"
              style={styles.backButton}
              onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="arrow-left" size={24} color="#f1f5f9" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>Step {step + 1} of 3: {stepTitles[step]}</Text>

            {/* Progress Bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
              {[0, 1, 2].map((s) => (
                <View
                  key={s}
                  style={[
                    styles.stepDot,
                    s <= step && styles.stepDotActive,
                    s === step && styles.stepDotCurrent,
                  ]}
                >
                  {s < step && (
                    <MaterialCommunityIcons name="check" size={12} color="#fff" />
                  )}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Form */}
          <View style={styles.formCard}>
            {step === 0 && (
              <>
                <InputField
                  testID="register-fullname-input"
                  label="Full Name"
                  icon="account-outline"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Alex Johnson"
                  error={errors.fullName}
                  colors={colors}
                  styles={styles}
                />
                <InputField
                  testID="register-username-input"
                  label="Username"
                  icon="at"
                  value={username}
                  onChangeText={setUsername}
                  placeholder="alexj28"
                  autoCapitalize="none"
                  error={errors.username}
                  colors={colors}
                  styles={styles}
                />
                <InputField
                  testID="register-email-input"
                  label="Email Address"
                  icon="email-outline"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="alex@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                  colors={colors}
                  styles={styles}
                />
              </>
            )}

            {step === 1 && (
              <>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                    <View style={styles.inputIcon}>
                      <MaterialCommunityIcons name="lock-outline" size={20} color={colors.textMuted} />
                    </View>
                    <TextInput
                      testID="register-password-input"
                      style={[styles.input, { paddingRight: 50 }]}
                      placeholder="Min 8 characters"
                      placeholderTextColor={colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      testID="register-password-toggle"
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
                  {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                </View>

                <InputField
                  testID="register-confirm-password-input"
                  label="Confirm Password"
                  icon="lock-check-outline"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter password"
                  secureTextEntry
                  error={errors.confirmPassword}
                  colors={colors}
                  styles={styles}
                />

                <View style={styles.passwordStrength}>
                  <Text style={styles.strengthLabel}>Password strength:</Text>
                  <View style={styles.strengthBars}>
                    {[1, 2, 3, 4].map((level) => {
                      const strength = password.length >= level * 2 ? 1 : 0;
                      const strengthColors = ['#ef4444', '#f59e0b', '#22c55e', '#22c55e'];
                      return (
                        <View
                          key={level}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: strength ? strengthColors[level - 1] : colors.surfaceLight },
                          ]}
                        />
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <InputField
                  testID="register-age-input"
                  label="Age (optional)"
                  icon="cake-variant-outline"
                  value={age}
                  onChangeText={setAge}
                  placeholder="28"
                  keyboardType="number-pad"
                  colors={colors}
                  styles={styles}
                />

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Gender (optional)</Text>
                  <View style={styles.genderGrid}>
                    {GENDERS.map((g) => (
                      <TouchableOpacity
                        key={g}
                        testID={`register-gender-option-${g.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                        style={[
                          styles.genderOption,
                          gender === g && styles.genderOptionActive,
                        ]}
                        onPress={() => setGender(g === gender ? '' : g)}
                      >
                        <Text style={[
                          styles.genderOptionText,
                          gender === g && styles.genderOptionTextActive,
                        ]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.privacyNote}>
                  <MaterialCommunityIcons name="shield-check" size={16} color={colors.success} />
                  <Text style={styles.privacyText}>Your data is encrypted and never shared.</Text>
                </View>
              </>
            )}

            {/* Action Button */}
            <TouchableOpacity
              testID={step < 2 ? 'register-continue-button' : 'register-submit-button'}
              onPress={step < 2 ? handleNext : handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
              style={styles.actionButtonWrapper}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionButtonText}>
                      {step < 2 ? 'Continue' : 'Create Account'}
                    </Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity testID="register-login-link" onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

interface InputFieldProps {
  label: string;
  icon: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  error?: string;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  testID?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label, icon, value, onChangeText, placeholder, keyboardType, autoCapitalize, secureTextEntry, error, colors, styles, testID
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <View style={[styles.inputWrapper, error && styles.inputError]}>
      <View style={styles.inputIcon}>
        <MaterialCommunityIcons name={icon as any} size={20} color={colors.textMuted} />
      </View>
      <TextInput
        testID={testID}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize || 'words'}
        secureTextEntry={secureTextEntry}
      />
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { marginBottom: 16, width: 40, height: 40, justifyContent: 'center' },
  // headerTitle/headerSubtitle are pinned (not theme-driven): they sit on the fixed dark hero gradient, not the themed surface.
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  progressTrack: { height: 4, backgroundColor: colors.surfaceLight, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  stepDots: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  stepDotActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepDotCurrent: { borderColor: colors.primaryLight, backgroundColor: colors.primary + '80' },
  formCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  inputError: { borderColor: colors.danger },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, height: 50, color: colors.text, fontSize: 15 },
  eyeButton: { position: 'absolute', right: 14, height: 50, justifyContent: 'center' },
  errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
  passwordStrength: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  strengthLabel: { fontSize: 12, color: colors.textMuted },
  strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  genderOptionActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  genderOptionText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  genderOptionTextActive: { color: colors.primary, fontWeight: '700' },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '11', padding: 12, borderRadius: 10 },
  privacyText: { fontSize: 13, color: colors.success, flex: 1 },
  actionButtonWrapper: { marginTop: 8, borderRadius: 14, overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  actionButton: { height: 54, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  actionButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  // Pinned (not theme-driven): sits on the fixed dark hero gradient, not the themed surface.
  loginText: { color: '#94a3b8', fontSize: 14 },
  loginLink: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});

export default RegisterScreen;
