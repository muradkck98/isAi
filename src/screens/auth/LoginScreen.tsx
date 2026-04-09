import React, { useState, memo, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, Modal, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

WebBrowser.maybeCompleteAuthSession();

import { Screen } from '../../components/layout/Screen';
import { TextField } from '../../components/ui/TextField';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Button } from '../../components/ui/Button';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { LogoMark } from '../../components/ui/LogoMark';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { supabase } from '../../lib/supabase';
import { haptic } from '../../utils/haptics';
import { monitoring, Events } from '../../lib/monitoring';
import { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

// ─── Schemas (outside component — stable across renders) ──────────────────────
type LoginForm    = { email: string; password: string };
type RegisterForm = { email: string; password: string; phone: string };

const loginSchema = z.object({
  email:    z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email:    z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password is too long'),
  phone:    z.string()
    .min(1, 'Phone number is required')
    .regex(/^\+\d{7,15}$/, 'Please select a country and enter your number'),
});

// ─── Register Form (isolated component — re-renders don't affect parent) ──────
interface RegisterFormProps {
  onSubmit: (data: RegisterForm) => Promise<void>;
  isLoading: boolean;
}

const RegisterFormFields = memo(({ onSubmit, isLoading }: RegisterFormProps) => {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { control, handleSubmit, formState: { errors }, watch } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', phone: '' },
    mode: 'onBlur', // validate on blur, not on every keystroke
  });

  const password = watch('password', '');
  const passwordStrength = password.length === 0 ? null
    : password.length < 6  ? 'weak'
    : password.length < 10 ? 'fair'
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'strong'
    : 'good';

  const strengthColor = {
    weak:   '#EF4444',
    fair:   '#F59E0B',
    good:   '#3B82F6',
    strong: '#10B981',
  };
  const strengthLabel = {
    weak:   'Weak',
    fair:   'Fair',
    good:   'Good',
    strong: 'Strong',
  };

  return (
    <>
      {/* Email */}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t.auth.email}
            placeholder={t.auth.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
          />
        )}
      />

      {/* Phone with country picker */}
      <Controller
        control={control}
        name="phone"
        render={({ field: { onChange, value } }) => (
          <PhoneInput
            label={t.auth.phone}
            value={value}
            onChangeText={onChange}
            error={errors.phone?.message}
          />
        )}
      />

      {/* Password */}
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <View>
            <TextField
              label={t.auth.password}
              placeholder={t.auth.passwordPlaceholder}
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="done"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
            {/* Password strength bar */}
            {passwordStrength && (
              <View style={formStyles.strengthRow}>
                <View style={formStyles.strengthBars}>
                  {(['weak', 'fair', 'good', 'strong'] as const).map((level, i) => {
                    const levels = { weak: 1, fair: 2, good: 3, strong: 4 };
                    const active = levels[passwordStrength] > i;
                    return (
                      <View
                        key={level}
                        style={[
                          formStyles.strengthBar,
                          { backgroundColor: active ? strengthColor[passwordStrength] : '#E5E7EB' },
                        ]}
                      />
                    );
                  })}
                </View>
                <Text style={[formStyles.strengthLabel, { color: strengthColor[passwordStrength] }]}>
                  {strengthLabel[passwordStrength]}
                </Text>
              </View>
            )}
          </View>
        )}
      />

      {/* Info box */}
      <View style={[formStyles.infoBox, { backgroundColor: c.primary[50] }]}>
        <Ionicons name="shield-checkmark-outline" size={16} color={c.primary[500]} />
        <Text style={[formStyles.infoText, { color: c.primary[600] }]}>
          {t.auth.otpInfoText}
        </Text>
      </View>

      <Button
        title={t.auth.signUp}
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        size="lg"
      />
    </>
  );
});

const formStyles = StyleSheet.create({
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  infoText: { ...typography.caption, flex: 1, lineHeight: 18 },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
  strengthBars: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    ...typography.caption,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
});

// ─── Login Form (isolated component) ─────────────────────────────────────────
interface LoginFormProps {
  onSubmit: (data: LoginForm) => Promise<void>;
  isLoading: boolean;
  onForgotPassword: () => void;
}

