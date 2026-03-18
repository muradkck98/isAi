import React, { useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { Screen } from '../../components/layout/Screen';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { shadows } from '../../theme/shadows';
import { CLASSIFICATION_COLORS } from '../../constants';
import { useScanStore } from '../../store/useScanStore';
import { useAuthStore } from '../../store/useAuthStore';
import { ScanResult } from '../../types';
import { formatPercentage, formatDate } from '../../utils/format';
import { haptic } from '../../utils/haptics';

export function HistoryScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { scanHistory, isLoadingHistory, fetchHistory } = useScanStore();
  const { user } = useAuthStore();

  // Fetch from Supabase on mount (falls back to local cache if offline)
  useEffect(() => {
    if (user?.id) {
      fetchHistory(user.id).catch(() => {});
    }
  }, [user?.id]);

  if (isLoadingHistory) {
    return (
      <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: c.neutral[900] }]}>{t.history.title}</Text>
          <SkeletonList count={5} />
        </View>
      </Screen>
    );
  }

  if (scanHistory.length === 0) {
    return (
      <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
        <View style={styles.container}>
          <Text style={[styles.title, { color: c.neutral[900] }]}>{t.history.title}</Text>
          <EmptyState
            icon={<Text style={{ fontSize: 36 }}>📋</Text>}
            title={t.history.noScansTitle}
            description={t.history.noScansDescription}
            actionLabel={t.history.startScanning}
            onAction={() => haptic.light()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
      <View style={styles.container}>
        <Animated.Text
          entering={FadeInUp.duration(400)}
          style={[styles.title, { color: c.neutral[900] }]}
        >
          {t.history.title}
        </Animated.Text>
        <Animated.Text
          entering={FadeInUp.delay(100).duration(400)}
          style={[styles.subtitle, { color: c.neutral[500] }]}
        >
          {scanHistory.length} {t.common.scans} total
        </Animated.Text>

        <View style={styles.list}>
          {scanHistory.map((scan, index) => (
            <HistoryItem
              key={scan.id}
              scan={scan}
              delay={200 + index * 80}
            />
          ))}
        </View>
      </View>
    </Screen>
  );
}

function HistoryItem({ scan, delay }: { scan: ScanResult; delay: number }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const classColor = CLASSIFICATION_COLORS[scan.classification];
  const classLabel = t.classifications[scan.classification];

  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(400).springify()}>
      <TouchableOpacity activeOpacity={0.95} onPress={() => haptic.selection()}>
        <View style={[styles.historyCard, shadows.sm, { backgroundColor: c.neutral[0] }]}>
          <View style={styles.historyLeft}>
            <View style={[styles.historyImagePlaceholder, { backgroundColor: c.neutral[100] }]}>
              <Text style={styles.historyEmoji}>🖼️</Text>
            </View>
          </View>
          <View style={styles.historyContent}>
            <View style={styles.historyTop}>
              <Text style={[styles.historyPercent, { color: classColor }]}>
                {formatPercentage(scan.aiProbability)}
              </Text>
              <Text style={[styles.historyDate, { color: c.neutral[400] }]}>
                {formatDate(scan.createdAt)}
              </Text>
            </View>
            <View style={styles.historyBottom}>
              <View
                style={[
                  styles.historyBadge,
                  { backgroundColor: classColor + '15' },
                ]}
              >
                <Text style={[styles.historyBadgeText, { color: classColor }]}>
                  {classLabel}
                </Text>
              </View>
              <Text style={[styles.historyConfidence, { color: c.neutral[400] }]}>
                {scan.confidenceLevel} {t.history.confidence}
              </Text>
            </View>
          </View>
          <Text style={[styles.chevron, { color: c.neutral[300] }]}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing['2xl'],
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySm,
    marginBottom: spacing['2xl'],
  },
  list: {
    gap: spacing.md,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  historyLeft: {
    marginRight: spacing.lg,
  },
  historyImagePlaceholder: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyEmoji: {
    fontSize: 24,
  },
  historyContent: {
    flex: 1,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyPercent: {
    ...typography.bodyMedium,
    fontWeight: '700',
  },
  historyDate: {
    ...typography.caption,
  },
  historyBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  historyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  historyBadgeText: {
    ...typography.captionMedium,
    fontSize: 11,
  },
  historyConfidence: {
    ...typography.caption,
  },
  chevron: {
    fontSize: 24,
    marginLeft: spacing.sm,
  },
});
