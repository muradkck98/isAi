import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/layout/Screen';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { motion } from '../../theme/motion';
import { haptic } from '../../utils/haptics';
import {
  detectPlatform,
  fetchSocialPost,
  isValidSocialUrl,
} from '../../services/socialMedia';
import type { SocialPlatform, SocialPostMeta } from '../../types';

// ─── Config ───────────────────────────────────────────────────────────────────

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const PLATFORM_CONFIG: Record<
  SocialPlatform,
  { label: string; color: string; icon: IoniconsName }
> = {
  instagram: { label: 'Instagram', color: '#E1306C', icon: 'logo-instagram' },
  twitter:   { label: 'X (Twitter)', color: '#1DA1F2', icon: 'logo-twitter' },
  tiktok:    { label: 'TikTok',      color: '#FE2C55', icon: 'logo-tiktok'  },
  facebook:  { label: 'Facebook',    color: '#1877F2', icon: 'logo-facebook' },
  unknown:   { label: 'Unknown',     color: '#6B7280', icon: 'globe-outline' },
};

const SUPPORTED: SocialPlatform[] = ['instagram', 'twitter', 'tiktok', 'facebook'];

type FetchState = 'idle' | 'loading' | 'error';

interface SocialScanScreenProps {
  onGoBack: () => void;
  onPostFetched: (thumbnailUri: string, socialMeta: SocialPostMeta) => void;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function SocialScanScreen({ onGoBack, onPostFetched }: SocialScanScreenProps) {
  const c   = useThemeColors();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const inputRef = useRef<TextInput>(null);

  const [url, setUrl]           = useState('');
  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [inputFocused, setInputFocused] = useState(false);

  const platform   = isValidSocialUrl(url) ? detectPlatform(url) : 'unknown';
  const detected   = isValidSocialUrl(url) && platform !== 'unknown';
  const cfg        = PLATFORM_CONFIG[platform];
  const canAnalyze = detected && fetchState !== 'loading';

  // ── Back button animation ──────────────────────────────────────────────────
  const backScale = useSharedValue(1);
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }],
  }));

  // ── Input card focus animation ─────────────────────────────────────────────
  const inputElevation = useSharedValue(0);
  const inputStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(inputElevation.value, [0, 1], [1, 1.008]) }],
  }));

  // ── Button pulse when ready ────────────────────────────────────────────────
  const btnGlow = useSharedValue(0);
  React.useEffect(() => {
    if (canAnalyze) {
      btnGlow.value = withRepeat(
        withSequence(withTiming(1, { duration: 1600 }), withTiming(0, { duration: 1600 })),
        -1, false,
      );
    } else {
      btnGlow.value = withTiming(0, { duration: 200 });
    }
  }, [canAnalyze]);

  const btnGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(btnGlow.value, [0, 1], [0, 0.22]),
  }));

  // ── Fetch handler ─────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!canAnalyze) return;
    Keyboard.dismiss();
    haptic.medium();
    setFetchState('loading');
    setErrorMsg('');

    try {
      const data = await fetchSocialPost(url);
      if (!data.thumbnailUrl) {
        setFetchState('error');
        setErrorMsg(t.socialScan.noImageFound);
        return;
      }
      setFetchState('idle');
      onPostFetched(data.thumbnailUrl, data);
    } catch {
      setFetchState('error');
      setErrorMsg(t.socialScan.fetchError);
    }
  }, [url, canAnalyze, t, onPostFetched]);

  const handleClear = () => {
    setUrl('');
    setFetchState('idle');
    setErrorMsg('');
    inputRef.current?.focus();
  };

  // Active border color: platform color when detected, primary when focused, neutral otherwise
  const borderColor = detected
    ? cfg.color
    : inputFocused
    ? c.primary[400]
    : c.neutral[200];

  const accentColor = detected ? cfg.color : c.primary[500];

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.primary}>
      <View style={[styles.root, { paddingHorizontal: width < 360 ? spacing.lg : spacing.xl }]}>

        {/* ── Custom Header ─────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={() => { backScale.value = withSpring(0.82, motion.spring.snappy); }}
            onPressOut={() => { backScale.value = withSpring(1, motion.spring.bouncy); }}
            onPress={() => { haptic.selection(); onGoBack(); }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Animated.View style={[styles.backBtn, { backgroundColor: c.neutral[100] }, backStyle]}>
              <Ionicons name="arrow-back" size={20} color={c.neutral[700]} />
            </Animated.View>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: c.neutral[900] }]}>
            {t.socialScan.title}
          </Text>

          {/* Spacer to visually center the title */}
          <View style={styles.backBtn} />
        </Animated.View>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(80).duration(600).springify()}
          style={styles.heroWrapper}
        >
          <LinearGradient
            colors={
              detected
                ? [cfg.color + '16', cfg.color + '04', 'transparent']
                : [c.primary[50], 'transparent']
            }
            style={styles.hero}
          >
            {/* Platform icons — shown only here */}
            <View style={styles.heroPlatformRow}>
              {SUPPORTED.map((p, i) => {
                const pc       = PLATFORM_CONFIG[p];
                const isActive = platform === p;
                return (
                  <Animated.View
                    key={p}
                    entering={FadeIn.delay(120 + i * 70).duration(350)}
                    style={[
                      styles.heroPlatformIcon,
                      {
                        backgroundColor: isActive ? pc.color + '20' : c.neutral[100],
                        borderWidth: isActive ? 1.5 : 0,
                        borderColor: isActive ? pc.color : 'transparent',
                      },
                    ]}
                  >
                    <Ionicons
                      name={pc.icon}
                      size={24}
                      color={isActive ? pc.color : c.neutral[400]}
                    />
                  </Animated.View>
                );
              })}
            </View>

            <Text style={[styles.heroSubtitle, { color: c.neutral[500] }]}>
              {t.socialScan.subtitle}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── URL Input ─────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(500).springify()}
          style={[styles.inputWrapper, inputStyle]}
        >
          <View
            style={[
              styles.inputCard,
              {
                backgroundColor: c.neutral[0],
                borderColor,
                borderWidth: detected || inputFocused ? 1.5 : 1,
              },
            ]}
          >
            {/* Icon left */}
            <View style={styles.inputIconLeft}>
              {detected ? (
                <Animated.View entering={FadeIn.duration(180)}>
                  <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                </Animated.View>
              ) : (
                <Ionicons name="link-outline" size={22} color={c.neutral[400]} />
              )}
            </View>

            <TextInput
              ref={inputRef}
              style={[styles.input, { color: c.neutral[900] }]}
              placeholder={t.socialScan.urlPlaceholder}
              placeholderTextColor={c.neutral[400]}
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setFetchState('idle');
                setErrorMsg('');
              }}
              onFocus={() => {
                setInputFocused(true);
                inputElevation.value = withTiming(1, { duration: 200 });
              }}
              onBlur={() => {
                setInputFocused(false);
                inputElevation.value = withTiming(0, { duration: 200 });
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleAnalyze}
            />

            {url.length > 0 && (
              <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={c.neutral[300]} />
              </TouchableOpacity>
            )}
          </View>

          {/* Platform detected pill */}
          {detected && (
            <Animated.View
              entering={FadeInUp.duration(280).springify()}
              style={[styles.detectedPill, { backgroundColor: cfg.color + '12' }]}
            >
              <Ionicons name="checkmark-circle" size={14} color={cfg.color} />
              <Text style={[styles.detectedText, { color: cfg.color }]}>
                {cfg.label} {t.socialScan.platformDetected}
              </Text>
            </Animated.View>
          )}

          {/* Error */}
          {fetchState === 'error' && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.errorPill,
                { backgroundColor: c.error + '10', borderColor: c.error + '35' },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={15} color={c.error} />
              <Text style={[styles.errorText, { color: c.error }]}>{errorMsg}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* ── Analyze Button ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(500).springify()}
          style={styles.btnOuter}
        >
          {/* Glow layer */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.btnGlow,
              { backgroundColor: accentColor },
              btnGlowStyle,
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleAnalyze}
            disabled={!canAnalyze}
            style={styles.btnTouchable}
          >
            <LinearGradient
              colors={
                canAnalyze
                  ? [accentColor, shadeColor(accentColor, -28)]
                  : [c.neutral[200], c.neutral[200]]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.btn, !canAnalyze && styles.btnDisabled]}
            >
              {fetchState === 'loading' ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.btnText}>{t.socialScan.fetching}</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Ionicons
                    name="scan-outline"
                    size={20}
                    color={canAnalyze ? '#fff' : c.neutral[400]}
                  />
                  <Text
                    style={[styles.btnText, !canAnalyze && { color: c.neutral[400] }]}
                  >
                    {t.socialScan.analyze}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(500)}
          style={styles.stepsSection}
        >
          <Text style={[styles.stepsTitle, { color: c.neutral[400] }]}>
            {t.socialScan.supportedPlatforms}
          </Text>

          <View style={[styles.stepsCard, { backgroundColor: c.neutral[0] }]}>
            <StepRow
              number="1"
              icon="clipboard-outline"
              text={t.socialScan.howItWorks1}
              accentColor={accentColor}
              delay={480}
            />
            <View style={[styles.stepDivider, { backgroundColor: c.neutral[100] }]} />
            <StepRow
              number="2"
              icon="image-outline"
              text={t.socialScan.howItWorks2}
              accentColor={accentColor}
              delay={560}
            />
            <View style={[styles.stepDivider, { backgroundColor: c.neutral[100] }]} />
            <StepRow
              number="3"
              icon="flask-outline"
              text={t.socialScan.howItWorks3}
              accentColor={accentColor}
              delay={640}
            />
          </View>
        </Animated.View>

      </View>
    </Screen>
  );
}