const LoginFormFields = memo(({ onSubmit, isLoading, onForgotPassword }: LoginFormProps) => {
  const { t } = useTranslation();
  const c = useThemeColors();
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  return (
    <>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t.auth.email}
            placeholder={t.auth.emailPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="next"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label={t.auth.password}
            placeholder={t.auth.passwordPlaceholder}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
          />
        )}
      />
      <TouchableOpacity style={loginStyles.forgotPassword} onPress={onForgotPassword}>
        <Text style={[loginStyles.forgotText, { color: c.primary[500] }]}>
          {t.auth.forgotPassword}
        </Text>
      </TouchableOpacity>
      <Button
        title={t.auth.signIn}
        onPress={handleSubmit(onSubmit)}
        loading={isLoading}
        disabled={isLoading}
        size="lg"
      />
    </>
  );
});

const loginStyles = StyleSheet.create({
  forgotPassword: { alignSelf: 'flex-end', marginTop: spacing.xs, marginBottom: spacing.sm },
  forgotText: { ...typography.bodySm, fontWeight: '500' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export function LoginScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  const [isRegister, setIsRegister] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const login     = useAuthStore((s) => s.login);
  const register  = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setError  = useAuthStore((s) => s.setError);
  const syncFromSupabase = useWalletStore((s) => s.syncFromSupabase);

  const anyLoading = isLoading || googleLoading;

  // ─── Forgot password ────────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    const email = resetEmail.trim();
    if (!email) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setShowForgotPassword(false);
      setResetEmail('');
      Alert.alert(t.auth.resetLinkSent, t.auth.resetLinkBody);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t.auth.resetFailed;
      Alert.alert(t.auth.resetError, msg);
    } finally {
      setResetLoading(false);
    }
  };

  const openForgotPassword = useCallback(() => {
    haptic.light();
    setResetEmail('');
    setShowForgotPassword(true);
  }, []);

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    haptic.light();
    monitoring.track(Events.GOOGLE_LOGIN_START);
    try {
      const redirectUrl = Linking.createURL('auth/callback');
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('Google OAuth URL alınamadı');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
        showInRecents: true,
        preferEphemeralSession: false,
      });

      if (result.type === 'success' && result.url) {
        const raw = result.url;
        const hashIndex  = raw.indexOf('#');
        const queryIndex = raw.indexOf('?');
        let paramStr = '';
        if (hashIndex !== -1)       paramStr = raw.slice(hashIndex + 1);
        else if (queryIndex !== -1) paramStr = raw.slice(queryIndex + 1);

        const params       = new URLSearchParams(paramStr);
        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          monitoring.track(Events.GOOGLE_LOGIN_SUCCESS);
        } else {
          const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
          if (sessionError) throw sessionError;
        }

        const userId = useAuthStore.getState().user?.id;
        if (userId) {
          monitoring.identify(userId);
          syncFromSupabase(userId).catch(() => {});
        }
        haptic.success();
      }
    } catch (err: unknown) {
      haptic.error();
      const msg = err instanceof Error ? err.message : t.auth.googleFailed;
      Alert.alert(t.auth.googleError, msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Submit handlers ─────────────────────────────────────────────────────────
  const onLoginSubmit = useCallback(async (data: LoginForm) => {
    setError(null);
    try {
      await login(data.email, data.password);
      const userId = useAuthStore.getState().user?.id;
      if (userId) syncFromSupabase(userId).catch(() => {});
      haptic.success();
    } catch (err: unknown) {
      haptic.error();
      const msg = err instanceof Error ? err.message : t.auth.loginFailed;
      Alert.alert(t.auth.loginError, msg);
    }
  }, [login, setError, syncFromSupabase, t]);

  const onRegisterSubmit = useCallback(async (data: RegisterForm) => {
    setError(null);
    try {
      await register(data.email, data.password, data.phone);
      haptic.success();
      // Use setTimeout to ensure navigation happens after state updates settle
      setTimeout(() => {
        navigation.navigate('OTPVerify', { email: data.email });
      }, 100);
    } catch (err: unknown) {
      haptic.error();
      const msg = err instanceof Error ? err.message : t.auth.registerFailed;
      Alert.alert(t.auth.registerError, msg);
    }
  }, [register, setError, navigation, t]);

  const switchMode = () => {
    haptic.selection();
    setIsRegister((v) => !v);
    setError(null);
  };

  return (
    <Screen scrollable keyboardAware backgroundColor={c.background.primary}>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.header}>
          <LogoMark size={80} />
          <Text style={[styles.title, { color: c.neutral[900] }]}>
            {isRegister ? t.auth.createAccount : t.auth.welcomeBack}
          </Text>
          <Text style={[styles.subtitle, { color: c.neutral[500] }]}>
            {isRegister ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
          </Text>
        </Animated.View>

        {/* Form — isolated components prevent parent re-renders from clearing inputs */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.form}>
          {isRegister ? (
            <RegisterFormFields
              onSubmit={onRegisterSubmit}
              isLoading={isLoading}
            />
          ) : (
            <LoginFormFields
              onSubmit={onLoginSubmit}
              isLoading={isLoading}
              onForgotPassword={openForgotPassword}
            />
          )}
        </Animated.View>

        {/* Divider + Google + Switch */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.actions}>
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.neutral[200] }]} />
            <Text style={[styles.dividerText, { color: c.neutral[400] }]}>{t.common.or}</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.neutral[200] }]} />
          </View>

          <TouchableOpacity
            style={[styles.googleBtn, {
              borderColor: c.neutral[300],
              backgroundColor: c.neutral[50],
              opacity: anyLoading ? 0.6 : 1,
            }]}
            onPress={handleGoogleSignIn}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            <GoogleIcon size={20} />
            <Text style={[styles.googleBtnText, { color: c.neutral[700] }]}>
              {googleLoading ? t.auth.connecting : t.auth.continueWithGoogle}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchMode} onPress={switchMode} disabled={anyLoading}>
            <Text style={[styles.switchText, { color: c.neutral[500] }]}>
              {isRegister ? t.auth.hasAccount : t.auth.noAccount}
              <Text style={{ color: c.primary[500], fontWeight: '600' }}>
                {isRegister ? t.auth.signIn : t.auth.signUp}
              </Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <Pressable style={fpStyles.overlay} onPress={() => setShowForgotPassword(false)}>
          <Pressable
            style={[fpStyles.sheet, { backgroundColor: c.neutral[0] }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[fpStyles.title, { color: c.neutral[900] }]}>{t.auth.forgotPasswordTitle}</Text>
            <Text style={[fpStyles.subtitle, { color: c.neutral[500] }]}>{t.auth.forgotPasswordSubtitle}</Text>
            <TextInput
              style={[fpStyles.input, { borderColor: c.neutral[200], color: c.neutral[900], backgroundColor: c.neutral[50] }]}
              placeholder={t.auth.emailPlaceholder}
              placeholderTextColor={c.neutral[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              value={resetEmail}
              onChangeText={setResetEmail}
            />
            <TouchableOpacity
              style={[fpStyles.btn, { backgroundColor: c.primary[500], opacity: resetLoading ? 0.7 : 1 }]}
              onPress={handleForgotPassword}
              disabled={resetLoading || !resetEmail.trim()}
              activeOpacity={0.85}
            >
              <Text style={[fpStyles.btnText, { color: '#FFF' }]}>
                {resetLoading ? t.common.loading : t.auth.sendResetLink}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={fpStyles.cancel} onPress={() => setShowForgotPassword(false)}>
              <Text style={[fpStyles.cancelText, { color: c.neutral[500] }]}>{t.common.cancel}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: '#E8EAED',
    }}>
      <Text style={{ fontSize: size * 0.65, fontWeight: '700', color: '#4285F4', includeFontPadding: false, textAlignVertical: 'center' }}>G</Text>
    </View>
  );
}

