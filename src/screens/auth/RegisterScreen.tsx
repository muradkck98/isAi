import React, { memo } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Alert,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../../components/layout/Screen';
import { TextField } from '../../components/ui/TextField';
import { PhoneInput } from '../../components/ui/PhoneInput';
import { Button } from '../../components/ui/Button';
import { LogoMark } from '../../components/ui/LogoMark';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuthStore } from '../../store/useAuthStore';
import { haptic } from '../../utils/haptics';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { AuthStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

type RegisterForm = { email: string; password: string; phone: string };

const schema = z.object({
  email:    z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(6, 'At least 6 characters'),
  phone:    z.string().min(1, 'Phone is required').regex(/^\+\d{7,15}$/, 'Select a country and enter your number'),
});

export function RegisterScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const navigation = useNavigation<Nav>();
  const register  = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', phone: '' },
    mode: 'onBlur',
  });

  const password = watch('password', '');
  const strength = password.length === 0 ? null
    : password.length < 6  ? 'weak'
    : password.length < 10 ? 'fair'
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 'strong'
    : 'good';

  const strengthMeta = {
    weak:   { color: '#EF4444', label: 'Weak',   bars: 1 },
    fair:   { color: '#F59E0B', label: 'Fair',   bars: 2 },
    good:   { color: '#3B82F6', label: 'Good',   bars: 3 },
    strong: { color: '#10B981', label: 'Strong', bars: 4 },
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register(data.email, data.password, data.phone);
      haptic.success();
      navigation.navigate('OTPVerify', { email: data.email });
    } catch (err: unknown) {
      haptic.error();
      const msg = err instanceof Error ? err.message : t.auth.registerFailed;
      Alert.alert(t.auth.registerError, msg);
    }
  };

  return (
    <Screen scrollable keyboardAware backgroundColor={c.background.primary}>
      <View style={styles.container}>

        {/* Header */}
        <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.header}>
          <LogoMark size={64} />
          <Text style={[styles.title, { color: c.neutral[900] }]}>{t.auth.createAccount}</Text>
          <Text style={[styles.subtitle, { color: c.neutral[500] }]}>{t.auth.signUpSubtitle}</Text>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.form}>

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

          {/* Phone */}
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
                {strength && (
                  <View style={styles.strengthRow}>
                    <View style={styles.strengthBars}>
                      {[1, 2, 3, 4].map((i) => (
                        <View
                          key={i}
                          style={[
                            styles.strengthBar,
                            { backgroundColor: i <= strengthMeta[strength].bars ? strengthMeta[strength].color : c.neutral[200] },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.strengthLabel, { color: strengthMeta[strength].color }]}>
                      {strengthMeta[strength].label}
                    </Text>
                  </View>
                )}
              </View>
            )}
          />

          {/* Info */}
          <View style={[styles.infoBox, { backgroundColor: c.primary[50] }]}>
            <Ionicons name="shield-checkmark-outline" size={15} color={c.primary[500]} />
            <Text style={[styles.infoText, { color: c.primary[600] }]}>{t.auth.otpInfoText}</Text>
          </View>
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.actions}>
          <Button
            title={t.auth.signUp}
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            size="lg"
          />

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => { haptic.selection(); navigation.navigate('Login'); }}
            disabled={isLoading}
          >
            <Text style={[styles.switchText, { color: c.neutral[500] }]}>
              {t.auth.hasAccount}
              <Text style={{ color: c.primary[500], fontWeight: '600' }}>{t.auth.signIn}</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>

      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, justifyContent: 'center', paddingVertical: spacing['3xl'] },
  header:        { alignItems: 'center', marginBottom: spacing['2xl'] },
  title:         { ...typography.h1, marginTop: spacing.lg, marginBottom: spacing.xs },
  subtitle:      { ...typography.body, textAlign: 'center', paddingHorizontal: spacing.xl },
  form:          { gap: spacing.xs, marginBottom: spacing.lg },
  actions:       { gap: spacing.lg },
  infoBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg },
  infoText:      { ...typography.caption, flex: 1, lineHeight: 18 },
  strengthRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: -spacing.sm, marginBottom: spacing.xs },
  strengthBars:  { flex: 1, flexDirection: 'row', gap: 4 },
  strengthBar:   { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { ...typography.caption, fontWeight: '600', minWidth: 40, textAlign: 'right' },
  switchRow:     { alignItems: 'center' },
  switchText:    { ...typography.body },
});
