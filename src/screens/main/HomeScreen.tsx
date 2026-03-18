import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/layout/Screen';
import { Card } from '../../components/ui/Card';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { motion } from '../../theme/motion';
import { useWalletStore } from '../../store/useWalletStore';
import { haptic } from '../../utils/haptics';

interface HomeScreenProps {
  onNavigateToUpload: () => void;
  onNavigateToHistory: () => void;
  onNavigateToWallet: () => void;
  onNavigateToSocialScan: () => void;
}

export function HomeScreen({
  onNavigateToUpload,
  onNavigateToHistory,
  onNavigateToWallet,
  onNavigateToSocialScan,
}: HomeScreenProps) {
  const { tokens, totalScans } = useWalletStore();
  const c = useThemeColors();
  const { t } = useTranslation();

  // Pulse glow on the CTA card
  const ctaGlow = useSharedValue(0);
  useEffect(() => {
    ctaGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1, false
    );
  }, []);
  const ctaGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ctaGlow.value, [0, 1], [0.0, 0.18]),
  }));

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
      {/* Token Banner */}
      <Animated.View entering={FadeInUp.duration(500)}>
        <TouchableOpacity activeOpacity={0.9} onPress={onNavigateToWallet}>
          <LinearGradient
            colors={[c.primary[500], c.primary[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tokenBanner}
          >
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenLabel}>{t.home.availableTokens}</Text>
              <Text style={[styles.tokenCount, { color: c.neutral[0] }]}>{tokens}</Text>
            </View>
            <View style={styles.tokenStats}>
              <View style={styles.tokenStat}>
                <Text style={[styles.tokenStatValue, { color: c.neutral[0] }]}>{totalScans}</Text>
                <Text style={styles.tokenStatLabel}>{t.common.scans}</Text>
              </View>
            </View>
            <View style={styles.tokenBadge}>
              <Text style={styles.tokenBadgeText}>🪙</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Main CTA - Upload */}
      <Animated.View entering={FadeInUp.delay(200).duration(600).springify()}>
        {/* Glow behind card */}
        <Animated.View style={[styles.ctaGlow, { backgroundColor: c.primary[400] }, ctaGlowStyle]} pointerEvents="none" />
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => {
            haptic.medium();
            onNavigateToUpload();
          }}
        >
          <Card variant="elevated" padding="lg" style={[styles.uploadCard, { borderColor: c.primary[100] }]}>
            <View style={styles.uploadContent}>
              <View style={styles.uploadIconContainer}>
                <LinearGradient
                  colors={[c.primary[100], c.primary[50]]}
                  style={styles.uploadIcon}
                >
                  <Text style={styles.uploadIconText}>📷</Text>
                </LinearGradient>
              </View>
              <Text style={[styles.uploadTitle, { color: c.neutral[900] }]}>
                {t.home.analyzeImage}
              </Text>
              <Text style={[styles.uploadDescription, { color: c.neutral[500] }]}>
                {t.home.analyzeDescription}
              </Text>
              <View style={styles.uploadButton}>
                <LinearGradient
                  colors={[c.primary[500], c.primary[600]]}
                  style={styles.uploadButtonGradient}
                >
                  <Text style={[styles.uploadButtonText, { color: c.neutral[0] }]}>
                    {t.home.startScan} →
                  </Text>
                </LinearGradient>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>

      {/* Social Scan CTA */}
      <Animated.View entering={FadeInUp.delay(280).duration(500)}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => { haptic.selection(); onNavigateToSocialScan(); }}
        >
          <Card
            variant="elevated"
            padding="md"
            style={[styles.socialCard, { borderColor: c.neutral[200] }]}
          >
            <View style={styles.socialContent}>
              <View style={[styles.socialIconBg, { backgroundColor: c.accent.purple + '18' }]}>
                <Ionicons name="link" size={22} color={c.accent.purple} />
              </View>
              <View style={styles.socialText}>
                <Text style={[styles.socialTitle, { color: c.neutral[900] }]}>
                  {t.home.scanSocialPost}
                </Text>
                <Text style={[styles.socialDesc, { color: c.neutral[500] }]}>
                  {t.home.scanSocialDesc}
                </Text>
              </View>
              <View style={styles.socialPlatforms}>
                {(['logo-instagram', 'logo-twitter', 'logo-tiktok', 'logo-facebook'] as const).map(
                  (icon, i) => (
                    <Ionicons
                      key={icon}
                      name={icon}
                      size={13}
                      color={
                        [
                          '#E1306C',
                          '#1DA1F2',
                          '#FE2C55',
                          '#1877F2',
                        ][i]
                      }
                    />
                  ),
                )}
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Actions */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(500)}
        style={styles.quickActions}
      >
        <Text style={[styles.sectionTitle, { color: c.neutral[900] }]}>
          {t.home.quickActions}
        </Text>
        <View style={styles.actionGrid}>
          <QuickActionCard
            emoji="📊"
            title={t.home.history}
            subtitle={`${totalScans} ${t.common.scans}`}
            color={c.accent.purple}
            onPress={onNavigateToHistory}
            delay={400}
          />
          <QuickActionCard
            emoji="🪙"
            title={t.home.getTokens}
            subtitle={t.home.watchAndEarn}
            color={c.accent.orange}
            onPress={onNavigateToWallet}
            delay={500}
          />
        </View>
      </Animated.View>

      {/* How it Works */}
      <Animated.View
        entering={FadeInUp.delay(500).duration(500)}
        style={styles.howItWorks}
      >
        <Text style={[styles.sectionTitle, { color: c.neutral[900] }]}>
          {t.home.howItWorks}
        </Text>
        <View style={styles.steps}>
          <StepItem number="1" title={t.home.stepUpload} description={t.home.stepUploadDesc} delay={600} />
          <StepItem number="2" title={t.home.stepAnalyze} description={t.home.stepAnalyzeDesc} delay={700} />
          <StepItem number="3" title={t.home.stepResult} description={t.home.stepResultDesc} delay={800} />
        </View>
      </Animated.View>
    </Screen>
  );
}

