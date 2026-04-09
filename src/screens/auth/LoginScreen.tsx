import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
  TextInput, Modal, Pressable,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

WebBrowser.maybeCompleteAuthSession();

import { Screen } from '../../components/layout/Screen';
import { TextField } from '../../components/ui/TextField';
import { Button } from '../../components/ui/Button';
import { LogoMark } from '../../components/ui/LogoMark';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { supabase } from '../../lib/supabase';
import { haptic } from '../../utils/haptics';
import { monitoring, Events } from '../../lib/monitoring';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;
type LoginForm = { email: string; password: string };

const schema = z.object({
  email:    z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'At least 6 characters'),
});

export function LoginScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();

  const login            = useAuthStore((s) => s.login);
  const isLoading        = useAuthStore((s) => s.isLoading);
  const syncFromSupabase = useWalletStore((s) => s.syncFromSupabase);

  const [googleLoading, setGoogleLoading]         = useState(false);
  const [showForgot, setShowForgot]               = useState(false);
  const [resetEmail, setResetEmail]               = useState('');
  const [resetLoading, setResetLoading]           = useState(false);

  const anyLoading = isLoading || googleLoading;

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
  });

  // ─── Email login ────────────────────────────────────────────────────────────
  const onSubmit = async (data: LoginForm) => {
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

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setGoogleLoading(true);
    haptic.light();
    monitoring.track(Events.GOOGLE_LOGIN_START);
    try {
      const redirectUrl = Linking.createURL('auth/callback');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
      if (!data.url) throw new Error('No OAuth URL');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl, {
        showInRecents: true, preferEphemeralSession: false,
      });

      if (result.type === 'success' && result.url) {
        const raw    = result.url;
        const idx    = raw.indexOf('#') !== -1 ? raw.indexOf('#') : raw.indexOf('?');
        const params = new URLSearchParams(idx !== -1 ? raw.slice(idx + 1) : '');
        const at     = params.get('access_token');
        const rt     = params.get('refresh_token');

        if (at && rt) {
          const { error: se } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (se) throw se;
        } else {
          const { error: ce } = await supabase.auth.exchangeCodeForSession(result.url);
          if (ce) throw ce;
        }
        monitoring.track(Events.GOOGLE_LOGIN_SUCCESS);
        const userId = useAuthStore.getState().user?.id;
        if (userId) syncFromSupabase(userId).catch(() => {});
        haptic.success();
      }
    } catch (err: unknown) {
      haptic.error();
      Alert.alert(t.auth.googleError, err instanceof Error ? err.message : t.auth.googleFailed);
    } finally {
      setGoogleLoading(false);
    }
  };

  // ─── Forgot password ─────────────────────────────────────────────────────────
  const handleReset = async () => {
    const email = resetEmail.trim();
    if (!email) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      setShowForgot(false);
      setResetEmail('');
      Alert.alert(t.auth.resetLinkSent, t.auth.resetLinkBody);
    } catch (err: unknown) {
      Alert.alert(t.auth.resetError, err instanceof Error ? err.message : t.auth.resetFailed);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Screen scrollable keyboardAware backgroundColor={c.background.primary}>
      <View style={styles.container}>

        {/* Header */}
        <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.header}>
          <LogoMark size={64} />
          <Text style={[styles.title, { color: c.neutral[900] }]}>{t.auth.welcomeBack}</Text>
          <Text style={[styles.subtitle, { color: c.neutral[500] }]}>{t.auth.signInSubtitle}</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label={t.auth.email}
                placeholder={t.auth.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
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
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => { haptic.light(); setResetEmail(''); setShowForgot(true); }}
          >
            <Text style={[styles.forgotText, { color: c.primary[500] }]}>{t.auth.forgotPassword}</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.actions}>
          <Button
            title={t.auth.signIn}
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={anyLoading}
            size="lg"
          />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.neutral[200] }]} />
            <Text style={[styles.dividerText, { color: c.neutral[400] }]}>{t.common.or}</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.neutral[200] }]} />
          </View>

          {/* Google */}
          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: c.neutral[300], backgroundColor: c.neutral[50], opacity: anyLoading ? 0.6 : 1 }]}
            onPress={handleGoogle}
            disabled={anyLoading}
            activeOpacity={0.8}
          >
            <GoogleIcon size={20} />
            <Text style={[styles.googleText, { color: c.neutral[700] }]}>
              {googleLoading ? t.auth.connecting : t.auth.continueWithGoogle}
            </Text>
          </TouchableOpacity>

          {/* Switch to Register */}
          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => { haptic.selection(); navigation.navigate('Register'); }}
            disabled={anyLoading}
          >
            <Text style={[styles.switchText, { color: c.neutral[500] }]}>
              {t.auth.noAccount}
              <Text style={{ color: c.primary[500], fontWeight: '600' }}>{t.auth.signUp}</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Forgot Password Modal */}
      <Modal visible={showForgot} transparent animationType="fade" onRequestClose={() => setShowForgot(false)}>
        <Pressable style={fpStyles.overlay} onPress={() => setShowForgot(false)}>
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
              onPress={handleReset}
              disabled={resetLoading || !resetEmail.trim()}
              activeOpacity={0.85}
            >
              <Text style={[fpStyles.btnText, { color: '#FFF' }]}>
                {resetLoading ? t.common.loading : t.auth.sendResetLink}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={fpStyles.cancel} onPress={() => setShowForgot(false)}>
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
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E8EAED' }}>
      <Text style={{ fontSize: size * 0.65, fontWeight: '700', color: '#4285F4', includeFontPadding: false }}>G</Text>
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
  header:      { alignItems: 'center', marginBottom: spacing['2xl'] },
  title:       { ...typography.h1, marginTop: spacing.lg, marginBottom: spacing.xs },
  subtitle:    { ...typography.body, textAlign: 'center', paddingHorizontal: spacing.xl },
  form:        { gap: spacing.xs, marginBottom: spacing.lg },
  forgotBtn:   { alignSelf: 'flex-end', marginTop: spacing.xs },
  forgotText:  { ...typography.bodySm, fontWeight: '500' },
  actions:     { gap: spacing.lg },
  divider:     { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { ...typography.bodySm },
  googleBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.lg, borderRadius: radius.xl, borderWidth: 1.5 },
  googleText:  { ...typography.bodyMedium },
  switchRow:   { alignItems: 'center' },
  switchText:  { ...typography.body },
});
