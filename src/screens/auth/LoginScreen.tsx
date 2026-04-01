import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, TextInput, Modal, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Must be called at module level so it runs as soon as the auth screen mounts
// after Android redirects back from Chrome Custom Tab
WebBrowser.maybeCompleteAuthSession();
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/layout/Screen';
import { TextField } from '../../components/ui/TextField';
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
import { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

type LoginForm    = { email: string; password: string };
type RegisterForm = { email: string; password: string; phone: string };

export function LoginScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const [isRegister, setIsRegister] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const { login, register, isLoading, error, setError } = useAuthStore();
  const { syncFromSupabase } = useWalletStore();

  // ─── i18n-aware Zod schemas ───────────────────────────────────────────────
  const loginSchema = useMemo(() => z.object({
    email:    z.string().email(t.auth.emailError),
    password: z.string().min(6, t.auth.passwordError),
  }), [t]);

  const registerSchema = useMemo(() => z.object({
    email:    z.string().email(t.auth.emailError),
    password: z.string().min(6, t.auth.passwordError),
    phone:    z.string()
      .min(10, t.auth.phoneError)
      .regex(/^\+?[0-9\s\-().]{10,}$/, t.auth.phoneInvalidError),
  }), [t]);

  // ─── Forgot password ──────────────────────────────────────────────────────
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

  // ─── Google OAuth — Supabase web flow (no SHA-1 needed) ──────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    haptic.light();
    try {
      const redirectUrl = Linking.createURL('auth/callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('Google OAuth URL alınamadı');

      // iOS: result.type === 'success' → exchange code directly
      // Android: result.type === 'dismiss' → App.tsx Linking listener handles it
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        { showInRecents: true }
      );

      if (result.type === 'success' && result.url) {
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (sessionError) throw sessionError;

        setTimeout(() => {
          const userId = useAuthStore.getState().user?.id;
          if (userId) syncFromSupabase(userId).catch(() => {});
        }, 500);
        haptic.success();
      }
      // Android: Linking listener in App.tsx handles the rest
    } catch (err: unknown) {
      haptic.error();
      const msg = err instanceof Error ? err.message : t.auth.googleFailed;
      Alert.alert(t.auth.googleError, msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Email / password forms ───────────────────────────────────────────────
  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', phone: '' },
  });

  const onLoginSubmit = async (data: LoginForm) => {
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
  };

  const onRegisterSubmit = async (data: RegisterForm) => {
    setError(null);
    try {
      // register() creates account + sends OTP, sets pendingOtpEmail
      await register(data.email, data.password, data.phone);
      haptic.success();
      // Navigate to OTP verification screen
      navigation.navigate('OTPVerify', { email: data.email });
    } catch (err: unknown) {
      haptic.error();
      const msg = err instanceof Error ? err.message : t.auth.registerFailed;
      Alert.alert(t.auth.registerError, msg);
    }
  };

  const switchMode = () => {
    haptic.selection();
    setIsRegister(!isRegister);
    setError(null);
    loginForm.reset();
    registerForm.reset();
  };

  const anyLoading = isLoading || googleLoading;

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

        {/* Form */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.form}>
          {isRegister ? (
            <>
              <Controller
                control={registerForm.control}
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
                    error={registerForm.formState.errors.email?.message}
                  />
                )}
              />
              <Controller
                control={registerForm.control}
                name="phone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label={t.auth.phone}
                    placeholder={t.auth.phonePlaceholder}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    returnKeyType="next"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={registerForm.formState.errors.phone?.message}
                  />
                )}
              />
              <Controller
                control={registerForm.control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label={t.auth.password}
                    placeholder={t.auth.passwordPlaceholder}
                    secureTextEntry
                    autoComplete="new-password"
                    returnKeyType="done"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={registerForm.formState.errors.password?.message}
                  />
                )}
              />
              <View style={[styles.infoBox, { backgroundColor: c.primary[50] }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={c.primary[500]} />
                <Text style={[styles.infoText, { color: c.primary[600] }]}>
                  {t.auth.otpInfoText}
                </Text>
              </View>
            </>
          ) : (
            <>
              <Controller
                control={loginForm.control}
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
                    error={loginForm.formState.errors.email?.message}
                  />
                )}
              />
              <Controller
                control={loginForm.control}
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
                    error={loginForm.formState.errors.password?.message}
                  />
                )}
              />
              <TouchableOpacity style={styles.forgotPassword} onPress={() => { haptic.light(); setResetEmail(''); setShowForgotPassword(true); }}>
                <Text style={[styles.forgotText, { color: c.primary[500] }]}>
                  {t.auth.forgotPassword}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.actions}>
          <Button
            title={isRegister ? t.auth.signUp : t.auth.signIn}
            onPress={
              isRegister
                ? registerForm.handleSubmit(onRegisterSubmit)
                : loginForm.handleSubmit(onLoginSubmit)
            }
            loading={isLoading}
            disabled={anyLoading}
            size="lg"
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.neutral[200] }]} />
            <Text style={[styles.dividerText, { color: c.neutral[400] }]}>{t.common.or}</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.neutral[200] }]} />
          </View>

          {/* Google button */}
          <TouchableOpacity
            style={[
              styles.googleBtn,
              {
                borderColor: c.neutral[200],
                backgroundColor: c.neutral[0],
                opacity: anyLoading ? 0.6 : 1,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            <View style={styles.googleLogo}>
              <Text style={styles.googleLogoText}>G</Text>
            </View>
            <Text style={[styles.googleBtnText, { color: c.neutral[800] }]}>
              {googleLoading ? t.auth.connecting : t.auth.continueWithGoogle}
            </Text>
          </TouchableOpacity>

          {/* Switch mode */}
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
      {/* ─── Forgot Password Modal ─────────────────────────────────────── */}
      <Modal visible={showForgotPassword} transparent animationType="fade" onRequestClose={() => setShowForgotPassword(false)}>
        <Pressable style={fpStyles.overlay} onPress={() => setShowForgotPassword(false)}>
          <Pressable style={[fpStyles.sheet, { backgroundColor: c.neutral[0] }]} onPress={(e) => e.stopPropagation()}>
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
  container: { flex: 1, justifyContent: 'center', paddingVertical: spacing['3xl'] },
  header: { alignItems: 'center', marginBottom: spacing['3xl'] },
  title: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: { ...typography.body, textAlign: 'center' },
  form: { marginBottom: spacing.lg, gap: spacing.sm },
  forgotPassword: { alignSelf: 'flex-end', marginTop: spacing.xs },
  forgotText: { ...typography.bodySm, fontWeight: '500' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.xs,
  },
  infoText: { ...typography.caption, flex: 1, lineHeight: 18 },
  errorText: { ...typography.bodySm, color: '#EF4444', textAlign: 'center', marginTop: spacing.xs },
  actions: { gap: spacing.lg },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { ...typography.bodySm },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
  },
  googleLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  googleBtnText: { ...typography.bodyMedium },
  switchMode: { alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { ...typography.body },
});
