import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
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
import { TOKEN_PACKS } from '../../constants';
import { haptic } from '../../utils/haptics';
import { formatPrice } from '../../utils/format';

export function WalletScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { tokens, totalScans, totalPurchased, totalEarnedFromAds, addTokensFromAd } =
    useWalletStore();

  const handleWatchAd = () => {
    haptic.success();
    addTokensFromAd();
  };

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
      <View style={styles.container}>
        {/* Balance Card */}
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
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.neutral[0] }]}>{totalScans}</Text>
                <Text style={styles.statLabel}>{t.common.scans}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.neutral[0] }]}>{totalPurchased}</Text>
                <Text style={styles.statLabel}>{t.wallet.purchased}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.neutral[0] }]}>{totalEarnedFromAds}</Text>
                <Text style={styles.statLabel}>{t.wallet.fromAds}</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Watch Ad Section */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Card variant="elevated" padding="lg" style={styles.adCard}>
            <View style={styles.adRow}>
              <View style={styles.adInfo}>
                <Text style={[styles.adTitle, { color: c.neutral[900] }]}>{t.wallet.watchAndEarn}</Text>
                <Text style={[styles.adSubtitle, { color: c.neutral[500] }]}>
                  {t.wallet.watchAdDescription}
                </Text>
              </View>
              <Text style={styles.adEmoji}>🎬</Text>
            </View>
            <Button
              title={t.wallet.watchAdButton}
              onPress={handleWatchAd}
              variant="secondary"
              size="md"
            />
          </Card>
        </Animated.View>

        {/* Token Packs */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(500)}
          style={styles.packsSection}
        >
          <Text style={[styles.sectionTitle, { color: c.neutral[900] }]}>{t.wallet.tokenPacks}</Text>
          {TOKEN_PACKS.map((pack, index) => (
            <TokenPackCard
              key={pack.id}
              name={pack.name}
              tokens={pack.tokens}
              price={pack.price}
              currency={pack.currency}
              popular={pack.popular}
              delay={400 + index * 100}
              onPress={() => haptic.medium()}
            />
          ))}
        </Animated.View>
      </View>
    </Screen>
  );
}

function TokenPackCard({
  name,
  tokens,
  price,
  currency,
  popular,
  delay,
  onPress,
}: {
  name: string;
  tokens: number;
  price: number;
  currency: string;
  popular?: boolean;
  delay: number;
  onPress: () => void;
}) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(400).springify()}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, motion.spring.snappy);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motion.spring.gentle);
        }}
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

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  balanceCard: {
    borderRadius: radius['2xl'],
    padding: spacing['2xl'],
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  balanceLabel: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.7)',
  },
  balanceValue: {
    fontSize: 56,
    fontWeight: '800',
    marginVertical: spacing.sm,
  },
  balanceSubtext: {
    ...typography.body,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.h4,
  },
  statLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  adCard: {
    marginBottom: spacing['2xl'],
  },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  adInfo: {
    flex: 1,
  },
  adTitle: {
    ...typography.h4,
  },
  adSubtitle: {
    ...typography.bodySm,
    marginTop: 2,
  },
  adEmoji: {
    fontSize: 36,
    marginLeft: spacing.lg,
  },
  packsSection: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    marginBottom: spacing.sm,
  },
  packCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
  },
  packCardPopular: {
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  popularText: {
    ...typography.captionMedium,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  packContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packLeft: {},
  packName: {
    ...typography.bodyMedium,
  },
  packTokens: {
    ...typography.bodySm,
    marginTop: 2,
  },
  packRight: {
    alignItems: 'flex-end',
  },
  packPrice: {
    ...typography.h4,
  },
  packPerToken: {
    ...typography.caption,
    marginTop: 2,
  },
});
