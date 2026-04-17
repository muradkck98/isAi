import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Share, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/layout/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { CLASSIFICATION_COLORS } from '../../constants';
import { useScanStore } from '../../store/useScanStore';
import { haptic } from '../../utils/haptics';
import { formatPercentage } from '../../utils/format';
import type { SocialPostMeta, SocialPlatform } from '../../types';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Platform config ──────────────────────────────────────────────────────────
const PLATFORM_CFG: Record<SocialPlatform, { label: string; icon: IoniconsName; color: string }> = {
  instagram: { label: 'Instagram',   icon: 'logo-instagram', color: '#E1306C' },
  twitter:   { label: 'X (Twitter)', icon: 'logo-twitter',   color: '#1DA1F2' },
  tiktok:    { label: 'TikTok',      icon: 'logo-tiktok',    color: '#FE2C55' },
  facebook:  { label: 'Facebook',    icon: 'logo-facebook',  color: '#1877F2' },
  unknown:   { label: 'Social Post', icon: 'globe-outline',  color: '#6B7280' },
};

// ─── Score zones (0–100) with colors ─────────────────────────────────────────
// Labels are looked up from translations at render time via ZONE_KEYS
const ZONES = [
  { from: 0,  to: 30,  color: '#10B981', key: 'zoneReal'        },
  { from: 30, to: 50,  color: '#3B82F6', key: 'zoneLikelyReal'  },
  { from: 50, to: 65,  color: '#94A3B8', key: 'zoneUncertain'   },
  { from: 65, to: 80,  color: '#F59E0B', key: 'zoneLikelyAI'    },
  { from: 80, to: 100, color: '#EF4444', key: 'zoneAI'          },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────
interface ResultScreenProps {
  onGoHome: () => void;
  onScanAnother: () => void;
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function ResultScreen({ onGoHome, onScanAnother }: ResultScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { currentScan } = useScanStore();
  const { width } = useWindowDimensions();

  if (!currentScan) {
    return (
      <Screen inTabNavigator backgroundColor={c.background.secondary}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
          <Text style={{ ...typography.h3, color: c.neutral[900], marginBottom: spacing.sm, textAlign: 'center' }}>
            {t.empty.somethingWrong}
          </Text>
          <Text style={{ ...typography.body, color: c.neutral[500], textAlign: 'center', marginBottom: spacing['2xl'] }}>
            {t.empty.tryAgainLater}
          </Text>
          <Button title={t.result.goHome} onPress={onGoHome} variant="primary" size="lg" />
        </View>
      </Screen>
    );
  }

  const scan = currentScan;

  const classColor = CLASSIFICATION_COLORS[scan.classification];
  const classLabel = t.classifications[scan.classification];
  const humanProb  = 100 - scan.aiProbability;
  const socialMeta = scan.metadata?.socialMeta as SocialPostMeta | undefined;

  // ── Animated counter ──────────────────────────────────────────────────────
  const [displayPercent, setDisplayPercent] = useState(0);
  useEffect(() => {
    haptic.success();
    const target   = scan.aiProbability;
    const duration = 1600;
    const interval = 16;
    const steps    = duration / interval;
    const inc      = target / steps;
    let   current  = 0;

    const timer = setInterval(() => {
      current += inc;
      if (current >= target) {
        setDisplayPercent(target);
        clearInterval(timer);
      } else {
        setDisplayPercent(current);
      }
    }, interval);
    return () => clearInterval(timer);
  }, []);

  // ── Ring progress animation ───────────────────────────────────────────────
  const ringProgress = useSharedValue(0);
  useEffect(() => {
    ringProgress.value = withDelay(
      300,
      withTiming(scan.aiProbability / 100, { duration: 1500, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  // ── Scale bar marker ──────────────────────────────────────────────────────
  const markerX = useSharedValue(0);
  const barWidth = width - spacing.xl * 2 - spacing.lg * 2; // card padding
  useEffect(() => {
    markerX.value = withDelay(
      400,
      withSpring((scan.aiProbability / 100) * barWidth, { damping: 16, stiffness: 120 }),
    );
  }, [barWidth]);

  const markerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: markerX.value - 8 }], // center the 16px dot
  }));

  // ── Breakdown bar animations ──────────────────────────────────────────────
  const aiBarWidth  = useSharedValue(0);
  const humBarWidth = useSharedValue(0);
  useEffect(() => {
    aiBarWidth.value  = withDelay(500, withTiming(scan.aiProbability / 100, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    humBarWidth.value = withDelay(700, withTiming(humanProb / 100, { duration: 1000, easing: Easing.out(Easing.cubic) }));
  }, []);

  const aiBarStyle  = useAnimatedStyle(() => ({ flex: aiBarWidth.value  * 100 || 0.001 }));
  const humBarStyle = useAnimatedStyle(() => ({ flex: humBarWidth.value * 100 || 0.001 }));

  const handleShare = async () => {
    haptic.medium();
    try {
      await Share.share({
        message: t.result.shareMessage
          .replace('{percent}', formatPercentage(scan.aiProbability))
          .replace('{label}', classLabel),
      });
    } catch {}
  };

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
      <View style={styles.container}>

        {/* ── Social Post Context Card ─────────────────────────────────── */}
        {socialMeta && (
          <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.sectionGap}>
            <SocialPostCard meta={socialMeta} />
          </Animated.View>
        )}

        {/* ── Score Hero ───────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(socialMeta ? 100 : 0).duration(600).springify()}
          style={styles.sectionGap}
        >
          <LinearGradient
            colors={[classColor + '22', classColor + '08', 'transparent']}
            style={[styles.scoreHero, { borderColor: classColor + '30' }]}
          >
            {/* Classification badge */}
            <View style={[styles.classBadge, { backgroundColor: classColor + '18' }]}>
              <Text style={[styles.classBadgeText, { color: classColor }]}>{classLabel}</Text>
            </View>

            {/* Animated percentage */}
            <Text style={[styles.bigPercent, { color: classColor }]}>
              {formatPercentage(displayPercent)}
            </Text>
            <Text style={[styles.bigPercentLabel, { color: c.neutral[500] }]}>
              {t.result.aiProbability}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ── Colored Zone Scale Bar ───────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(250).duration(500)}
          style={styles.sectionGap}
        >
          <Card variant="elevated" padding="lg">
            <Text style={[styles.sectionLabel, { color: c.neutral[400] }]}>
              {t.result.probabilityScale}
            </Text>

            {/* Zone bar */}
            <View style={styles.zoneBarWrapper}>
              <View style={styles.zoneBar}>
                {ZONES.map((z) => (
                  <View
                    key={z.from}
                    style={[
                      styles.zoneSegment,
                      {
                        flex: z.to - z.from,
                        backgroundColor: z.color,
                        opacity: scan.aiProbability >= z.from && scan.aiProbability < z.to ? 1 : 0.35,
                      },
                    ]}
                  />
                ))}
              </View>

              {/* Animated marker */}
              <Animated.View style={[styles.markerWrapper, markerStyle]}>
                <View style={[styles.markerDot, { backgroundColor: classColor, borderColor: c.neutral[0] }]} />
                <View style={[styles.markerLine, { backgroundColor: classColor }]} />
              </Animated.View>
            </View>

            {/* Zone labels */}
            <View style={styles.zoneLabels}>
              <Text style={[styles.zoneLabelText, { color: '#10B981' }]}>{t.result.zoneReal}</Text>
              <Text style={[styles.zoneLabelText, { color: '#94A3B8' }]}>{t.result.zoneUncertain}</Text>
              <Text style={[styles.zoneLabelText, { color: '#F59E0B' }]}>{t.result.zoneLikelyAI}</Text>
              <Text style={[styles.zoneLabelText, { color: '#EF4444' }]}>{t.result.zoneAI}</Text>
            </View>
          </Card>
        </Animated.View>

        {/* ── AI / Human Breakdown Bars ────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(350).duration(500)}
          style={styles.sectionGap}
        >
          <Card variant="elevated" padding="lg">
            <Text style={[styles.sectionLabel, { color: c.neutral[400] }]}>
              {t.result.distributionAnalysis}
            </Text>

            {/* AI bar */}
            <BreakdownRow
              label={t.result.aiGenerated}
              percent={scan.aiProbability}
              barStyle={aiBarStyle}
              color={classColor}
              neutralColor={c.neutral[100]}
              textColor={c.neutral[700]}
            />

            <View style={[styles.breakdownDivider, { backgroundColor: c.neutral[100] }]} />

            {/* Human bar */}
            <BreakdownRow
              label={t.result.realHuman}
              percent={humanProb}
              barStyle={humBarStyle}
              color="#10B981"
              neutralColor={c.neutral[100]}
              textColor={c.neutral[700]}
            />
          </Card>
        </Animated.View>

        {/* ── AI Generator Breakdown ───────────────────────────────────── */}
        {scan.aiGenerators && Object.keys(scan.aiGenerators).length > 0 && (
          <Animated.View entering={FadeInUp.delay(430).duration(500)} style={styles.sectionGap}>
            <AIGeneratorCard generators={scan.aiGenerators} classColor={classColor} />
          </Animated.View>
        )}

        {/* ── Confidence Row ───────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(450).duration(500)} style={styles.sectionGap}>
          <Card variant="elevated" padding="lg">
            <View style={styles.confidenceRow}>
              <ConfidencePill
                label={t.result.confidence}
                value={
                  scan.confidenceLevel === 'high'
                    ? t.result.high
                    : scan.confidenceLevel === 'medium'
                    ? t.result.medium
                    : t.result.low
                }
                color={
                  scan.confidenceLevel === 'high'
                    ? c.success
                    : scan.confidenceLevel === 'medium'
                    ? c.warning
                    : c.neutral[400]
                }
                textColor={c.neutral[900]}
                labelColor={c.neutral[500]}
              />
              <View style={[styles.divider, { backgroundColor: c.neutral[200] }]} />
              <ConfidencePill
                label={t.result.classification}
                value={classLabel}
                color={classColor}
                textColor={classColor}
                labelColor={c.neutral[500]}
              />
            </View>
          </Card>
        </Animated.View>

        {/* ── Explanation ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(520).duration(500)} style={styles.sectionGap}>
          <Card variant="filled" padding="md" style={styles.explanationCard}>
            <View style={[styles.explanationIconBox, { backgroundColor: classColor + '15' }]}>
              <Ionicons
                name={
                  scan.aiProbability > 70
                    ? 'warning-outline'
                    : scan.aiProbability > 40
                    ? 'help-circle-outline'
                    : 'checkmark-circle-outline'
                }
                size={20}
                color={classColor}
              />
            </View>
            <Text style={[styles.explanationText, { color: c.neutral[600] }]}>
              {scan.aiProbability > 70
                ? t.result.highAiExplanation
                : scan.aiProbability > 40
                ? t.result.uncertainExplanation
                : t.result.lowAiExplanation}
            </Text>
          </Card>
        </Animated.View>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.actions}>
          <Button
            title={t.result.shareResult}
            onPress={handleShare}
            variant="primary"
            size="lg"
            icon={<Ionicons name="share-outline" size={18} color="#fff" />}
          />
          <Button
            title={t.result.scanAnother}
            onPress={onScanAnother}
            variant="outline"
            size="lg"
          />
          <Button
            title={t.result.goHome}
            onPress={onGoHome}
            variant="ghost"
            size="md"
          />
        </Animated.View>

      </View>
    </Screen>
  );
}

// ─── Breakdown Row ────────────────────────────────────────────────────────────
function BreakdownRow({
  label,
  percent,
  barStyle,
  color,
  neutralColor,
  textColor,
}: {
  label: string;
  percent: number;
  barStyle: ReturnType<typeof useAnimatedStyle>;
  color: string;
  neutralColor: string;
  textColor: string;
}) {
  return (
    <View style={breakdownStyles.row}>
      <View style={breakdownStyles.labelRow}>
        <Text style={[breakdownStyles.label, { color: textColor }]}>{label}</Text>
        <Text style={[breakdownStyles.percent, { color }]}>
          {formatPercentage(percent)}
        </Text>
      </View>
      <View style={[breakdownStyles.track, { backgroundColor: neutralColor }]}>
        <Animated.View style={[breakdownStyles.fill, { backgroundColor: color }, barStyle]} />
      </View>
    </View>
  );
}

const breakdownStyles = StyleSheet.create({
  row:      { gap: spacing.sm },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:    { ...typography.bodySm },
  percent:  { ...typography.bodyMedium, fontSize: 15, fontWeight: '700' },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});

// ─── Confidence Pill ──────────────────────────────────────────────────────────
function ConfidencePill({
  label, value, color, textColor, labelColor,
}: {
  label: string; value: string; color: string; textColor: string; labelColor: string;
}) {
  return (
    <View style={pillStyles.item}>
      <Text style={[pillStyles.label, { color: labelColor }]}>{label}</Text>
      <View style={pillStyles.valueRow}>
        <View style={[pillStyles.dot, { backgroundColor: color }]} />
        <Text style={[pillStyles.value, { color: textColor }]}>{value}</Text>
      </View>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  item:     { flex: 1, alignItems: 'center' },
  label:    { ...typography.caption, marginBottom: spacing.xs },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  dot:      { width: 8, height: 8, borderRadius: 4 },
  value:    { ...typography.bodyMedium },
});

// ─── Generator labels ─────────────────────────────────────────────────────────
const GENERATOR_LABELS: Record<string, string> = {
  gpt:              'ChatGPT / DALL-E 3',
  dalle:            'DALL-E',
  midjourney:       'Midjourney',
  stable_diffusion: 'Stable Diffusion',
  flux:             'Flux',
  firefly:          'Adobe Firefly',
  ideogram:         'Ideogram',
  imagen:           'Google Imagen',
  higgsfield:       'Higgsfield',
  qwen:             'Qwen',
  recraft:          'Recraft',
  reve:             'Reve',
  seedream:         'Seedream',
  wan:              'WAN',
  z_image:          'Z-Image',
  gan:              'GAN',
  other:            'Other AI',
};

// ─── AI Generator Card ────────────────────────────────────────────────────────
function AIGeneratorCard({
  generators,
  classColor,
}: {
  generators: Record<string, number>;
  classColor: string;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();

  // Sort by score desc, show all with score > 0
  const sorted = Object.entries(generators)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  const topScore = sorted[0]?.[1] ?? 1;

  // Animated bar widths
  const barValues = sorted.map(() => useSharedValue(0));
  useEffect(() => {
    barValues.forEach((sv, i) => {
      sv.value = withDelay(
        500 + i * 60,
        withTiming(sorted[i][1] / topScore, { duration: 800, easing: Easing.out(Easing.cubic) })
      );
    });
  }, []);

  return (
    <Card variant="elevated" padding="lg">
      <Text style={[styles.sectionLabel, { color: c.neutral[400] }]}>
        {t.result.aiGeneratorDetected}
      </Text>

      <View style={genStyles.list}>
        {sorted.map(([key, pct], i) => {
          const label = GENERATOR_LABELS[key] ?? key;
          const isTop = i === 0;
          const barStyle = useAnimatedStyle(() => ({
            width: `${barValues[i].value * 100}%` as any,
          }));

          return (
            <View key={key} style={genStyles.row}>
              {/* Label + badge */}
              <View style={genStyles.labelRow}>
                <View style={genStyles.labelLeft}>
                  {isTop && (
                    <View style={[genStyles.topBadge, { backgroundColor: classColor + '20' }]}>
                      <Text style={[genStyles.topBadgeText, { color: classColor }]}>TOP</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      genStyles.label,
                      { color: isTop ? c.neutral[900] : c.neutral[600] },
                      isTop && { fontWeight: '700' },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </View>
                <Text
                  style={[
                    genStyles.pct,
                    { color: isTop ? classColor : c.neutral[500] },
                    isTop && { fontWeight: '700' },
                  ]}
                >
                  {pct}%
                </Text>
              </View>

              {/* Bar */}
              <View style={[genStyles.track, { backgroundColor: c.neutral[100] }]}>
                <Animated.View
                  style={[
                    genStyles.fill,
                    { backgroundColor: isTop ? classColor : c.neutral[300] },
                    barStyle,
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const genStyles = StyleSheet.create({
  list:     { gap: spacing.md },
  row:      { gap: 5 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelLeft:{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1 },
  topBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  topBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  label:    { ...typography.bodySm, flex: 1 },
  pct:      { ...typography.bodySm, minWidth: 42, textAlign: 'right' },
  track:    { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 4 },
});

// ─── Social Post Card ─────────────────────────────────────────────────────────
function SocialPostCard({ meta }: { meta: SocialPostMeta }) {
  const c   = useThemeColors();
  const { t } = useTranslation();
  const cfg = PLATFORM_CFG[meta.platform];

  return (
    <Card
      variant="filled"
      padding="md"
      style={[styles.socialCard, { borderColor: cfg.color + '30', borderWidth: 1 }]}
    >
      <View style={styles.socialCardHeader}>
        <View style={[styles.socialPlatformBadge, { backgroundColor: cfg.color + '15' }]}>
          <Ionicons name={cfg.icon} size={14} color={cfg.color} />
          <Text style={[styles.socialPlatformLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <Text style={[styles.socialPostLabel, { color: c.neutral[400] }]}>
          {t.result.socialPost}
        </Text>
      </View>

      {meta.authorName && (
        <View style={styles.socialAuthorRow}>
          <Ionicons name="person-outline" size={12} color={c.neutral[400]} />
          <Text style={[styles.socialAuthor, { color: c.neutral[600] }]} numberOfLines={1}>
            {t.result.postedBy} {meta.authorName}
          </Text>
        </View>
      )}

      {meta.caption && (
        <Text style={[styles.socialCaption, { color: c.neutral[500] }]} numberOfLines={2}>
          {meta.caption}
        </Text>
      )}
    </Card>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  sectionGap: {
    marginBottom: spacing.lg,
  },

  // Score hero
  scoreHero: {
    borderRadius: radius['2xl'],
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  classBadge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  classBadgeText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  bigPercent: {
    fontSize: 72,
    fontWeight: '900',
    letterSpacing: -2,
    lineHeight: 80,
  },
  bigPercentLabel: {
    ...typography.bodySm,
    marginTop: 2,
  },

  // Section label
  sectionLabel: {
    ...typography.captionMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.md,
  },

  // Zone bar
  zoneBarWrapper: {
    marginBottom: spacing.sm,
  },
  zoneBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  zoneSegment: {
    height: '100%',
  },
  markerWrapper: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
  },
  markerDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    ...StyleSheet.absoluteFillObject,
    top: -4,
  },
  markerLine: {
    width: 2,
    height: 8,
    marginTop: 16,
  },
  zoneLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  zoneLabelText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },

  // Breakdown
  breakdownDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },

  // Confidence
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 44,
    marginHorizontal: spacing.lg,
  },

  // Explanation
  explanationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  explanationIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationText: {
    ...typography.bodySm,
    flex: 1,
    lineHeight: 20,
  },

  // Actions
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },

  // Social card
  socialCard: {
    gap: spacing.xs,
  },
  socialCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  socialPlatformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  socialPlatformLabel: {
    ...typography.captionMedium,
    fontSize: 12,
  },
  socialPostLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  socialAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  socialAuthor: {
    ...typography.captionMedium,
    fontSize: 12,
    flex: 1,
  },
  socialCaption: {
    ...typography.caption,
    lineHeight: 16,
  },
});
