import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { useWalletStore } from '../../store/useWalletStore';
import { useAuthStore } from '../../store/useAuthStore';
import { TOKEN_PACKS } from '../../constants';
import { haptic } from '../../utils/haptics';
import { formatPrice } from '../../utils/format';
import { purchaseTokenPack } from '../../lib/purchases';
import { showRewardedAd } from '../../lib/ads';

const { width: W, height: H } = Dimensions.get('window');

const FEATURES = [
  { icon: '🔍', title: 'AI Image Detection', desc: 'Powered by Sightengine' },
  { icon: '⚡', title: 'Instant Analysis', desc: 'Results in under 3 seconds' },
  { icon: '📱', title: 'Social Media Scan', desc: 'Instagram, TikTok, X, Facebook' },
  { icon: '📊', title: 'Detailed Reports', desc: 'Probability scores & explanations' },
  { icon: '🔒', title: 'Privacy First', desc: 'Images never stored permanently' },
  { icon: '🌍', title: '13 Languages', desc: 'Fully localized experience' },
];

const SOCIAL_PROOF = [
  { name: 'Sarah M.', country: '🇺🇸', text: 'Detected a deepfake in seconds. Incredible tool!', stars: 5 },
  { name: 'Kenji T.', country: '🇯🇵', text: 'Used it to verify news images. Works perfectly.', stars: 5 },
  { name: 'Ana B.', country: '🇧🇷', text: 'Simple, fast and accurate. Worth every token.', stars: 5 },
];

interface PaywallScreenProps {
  onClose?: () => void;
  onPurchase?: (tokens: number) => void;
}

