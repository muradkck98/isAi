import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Pressable } from 'react-native';
import Animated, { FadeInUp, FadeInRight } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation<any>();
  const [selectedScan, setSelectedScan] = useState<ScanResult | null>(null);

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
            onAction={() => { haptic.light(); navigation.navigate('Home'); }}
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
          {t.history.totalScans.replace('{count}', String(scanHistory.length))}
        </Animated.Text>

        <View style={styles.list}>
          {scanHistory.map((scan, index) => (
            <HistoryItem
              key={scan.id}
              scan={scan}
              delay={200 + index * 80}
              onPress={() => { haptic.selection(); setSelectedScan(scan); }}
            />
          ))}
        </View>
      </View>

      {/* Scan Detail Modal */}
      <ScanDetailModal
        scan={selectedScan}
        onClose={() => setSelectedScan(null)}
      />
    </Screen>
  );
}

function HistoryItem({ scan, delay, onPress }: { scan: ScanResult; delay: number; onPress: () => void }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const classColor = CLASSIFICATION_COLORS[scan.classification];
  const classLabel = t.classifications[scan.classification];

  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(400).springify()}>
      <TouchableOpacity activeOpacity={0.95} onPress={onPress}>
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
                {t.history.confidence.replace('{level}', scan.confidenceLevel === 'high' ? t.result.high : scan.confidenceLevel === 'medium' ? t.result.medium : t.result.low)}
              </Text>
            </View>
          </View>
          <Text style={[styles.chevron, { color: c.neutral[300] }]}>›</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function ScanDetailModal({ scan, onClose }: { scan: ScanResult | null; onClose: () => void }) {
  const c = useThemeColors();
  const { t } = useTranslation();
  if (!scan) return null;
  const classColor = CLASSIFICATION_COLORS[scan.classification];
  const classLabel = t.classifications[scan.classification];
  const confLabel = scan.confidenceLevel === 'high' ? t.result.high : scan.confidenceLevel === 'medium' ? t.result.medium : t.result.low;

  return (
    <Modal visible={!!scan} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={detailStyles.overlay} onPress={onClose}>
        <Pressable style={[detailStyles.sheet, { backgroundColor: c.neutral[0] }]} onPress={(e) => e.stopPropagation()}>
          <View style={[detailStyles.handle, { backgroundColor: c.neutral[200] }]} />

          <Text style={[detailStyles.title, { color: c.neutral[900] }]}>
            {classLabel}
          </Text>
          <Text style={[detailStyles.date, { color: c.neutral[400] }]}>
            {formatDate(scan.createdAt)}
          </Text>

          <View style={[detailStyles.probBox, { backgroundColor: classColor + '15' }]}>
            <Text style={[detailStyles.probValue, { color: classColor }]}>
              {formatPercentage(scan.aiProbability)}
            </Text>
            <Text style={[detailStyles.probLabel, { color: classColor }]}>
              {t.result.aiProbability}
            </Text>
          </View>

          <View style={detailStyles.row}>
            <View style={[detailStyles.infoBox, { backgroundColor: c.neutral[50] }]}>
              <Text style={[detailStyles.infoLabel, { color: c.neutral[500] }]}>{t.result.classification}</Text>
              <Text style={[detailStyles.infoValue, { color: c.neutral[900] }]}>{classLabel}</Text>
            </View>
            <View style={[detailStyles.infoBox, { backgroundColor: c.neutral[50] }]}>
              <Text style={[detailStyles.infoLabel, { color: c.neutral[500] }]}>{t.result.confidence}</Text>
              <Text style={[detailStyles.infoValue, { color: c.neutral[900] }]}>{confLabel}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={[detailStyles.closeBtn, { backgroundColor: c.neutral[100] }]}>
            <Text style={[detailStyles.closeBtnText, { color: c.neutral[700] }]}>{t.common.done}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius['3xl'], borderTopRightRadius: radius['3xl'], padding: spacing.xl, paddingTop: spacing.lg },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  title: { ...typography.h3, textAlign: 'center', marginBottom: spacing.xs },
  date: { ...typography.caption, textAlign: 'center', marginBottom: spacing.xl },
  probBox: { borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg },
  probValue: { fontSize: 48, fontWeight: '800' },
  probLabel: { ...typography.bodySm, marginTop: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  infoBox: { flex: 1, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  infoLabel: { ...typography.caption, marginBottom: spacing.xs },
  infoValue: { ...typography.bodyMedium },
  closeBtn: { paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  closeBtnText: { ...typography.bodyMedium },
});

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
