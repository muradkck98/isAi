import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthStackParamList } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { haptic } from '../../utils/haptics';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTPVerify'>;

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export function OTPScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const c = useThemeColors();

  const { verifyOtp, sendOtp, isLoading } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  // ─── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Auto-submit when all 6 digits are filled ─────────────────────────────
  useEffect(() => {
    if (digits.every((d) => d !== '') && digits.length === OTP_LENGTH) {
      handleVerify(digits.join(''));
    }
  }, [digits]);

  const handleVerify = useCallback(
    async (code?: string) => {
      const token = code ?? digits.join('');
      if (token.length < OTP_LENGTH) {
        Alert.alert('Eksik kod', `Lütfen ${OTP_LENGTH} haneli kodu girin.`);
        return;
      }
      Keyboard.dismiss();
      haptic.medium();
      try {
        await verifyOtp(email, token);
        haptic.success();
        // onAuthStateChange → SIGNED_IN → RootNavigator switches to Main automatically
      } catch (err: unknown) {
        haptic.error();
        const msg = err instanceof Error ? err.message : 'Kod doğrulanamadı';
        Alert.alert('Hata', msg);
        // Clear digits on failure
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    },
    [digits, email, verifyOtp]
  );

  const handleDigitChange = (text: string, index: number) => {
    // Accept only digits; handle paste of full code
    const cleaned = text.replace(/\D/g, '');

    if (cleaned.length > 1) {
      // User pasted a code — fill all boxes
      const chars = cleaned.slice(0, OTP_LENGTH).split('');
      const newDigits = [...Array(OTP_LENGTH).fill('')];
      chars.forEach((c, i) => { newDigits[i] = c; });
      setDigits(newDigits);
      const nextIdx = Math.min(chars.length, OTP_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);

    // Auto-advance to next input
    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      // Move back on backspace if current box is empty
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    haptic.light();
    try {
      await sendOtp(email);
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      Alert.alert('Kod gönderildi', `${email} adresinize yeni bir kod gönderildi.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kod gönderilemedi';
      Alert.alert('Hata', msg);
    }
  };

  const maskedEmail = email.replace(/(.{2}).+(@.+)/, '$1***$2');

  return (
    <KeyboardAvoidingView
      style={[styles.wrapper, { backgroundColor: c.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="arrow-back" size={24} color={c.neutral[700]} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: c.primary[50] }]}>
            <Ionicons name="mail-outline" size={40} color={c.primary[500]} />
          </View>
          <Text style={[styles.title, { color: c.neutral[900] }]}>
            E-posta Doğrulama
          </Text>
          <Text style={[styles.subtitle, { color: c.neutral[500] }]}>
            <Text style={{ fontWeight: '600', color: c.neutral[700] }}>{maskedEmail}</Text>
            {'\n'}adresine {OTP_LENGTH} haneli doğrulama kodu gönderdik.
          </Text>
        </Animated.View>

        {/* OTP boxes */}
        <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.boxesRow}>
          {digits.map((digit, i) => (
            <TextInput
              key={i}
              ref={(ref) => { inputRefs.current[i] = ref; }}
              style={[
                styles.box,
                {
                  borderColor: focusedIndex === i
                    ? c.primary[500]
                    : digit
                    ? c.primary[300]
                    : c.neutral[200],
                  backgroundColor: c.background.secondary,
                  color: c.neutral[900],
                },
              ]}
              value={digit}
              onChangeText={(text) => handleDigitChange(text, i)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
              onFocus={() => setFocusedIndex(i)}
              keyboardType="number-pad"
              maxLength={OTP_LENGTH} // allow paste of full code
              selectTextOnFocus
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              caretHidden
            />
          ))}
        </Animated.View>

        {/* Verify button */}
        <Animated.View entering={FadeInDown.delay(250).duration(500)} style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.verifyBtn,
              {
                backgroundColor:
                  digits.every((d) => d !== '') && !isLoading
                    ? c.primary[500]
                    : c.neutral[200],
              },
            ]}
            onPress={() => handleVerify()}
            disabled={isLoading || digits.some((d) => d === '')}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.verifyBtnText,
                {
                  color:
                    digits.every((d) => d !== '') && !isLoading
                      ? '#FFFFFF'
                      : c.neutral[400],
                },
              ]}
            >
              {isLoading ? 'Doğrulanıyor...' : 'Doğrula'}
            </Text>
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={[styles.resendText, { color: c.neutral[500] }]}>
              Kod gelmedi mi?{' '}
            </Text>
            {canResend ? (
              <TouchableOpacity onPress={handleResend} disabled={isLoading}>
                <Text style={[styles.resendLink, { color: c.primary[500] }]}>
                  Tekrar gönder
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.resendTimer, { color: c.neutral[400] }]}>
                {countdown}s sonra gönder
              </Text>
            )}
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 56,
    left: spacing.xl,
    zIndex: 10,
    padding: spacing.xs,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  boxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  box: {
    width: 46,
    height: 56,
    borderRadius: radius.lg,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  actions: {
    gap: spacing.lg,
  },
  verifyBtn: {
    height: 54,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnText: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    ...typography.bodySm,
  },
  resendLink: {
    ...typography.bodySm,
    fontWeight: '600',
  },
  resendTimer: {
    ...typography.bodySm,
  },
});
