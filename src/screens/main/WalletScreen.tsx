import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/layout/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { motion } from '../../theme/motion';
import { useWalletStore } from '../../store/useWalletStore';
import { useAuthStore } from '../../store/useAuthStore';
import { TOKEN_PACKS } from '../../constants';
import { haptic } from '../../utils/haptics';
import { formatPrice } from '../../utils/format';
import { showRewardedAd } from '../../lib/ads';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../types';

// ─── Token Earned Modal ───────────────────────────────────────────────────────

function TokenEarnedModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const scale    = useSharedValue(0.7);
  const opacity  = useSharedValue(0);
  const rotate   = useSharedValue(0);
  const glow     = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value   = withSpring(1, { damping: 14, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
      rotate.value  = withSequence(
        withTiming(-8,  { duration: 80 }),
        withTiming(8,   { duration: 80 }),
        withTiming(-5,  { duration: 60 }),
        withTiming(5,   { duration: 60 }),
        withTiming(0,   { duration: 60 }),
      );
      glow.value = withRepeat(
        withSequence(withTiming(1, { duration: 900 }), withTiming(0.4, { duration: 900 })),
        -1, true
      );
    } else {
      scale.value   = withTiming(0.85, { duration: 150 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const cardStyle  = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));
  const glowStyle  = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.2, 0.6]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.15]) }],
  }));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={modal.overlay}>
        <Animated.View style={[modal.card, cardStyle]}>
          {/* Glow ring */}
          <Animated.View style={[modal.glow, glowStyle]} />

          {/* Icon */}
          <LinearGradient
            colors={['#F59E0B', '#EF4444']}
            style={modal.iconBg}
          >
            <Text style={modal.iconText}>🪙</Text>
          </LinearGradient>

          {/* Title */}
          <Text style={modal.title}>{t.wallet.tokenEarned}</Text>
          <Text style={modal.subtitle}>{t.wallet.tokenEarnedSubtitle}</Text>

          {/* Token count pill */}
          <View style={modal.pill}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={modal.pillText}>{t.wallet.tokenAddedBalance}</Text>
          </View>

          {/* CTA */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={modal.btn}>
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={modal.btnGradient}
            >
              <Text style={modal.btnText}>{t.wallet.continueBtn}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export function WalletScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { tokens, totalScans, totalPurchased, totalEarnedFromAds, addAdTokensRemote } =
    useWalletStore();
  const { user } = useAuthStore();
  const [adLoading, setAdLoading]       = useState(false);
  const [showEarned, setShowEarned]     = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const handleWatchAd = async () => {
    if (!user?.id || adLoading) return;
    haptic.medium();
    setAdLoading(true);
    try {
      const result = await showRewardedAd();
      if (result.earned) {
        await addAdTokensRemote(user.id);
        haptic.success();
        setShowEarned(true);
      }
    } catch {
      Alert.alert(t.empty.somethingWrong, t.wallet.adError);
    } finally {
      setAdLoading(false);
    }
  };

  const handleBuyPack = () => {
    haptic.medium();
    navigation.navigate('Paywall');
  };

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
      <View style={styles.container}>

        {/* ── Balance Card ──────────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.duration(600).springify()}>
          <LinearGradient
            colors={[c.primary[500], c.primary[700]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>{t.wallet.tokenBalance}</Text>
            <Text style={[styles.balanceValue, { color: c.neutral[0] }]}>{tokens}</Text>
            <Text style={styles.balanceSubtext}>{t.wallet.tokensAvailable}</Text>

            <View style={styles.statsRow}>
              <StatItem value={totalScans}         label={t.common.scans} />
              <View style={styles.statDivider} />
              <StatItem value={totalPurchased}     label={t.wallet.purchased} />
              <View style={styles.statDivider} />
              <StatItem value={totalEarnedFromAds} label={t.wallet.fromAds} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── Watch Ad Section ──────────────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Card variant="elevated" padding="lg" style={styles.adCard}>
            <View style={styles.adHeader}>
              <View style={[styles.adIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.adIcon}>🎬</Text>
              </View>
              <View style={styles.adInfo}>
                <Text style={[styles.adTitle, { color: c.neutral[900] }]}>
                  {t.wallet.watchAndEarn}
                </Text>
                <Text style={[styles.adSubtitle, { color: c.neutral[500] }]}>
                  {t.wallet.watchAdDescription}
                </Text>
              </View>
              <View style={[styles.adBadge, { backgroundColor: '#DCFCE7' }]}>
                <Text style={[styles.adBadgeText, { color: '#16A34A' }]}>+1 🪙</Text>
              </View>
            </View>

            {adLoading ? (
              <View style={styles.adLoadingRow}>
                <ActivityIndicator size="small" color={c.primary[500]} />
                <Text style={[styles.adLoadingText, { color: c.neutral[500] }]}>
                  {t.wallet.loadingAd}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleWatchAd}
                activeOpacity={0.88}
                style={styles.adBtn}
              >
                <LinearGradient
                  colors={['#F59E0B', '#EF4444']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.adBtnGradient}
                >
                  <Ionicons name="play-circle-outline" size={20} color="#fff" />
                  <Text style={styles.adBtnText}>{t.wallet.watchAdButton}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Card>
        </Animated.View>

        {/* ── Token Packs ───────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(500)}
          style={styles.packsSection}
        >
          <View style={styles.packsSectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.neutral[900] }]}>
              {t.wallet.tokenPacks}
            </Text>
            <View style={[styles.sectionBadge, { backgroundColor: c.primary[50] }]}>
              <Text style={[styles.sectionBadgeText, { color: c.primary[600] }]}>
                1 token = 1 scan
              </Text>
            </View>
          </View>
          {TOKEN_PACKS.map((pack, index) => (
            <TokenPackCard
              key={pack.id}
              name={pack.name}
              tokens={pack.tokens}
              price={pack.price}
              currency={pack.currency}
              popular={pack.popular}
              delay={400 + index * 100}
              onPress={handleBuyPack}
            />
          ))}
        </Animated.View>

      </View>

      {/* Token Earned Modal */}
      <TokenEarnedModal visible={showEarned} onClose={() => setShowEarned(false)} />
    </Screen>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Token Pack Card ──────────────────────────────────────────────────────────

function TokenPackCard({
  name, tokens, price, currency, popular, delay, onPress,
}: {
  name: string; tokens: number; price: number; currency: string;
  popular?: boolean; delay: number; onPress: () => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400).springify()}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.97, motion.spring.snappy); }}
        onPressOut={() => { scale.value = withSpring(1, motion.spring.gentle); }}
      >
        <Animated.View
          style={[
            styles.packCard,
            { backgroundColor: c.neutral[0], borderColor: c.neutral[100] },
            popular && [styles.packCardPopular, { borderColor: c.primary[300] }],
            animatedStyle,
            shadows.md,
          ]}
        >
          {popular && (
            <View style={[styles.popularBadge, { backgroundColor: c.primary[500] }]}>
              <Text style={[styles.popularText, { color: c.neutral[0] }]}>{t.wallet.mostPopular}</Text>
            </View>
          )}
          <View style={styles.packContent}>
            <View style={styles.packLeft}>
              <Text style={[styles.packName, { color: c.neutral[900] }]}>{name}</Text>
              <Text style={[styles.packTokens, { color: c.neutral[500] }]}>{tokens} tokens</Text>
            </View>
            <View style={styles.packRight}>
              <Text style={[styles.packPrice, { color: c.primary[600] }]}>
                {formatPrice(price, currency)}
              </Text>
              <Text style={[styles.packPerToken, { color: c.neutral[400] }]}>
                {formatPrice(price / tokens, currency)}{t.wallet.perScan}
              </Text>
            </View>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingTop: spacing['2xl'], paddingBottom: spacing.xl },

  // Balance card
  balanceCard: {
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  balanceLabel:   { ...typography.bodySm, color: 'rgba(255,255,255,0.7)' },
  balanceValue:   { fontSize: 56, fontWeight: '800', marginVertical: spacing.sm },
  balanceSubtext: { ...typography.body, color: 'rgba(255,255,255,0.6)', marginBottom: spacing.xl },
  statsRow: {
    flexDirection: 'row', width: '100%', justifyContent: 'space-around',
    paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)',
  },
  statItem:   { alignItems: 'center' },
  statValue:  { ...typography.h4, color: '#fff' },
  statLabel:  { ...typography.caption, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  statDivider:{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Ad card
  adCard: { marginBottom: spacing['2xl'] },
  adHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  adIconBg: { width: 48, height: 48, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  adIcon: { fontSize: 26 },
  adInfo: { flex: 1 },
  adTitle:    { ...typography.h4 },
  adSubtitle: { ...typography.bodySm, marginTop: 2 },
  adBadge: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  adBadgeText: { ...typography.captionMedium, fontWeight: '700' },
  adLoadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md,
  },
  adLoadingText: { ...typography.bodySm },
  adBtn: { borderRadius: radius.xl, overflow: 'hidden' },
  adBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14,
  },
  adBtnText: { ...typography.button, color: '#fff' },

  // Packs section
  packsSection: { gap: spacing.md },
  packsSectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  sectionTitle: { ...typography.h4 },
  sectionBadge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  sectionBadgeText: { ...typography.caption, fontWeight: '600' },

  packCard: { borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1 },
  packCardPopular: { borderWidth: 2 },
  popularBadge: {
    position: 'absolute', top: -10, right: spacing.lg,
    paddingHorizontal: spacing.md, paddingVertical: 3, borderRadius: radius.sm,
  },
  popularText: { ...typography.captionMedium, fontSize: 10, letterSpacing: 0.5 },
  packContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packLeft: {},
  packName:     { ...typography.bodyMedium },
  packTokens:   { ...typography.bodySm, marginTop: 2 },
  packRight:    { alignItems: 'flex-end' },
  packPrice:    { ...typography.h4 },
  packPerToken: { ...typography.caption, marginTop: 2 },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: radius['3xl'] ?? 28,
    padding: spacing['3xl'],
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.5, shadowRadius: 40 },
      android: { elevation: 24 },
    }),
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F59E0B',
    top: -20,
    opacity: 0.3,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  iconText: { fontSize: 40 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
    marginBottom: spacing['2xl'],
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  btn: {
    width: '100%',
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