export function PaywallScreen({ onClose, onPurchase }: PaywallScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { tokens, addAdTokensRemote, addPurchasedTokensRemote } = useWalletStore();
  const { user } = useAuthStore();
  const [selectedPack, setSelectedPack] = useState(
    TOKEN_PACKS.findIndex((p) => p.popular) ?? 1
  );
  const [loading, setLoading] = useState(false);
  const [adLoading, setAdLoading] = useState(false);

  // Pulse animation for the most popular badge
  const pulseScale = useSharedValue(1);
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const handlePurchase = async () => {
    haptic.medium();
    const pack = TOKEN_PACKS[selectedPack];
    if (!pack || !user?.id) return;

    setLoading(true);
    try {
      const result = await purchaseTokenPack(
        pack.id,
        pack.tokens,
        formatPrice(pack.price, pack.currency)
      );

      if (result.success && result.tokens) {
        await addPurchasedTokensRemote(user.id, result.tokens);
        haptic.success();
        onPurchase?.(result.tokens);
      }
      // userCancelled: silently ignore
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Purchase failed';
      Alert.alert('Purchase Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchAd = async () => {
    if (!user?.id || adLoading) return;
    haptic.medium();
    setAdLoading(true);
    try {
      const result = await showRewardedAd();
      if (result.earned) {
        await addAdTokensRemote(user.id);
        haptic.success();
        Alert.alert('🎉 +1 Token Earned!', 'Watch more ads to earn more tokens.');
      }
    } catch {
      Alert.alert('Error', 'Could not load ad. Try again later.');
    } finally {
      setAdLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background */}
      <LinearGradient
        colors={['#0F172A', '#1E1040', '#0F172A']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Close button */}
      {onClose && (
        <Animated.View entering={FadeIn.delay(300)} style={styles.closeContainer}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero section */}
        <Animated.View entering={FadeInDown.duration(700).springify()} style={styles.hero}>
          {/* Glow */}
          <View style={styles.glowContainer}>
            <View style={[styles.glow, { backgroundColor: '#6366F1' }]} />
          </View>

          {/* Icon */}
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.heroIcon}
          >
            <Text style={styles.heroIconText}>✦</Text>
          </LinearGradient>

          <Text style={styles.heroTitle}>Unlock isAi</Text>
          <Text style={styles.heroSubtitle}>
            Get tokens to detect AI-generated images instantly
          </Text>

          {/* Token balance pill */}
          <View style={styles.balancePill}>
            <Text style={styles.balanceIcon}>🪙</Text>
            <Text style={styles.balanceText}>{tokens} tokens remaining</Text>
          </View>
        </Animated.View>

        {/* Features grid */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Token packs */}
        <Animated.View entering={FadeInUp.delay(300).duration(600)} style={styles.packsSection}>
          <Text style={styles.sectionTitle}>{t.wallet.tokenPacks}</Text>
          <Text style={styles.sectionSubtitle}>1 token = 1 scan. No subscription required.</Text>

          {TOKEN_PACKS.map((pack, i) => {
            const isSelected = selectedPack === i;
            const perScan = formatPrice(pack.price / pack.tokens, pack.currency);
            return (
              <TouchableOpacity
                key={pack.id}
                onPress={() => { haptic.light(); setSelectedPack(i); }}
                activeOpacity={0.85}
              >
                <Animated.View
                  style={[
                    styles.packCard,
                    isSelected && styles.packCardSelected,
                    pack.popular && styles.packCardPopular,
                  ]}
                >
                  {pack.popular && (
                    <Animated.View style={[styles.popularBadge, pulseStyle]}>
                      <LinearGradient
                        colors={['#6366F1', '#8B5CF6']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.popularBadgeGradient}
                      >
                        <Text style={styles.popularBadgeText}>⭐ BEST VALUE</Text>
                      </LinearGradient>
                    </Animated.View>
                  )}

                  <View style={styles.packContent}>
                    <View style={styles.packLeft}>
                      <View style={styles.packTokenRow}>
                        <Text style={styles.packTokenCount}>{pack.tokens}</Text>
                        <Text style={styles.packTokenLabel}> tokens</Text>
                      </View>
                      <Text style={styles.packPerScan}>{perScan}/scan</Text>
                    </View>

                    <View style={styles.packRight}>
                      <Text style={[styles.packPrice, isSelected && styles.packPriceSelected]}>
                        {formatPrice(pack.price, pack.currency)}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedCheck}>
                          <LinearGradient
                            colors={['#6366F1', '#8B5CF6']}
                            style={styles.selectedCheckGradient}
                          >
                            <Text style={styles.selectedCheckIcon}>✓</Text>
                          </LinearGradient>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Savings tag */}
                  {pack.tokens >= 50 && (
                    <View style={styles.savingsTag}>
                      <Text style={styles.savingsText}>
                        Save {Math.round((1 - (pack.price / pack.tokens) / (TOKEN_PACKS[0].price / TOKEN_PACKS[0].tokens)) * 100)}%
                      </Text>
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Social proof */}
        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.socialProof}>
          <View style={styles.starsRow}>
            <Text style={styles.stars}>★★★★★</Text>
            <Text style={styles.starsLabel}>4.9 · 2,400+ reviews</Text>
          </View>
          {SOCIAL_PROOF.map((r, i) => (
            <View key={i} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewFlag}>{r.country}</Text>
                <Text style={styles.reviewName}>{r.name}</Text>
                <Text style={styles.reviewStars}>{'★'.repeat(r.stars)}</Text>
              </View>
              <Text style={styles.reviewText}>{r.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Bottom padding */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Sticky CTA footer */}
      <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.stickyFooter}>
        <LinearGradient
          colors={['transparent', '#0F172A', '#0F172A']}
          style={styles.stickyGradient}
          pointerEvents="none"
        />
        <View style={styles.stickyContent}>
          {/* Purchase button */}
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.88}
            style={styles.purchaseWrapper}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.purchaseButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.purchaseText}>
                    Get {TOKEN_PACKS[selectedPack]?.tokens ?? 0} Tokens
                  </Text>
                  <Text style={styles.purchasePrice}>
                    {formatPrice(TOKEN_PACKS[selectedPack]?.price ?? 0, TOKEN_PACKS[selectedPack]?.currency ?? 'USD')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Watch ad */}
          <TouchableOpacity
            onPress={handleWatchAd}
            disabled={adLoading}
            style={styles.adButton}
          >
            {adLoading ? (
              <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
            ) : (
              <Text style={styles.adButtonText}>🎬 Watch ad for +1 free token</Text>
            )}
          </TouchableOpacity>

          {/* Legal */}
          <Text style={styles.legal}>
            Secure payment · Cancel anytime · No subscription
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  closeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: spacing.xl,
    zIndex: 20,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeIcon: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: spacing.xl,
  },

  // Hero
  hero: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  glowContainer: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
  },
  glow: {
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.15,
    // blur is not supported in RN but opacity glow works
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  heroIconText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  balanceIcon: { fontSize: 16 },
  balanceText: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },

  // Features
  featuresGrid: {
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureIcon: { fontSize: 22, width: 32, textAlign: 'center' },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing['2xl'],
  },

  // Packs
  packsSection: {
    marginBottom: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: spacing.xl,
  },
  packCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  packCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  packCardPopular: {
    borderColor: '#8B5CF6',
  },
  popularBadge: {
    position: 'absolute',
    top: -1,
    right: spacing.lg,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    overflow: 'hidden',
  },
  popularBadgeGradient: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  packContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packLeft: {},
  packTokenRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packTokenCount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  packTokenLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  packPerScan: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
  },
  packRight: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  packPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
  },
  packPriceSelected: {
    color: '#A78BFA',
  },
  selectedCheck: {
    overflow: 'hidden',
    borderRadius: radius.full,
  },
  selectedCheckGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  savingsTag: {
    marginTop: spacing.sm,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },

  // Social proof
  socialProof: {
    marginBottom: spacing['2xl'],
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  stars: {
    fontSize: 18,
    color: '#FBBF24',
  },
  starsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  reviewFlag: { fontSize: 18 },
  reviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  reviewStars: {
    fontSize: 13,
    color: '#FBBF24',
  },
  reviewText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 19,
    fontStyle: 'italic',
  },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  stickyGradient: {
    height: 40,
    marginBottom: -1,
  },
  stickyContent: {
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  purchaseWrapper: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  purchaseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: spacing['2xl'],
  },
  purchaseText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  purchasePrice: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
  },
  adButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  adButtonText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.25)',
    textAlign: 'center',
  },
});