function QuickActionCard({
  emoji,
  title,
  subtitle,
  color,
  onPress,
  delay,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
  delay: number;
}) {
  const c = useThemeColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(400).springify()}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          haptic.selection();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.95, motion.spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motion.spring.gentle);
        }}
      >
        <Animated.View style={[styles.actionCard, { backgroundColor: c.neutral[0] }, animatedStyle, shadows.md]}>
          <View style={[styles.actionIconBg, { backgroundColor: color + '15' }]}>
            <Text style={styles.actionEmoji}>{emoji}</Text>
          </View>
          <Text style={[styles.actionTitle, { color: c.neutral[900] }]}>{title}</Text>
          <Text style={[styles.actionSubtitle, { color: c.neutral[500] }]}>{subtitle}</Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function StepItem({
  number,
  title,
  description,
  delay,
}: {
  number: string;
  title: string;
  description: string;
  delay: number;
}) {
  const c = useThemeColors();

  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400)}
      style={[styles.stepItem, { backgroundColor: c.neutral[0] }]}
    >
      <View style={[styles.stepNumber, { backgroundColor: c.primary[500] }]}>
        <Text style={[styles.stepNumberText, { color: c.neutral[0] }]}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={[styles.stepTitle, { color: c.neutral[900] }]}>{title}</Text>
        <Text style={[styles.stepDescription, { color: c.neutral[500] }]}>{description}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ctaGlow: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    height: 80,
    borderRadius: 40,
    zIndex: 0,
  },
  tokenBanner: {
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    marginBottom: spacing['2xl'],
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tokenInfo: {
    flex: 1,
  },
  tokenLabel: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
  },
  tokenCount: {
    ...typography.hero,
    marginTop: 4,
  },
  tokenStats: {
    marginRight: spacing.xl,
  },
  tokenStat: {
    alignItems: 'center',
  },
  tokenStatValue: {
    ...typography.h3,
  },
  tokenStatLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  tokenBadge: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    opacity: 0.15,
  },
  tokenBadgeText: {
    fontSize: 80,
  },
  uploadCard: {
    marginBottom: spacing['2xl'],
    borderWidth: 1,
  },
  uploadContent: {
    alignItems: 'center',
  },
  uploadIconContainer: {
    marginBottom: spacing.lg,
  },
  uploadIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconText: {
    fontSize: 36,
  },
  uploadTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
  },
  uploadDescription: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  uploadButton: {
    width: '100%',
  },
  uploadButtonGradient: {
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  uploadButtonText: {
    ...typography.button,
  },
  socialCard: {
    marginBottom: spacing['2xl'],
    borderWidth: 1,
  },
  socialContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  socialIconBg: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialText: {
    flex: 1,
  },
  socialTitle: {
    ...typography.bodyMedium,
    marginBottom: 2,
  },
  socialDesc: {
    ...typography.caption,
    lineHeight: 16,
  },
  socialPlatforms: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },

  quickActions: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.lg,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    borderRadius: radius.xl,
    padding: spacing.lg,
    minWidth: 150,
  },
  actionIconBg: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionTitle: {
    ...typography.bodyMedium,
  },
  actionSubtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  howItWorks: {
    marginBottom: spacing.xl,
  },
  steps: {
    gap: spacing.lg,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  stepNumberText: {
    ...typography.bodyMedium,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typography.bodyMedium,
  },
  stepDescription: {
    ...typography.caption,
    marginTop: 2,
  },
});