// ─── Step Row ─────────────────────────────────────────────────────────────────

function StepRow({
  number,
  icon,
  text,
  accentColor,
  delay,
}: {
  number: string;
  icon: IoniconsName;
  text: string;
  accentColor: string;
  delay: number;
}) {
  const c = useThemeColors();
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(350)}
      style={styles.stepRow}
    >
      <View style={[styles.stepNumber, { backgroundColor: accentColor + '16' }]}>
        <Text style={[styles.stepNumberText, { color: accentColor }]}>{number}</Text>
      </View>
      <Ionicons
        name={icon}
        size={17}
        color={c.neutral[400]}
        style={styles.stepIcon}
      />
      <Text style={[styles.stepText, { color: c.neutral[700] }]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function shadeColor(hex: string, percent: number): string {
  try {
    const num   = parseInt(hex.replace('#', ''), 16);
    const clamp = (v: number) => Math.max(0, Math.min(255, v));
    const r = clamp(((num >> 16) & 0xff) + percent * 2.55);
    const g = clamp(((num >> 8)  & 0xff) + percent * 2.55);
    const b = clamp((num         & 0xff) + percent * 2.55);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  } catch {
    return hex;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingBottom: spacing['2xl'],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },

  // Hero
  heroWrapper: {
    marginBottom: spacing['2xl'],
  },
  hero: {
    borderRadius: radius['2xl'],
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroPlatformRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  heroPlatformIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSubtitle: {
    ...typography.bodySm,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },

  // Input
  inputWrapper: {
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    borderRadius: radius.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  inputIconLeft: {
    width: 26,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: 4,
    minHeight: 44,
  },
  detectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  detectedText: {
    ...typography.captionMedium,
    fontSize: 12.5,
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  errorText: {
    ...typography.bodySm,
    flex: 1,
    lineHeight: 18,
  },

  // Button
  btnOuter: {
    marginBottom: spacing['3xl'],
    position: 'relative',
  },
  btnGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.xl,
    top: 6,
    bottom: -6,
    left: 16,
    right: 16,
    zIndex: 0,
  },
  btnTouchable: {
    zIndex: 1,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  btn: {
    paddingVertical: spacing.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.xl,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  btnText: {
    ...typography.button,
    color: '#fff',
    fontSize: 16,
  },

  // Steps
  stepsSection: {
    gap: spacing.md,
  },
  stepsTitle: {
    ...typography.captionMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
  stepsCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  stepDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typography.captionMedium,
    fontSize: 13,
    fontWeight: '700',
  },
  stepIcon: {
    marginRight: 2,
  },
  stepText: {
    ...typography.bodySm,
    flex: 1,
    lineHeight: 18,
  },
});
