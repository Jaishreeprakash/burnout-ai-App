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
  navigation: StackNavigationProp<AuthStackParamList, 'Register'>;
};

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useTheme();
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
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        age: age && !isNaN(parseInt(age)) ? parseInt(age) : undefined,
        gender: gender || undefined,
      });
    } catch (error: any) {
      let msg = 'Unable to create account. Please try again.';
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        msg = detail.map((d: any) => (d.loc ? `${d.loc[d.loc.length - 1]}: ${d.msg}` : d.msg || String(d))).join('\n');
      } else if (error?.message) {
        msg = error.message;
      }
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.innerContainer}>
            {/* Header */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <TouchableOpacity
                testID="register-back-button"
                style={styles.backButton}
                onPress={() => step > 0 ? setStep(step - 1) : navigation.goBack()}
                accessibilityLabel="Go back"
                accessibilityRole="button"
              >
                <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
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

            {/* Form Card */}
            <NeumorphicView variant="raised" borderRadius={24} padding={24} style={styles.formCard}>
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
                    <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={[styles.inputCard, errors.password && styles.inputError]}>
                      <View style={styles.inputWrapper}>
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
                    </NeumorphicView>
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
                        const strengthColors = ['#FF5252', '#FFAB00', '#00B894', '#00B894'];
                        return (
                          <View
                            key={level}
                            style={[
                              styles.strengthBar,
                              { backgroundColor: strength ? strengthColors[level - 1] : colors.surfacePressed },
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
                      {GENDERS.map((g) => {
                        const isSelected = gender === g;
                        return (
                          <TouchableOpacity
                            key={g}
                            testID={`register-gender-option-${g.toLowerCase().replace(/[^a-z]+/g, '-')}`}
                            onPress={() => setGender(g === gender ? '' : g)}
                          >
                            <NeumorphicView
                              variant={isSelected ? 'pressed' : 'raised'}
                              borderRadius={12}
                              padding={10}
                              style={[styles.genderOption, isSelected && { backgroundColor: colors.primary + '1A' }]}
                            >
                              <Text style={[styles.genderOptionText, isSelected && { color: colors.primary, fontWeight: '700' }]}>
                                {g}
                              </Text>
                            </NeumorphicView>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.privacyNote}>
                    <MaterialCommunityIcons name="shield-check" size={16} color={colors.success} />
                    <Text style={styles.privacyText}>Your data is encrypted and never shared.</Text>
                  </View>
                </>
              )}

              {/* Action Button */}
              <NeumorphicButton
                testID={step < 2 ? 'register-continue-button' : 'register-submit-button'}
                title={isLoading ? 'Creating Account...' : step < 2 ? 'Continue' : 'Create Account'}
                icon="arrow-right"
                variant="primary"
                size="large"
                disabled={isLoading}
                onPress={step < 2 ? handleNext : handleRegister}
                style={{ marginTop: 12 }}
              />
            </NeumorphicView>

            {/* Login link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity testID="register-login-link" onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
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
    <NeumorphicView variant="pressed" borderRadius={14} padding={4} style={[styles.inputCard, error && styles.inputError]}>
      <View style={styles.inputWrapper}>
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
    </NeumorphicView>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
    innerContainer: { maxWidth: 480, alignSelf: 'center', width: '100%' },
    backButton: { marginBottom: 14, width: 40, height: 40, justifyContent: 'center' },
    headerTitle: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 4 },
    headerSubtitle: { fontSize: 13, color: colors.textMuted, marginBottom: 16, fontWeight: '500' },
    progressTrack: { height: 4, backgroundColor: colors.surfacePressed, borderRadius: 2, marginBottom: 16, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
    stepDots: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.surfacePressed, justifyContent: 'center', alignItems: 'center' },
    stepDotActive: { backgroundColor: colors.primary },
    stepDotCurrent: { backgroundColor: colors.primary },
    formCard: { marginBottom: 20 },
    fieldContainer: { marginBottom: 14 },
    fieldLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 6 },
    inputCard: {},
    inputWrapper: { flexDirection: 'row', alignItems: 'center' },
    inputError: { borderColor: colors.danger, borderWidth: 1 },
    inputIcon: { paddingLeft: 8, paddingRight: 6 },
    input: { flex: 1, height: 46, color: colors.text, fontSize: 15 },
    eyeButton: { position: 'absolute', right: 8, height: 46, justifyContent: 'center' },
    errorText: { color: colors.danger, fontSize: 12, marginTop: 4 },
    passwordStrength: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    strengthLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    strengthBars: { flexDirection: 'row', gap: 4, flex: 1 },
    strengthBar: { flex: 1, height: 4, borderRadius: 2 },
    genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    genderOption: {},
    genderOptionText: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
    privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.success + '1A', padding: 12, borderRadius: 12, marginBottom: 10 },
    privacyText: { fontSize: 12, color: colors.success, flex: 1, fontWeight: '600' },
    loginRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
    loginText: { color: colors.textMuted, fontSize: 14 },
    loginLink: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  });

export default RegisterScreen;
