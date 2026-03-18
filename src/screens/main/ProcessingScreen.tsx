import React, { useEffect } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  FadeIn,
  FadeInUp,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { motion } from '../../theme/motion';
import type { Colors } from '../../theme/colors';
import type { SocialPostMeta, SocialPlatform } from '../../types';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const PLATFORM_ICONS: Record<SocialPlatform, { icon: IoniconsName; color: string }> = {
  instagram: { icon: 'logo-instagram', color: '#E1306C' },
  twitter:   { icon: 'logo-twitter',   color: '#1DA1F2' },
  tiktok:    { icon: 'logo-tiktok',    color: '#FE2C55' },
  facebook:  { icon: 'logo-facebook',  color: '#1877F2' },
  unknown:   { icon: 'globe-outline',  color: '#6B7280' },
};

interface ProcessingScreenProps {
  imageUri: string;
  socialMeta?: SocialPostMeta;
  onComplete: (scanId: string) => void;
}

export function ProcessingScreen({ imageUri, socialMeta, onComplete }: ProcessingScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scanSize = Math.min(width * 0.52, 220);
  const pulse = useSharedValue(0);
  const progress = useSharedValue(0);
  const scanLine = useSharedValue(0);
  const step = useSharedValue(0);

  useEffect(() => {
    // Pulse animation
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      true
    );

    // Scan line animation
    scanLine.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true
    );

    // Progress animation
    progress.value = withTiming(1, { duration: 3500 });

    // Steps
    step.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(800, withTiming(1, { duration: 300 })),
      withDelay(1200, withTiming(2, { duration: 300 })),
      withDelay(1000, withTiming(3, { duration: 300 }))
    );

    // Simulate completion
    const timer = setTimeout(() => {
      onComplete(`scan_${Date.now()}`);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.05]) }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLine.value * 100}%` as any,
    opacity: interpolate(scanLine.value, [0, 0.5, 1], [0, 1, 0]),
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0B1E3D', '#020617']}
        style={styles.gradient}
      >
        {/* Scanning Visual */}
        <Animated.View
          entering={FadeIn.duration(500)}
          style={styles.scanContainer}
        >
          <Animated.View style={[styles.scanBox, { width: scanSize, height: scanSize, borderRadius: radius['2xl'] }, pulseStyle]}>
            <View style={styles.imagePreview}>
              {socialMeta ? (
                <View style={styles.platformIconWrapper}>
                  <Ionicons
                    name={PLATFORM_ICONS[socialMeta.platform].icon}
                    size={56}
                    color={PLATFORM_ICONS[socialMeta.platform].color}
                  />
                </View>
              ) : (
                <Text style={styles.imageEmoji}>🖼️</Text>
              )}
            </View>
            {/* Scan line effect */}
            <Animated.View style={[styles.scanLine, { backgroundColor: c.accent.cyan }, scanLineStyle]} />
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTL, { borderColor: c.primary[400] }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: c.primary[400] }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: c.primary[400] }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: c.primary[400] }]} />
          </Animated.View>
        </Animated.View>

        {/* Status */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(500)}
          style={styles.status}
        >
          <Text style={[styles.statusTitle, { color: '#F8FAFC' }]}>
            {socialMeta ? t.processing.socialTitle : t.processing.title}
          </Text>
          <Text style={styles.statusSubtitle}>
            {socialMeta ? t.processing.socialSubtitle : t.processing.subtitle}
          </Text>
        </Animated.View>

        {/* Progress Bar */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(400)}
          style={styles.progressContainer}
        >
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]}>
              <LinearGradient
                colors={[c.primary[400], c.accent.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>
          </View>
        </Animated.View>

        {/* Steps */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(400)}
          style={styles.steps}
        >
          <ProcessingStep
            label={socialMeta ? t.processing.stepFetching : t.processing.stepUploading}
            step={0}
            currentStep={step}
            c={c}
          />
          <ProcessingStep
            label={t.processing.stepDetecting}
            step={1}
            currentStep={step}
            c={c}
          />
          <ProcessingStep
            label={t.processing.stepGenerating}
            step={2}
            currentStep={step}
            c={c}
          />
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

function ProcessingStep({
  label,
  step,
  currentStep,
  c,
}: {
  label: string;
  step: number;
  currentStep: SharedValue<number>;
  c: Colors;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const isActive = currentStep.value >= step;
    return {
      opacity: isActive ? 1 : 0.4,
    };
  });

  const dotStyle = useAnimatedStyle(() => {
    const isActive = currentStep.value >= step;
    return {
      backgroundColor: isActive ? c.primary[400] : 'rgba(255,255,255,0.2)',
      transform: [{ scale: isActive ? 1 : 0.7 }],
    };
  });

  return (
    <Animated.View style={[styles.stepItem, animatedStyle]}>
      <Animated.View style={[styles.stepDot, dotStyle]} />
      <Text style={styles.stepLabel}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  scanContainer: {
    marginBottom: spacing['4xl'],
  },
  scanBox: {
    overflow: 'hidden',
    backgroundColor: 'rgba(26, 143, 232, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageEmoji: {
    fontSize: 64,
  },
  platformIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: radius.md,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: radius.md,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: radius.md,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: radius.md,
  },
  status: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  statusTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  statusSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: spacing['3xl'],
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  steps: {
    gap: spacing.lg,
    width: '100%',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.md,
  },
  stepLabel: {
    ...typography.body,
    color: 'rgba(255,255,255,0.8)',
  },
});