const fpStyles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  sheet:      { width: '100%', borderRadius: radius['2xl'], padding: spacing['2xl'], gap: spacing.lg },
  title:      { ...typography.h3, textAlign: 'center' },
  subtitle:   { ...typography.bodySm, textAlign: 'center' },
  input:      { borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, ...typography.body },
  btn:        { borderRadius: radius.xl, paddingVertical: spacing.lg, alignItems: 'center' },
  btnText:    { ...typography.button },
  cancel:     { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { ...typography.bodySm },
});

const styles = StyleSheet.create({
  container:   { flex: 1, justifyContent: 'center', paddingVertical: spacing['3xl'] },
  header:      { alignItems: 'center', marginBottom: spacing['3xl'] },
  title:       { ...typography.h1, marginBottom: spacing.sm },
  subtitle:    { ...typography.body, textAlign: 'center' },
  form:        { marginBottom: spacing.lg, gap: spacing.sm },
  actions:     { gap: spacing.lg },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { ...typography.bodySm },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, paddingVertical: spacing.lg, borderRadius: radius.xl, borderWidth: 1.5,
  },
  googleBtnText: { ...typography.bodyMedium },
  switchMode:    { alignItems: 'center', paddingVertical: spacing.sm },
  switchText:    { ...typography.body },
});
