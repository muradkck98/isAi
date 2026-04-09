import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/layout/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { motion } from '../../theme/motion';
import { useWalletStore } from '../../store/useWalletStore';
import { haptic } from '../../utils/haptics';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface UploadScreenProps {
  onGoBack: () => void;
  onImageSelected: (uri: string) => void;
}

// ─── Permission helper ────────────────────────────────────────────────────────
type UploadTranslations = {
  upload: {
    galleryPermTitle: string; galleryPermBody: string;
    cameraPermTitle: string;  cameraPermBody: string;
    cancel: string;           openSettings: string;
  };
};
function showPermissionAlert(type: 'gallery' | 'camera', t: UploadTranslations) {
  const title = type === 'gallery' ? t.upload.galleryPermTitle : t.upload.cameraPermTitle;
  const body  = type === 'gallery' ? t.upload.galleryPermBody  : t.upload.cameraPermBody;

  Alert.alert(title, body, [
    { text: t.upload.cancel, style: 'cancel' },
    { text: t.upload.openSettings, onPress: () => Linking.openSettings() },
  ]);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export function UploadScreen({ onGoBack, onImageSelected }: UploadScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { tokens } = useWalletStore();
  const [loading, setLoading] = useState<'gallery' | 'camera' | null>(null);

  // ── Gallery ────────────────────────────────────────────────────────────────
  const handleGallery = async () => {
    haptic.medium();
    setLoading('gallery');
    try {
      // Request permission
      const { status, canAskAgain } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setLoading(null);
        if (!canAskAgain) showPermissionAlert('gallery', t);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
        allowsMultipleSelection: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        haptic.success();
        onImageSelected(uri);
      }
    } catch (err) {
      Alert.alert(t.upload.error, t.upload.galleryError);
    } finally {
      setLoading(null);
    }
  };

  // ── Camera ─────────────────────────────────────────────────────────────────
  const handleCamera = async () => {
    haptic.medium();
    setLoading('camera');
    try {
      const { status, canAskAgain } =
        await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        setLoading(null);
        if (!canAskAgain) showPermissionAlert('camera', t);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        haptic.success();
        onImageSelected(uri);
      }
    } catch (err) {
      Alert.alert(t.upload.error, t.upload.cameraError);
    } finally {
      setLoading(null);
    }
  };

  const isLoading = loading !== null;

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.primary}>

      {/* ── Custom header ─────────────────────────────────────────────── */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onGoBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.backBtn, { backgroundColor: c.neutral[100] }]}
        >
          <Ionicons name="arrow-back" size={20} color={c.neutral[700]} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.neutral[900] }]}>
          {t.upload.title}
        </Text>
        <View style={styles.backBtn} />
      </Animated.View>

      <View style={styles.content}>

        {/* ── Drop zone ─────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(80).duration(600).springify()}
          style={styles.dropzoneWrapper}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleGallery}
            disabled={isLoading}
            style={[styles.dropzone, { borderColor: c.primary[200] }]}
          >
            <LinearGradient
              colors={[c.primary[50], c.neutral[0]]}
              style={styles.dropzoneGradient}
            >
              {loading === 'gallery' ? (
                <ActivityIndicator size="large" color={c.primary[500]} style={styles.dropzoneLoader} />
              ) : (
                <View style={[styles.dropzoneIconBox, { backgroundColor: c.primary[100] }]}>
                  <Ionicons name="images-outline" size={40} color={c.primary[500]} />
                </View>
              )}
              <Text style={[styles.dropzoneTitle, { color: c.neutral[900] }]}>
                {t.upload.tapToSelect}
              </Text>
              <Text style={[styles.dropzoneSubtitle, { color: c.neutral[500] }]}>
                {t.upload.orUseCamera}
              </Text>
              <View style={styles.formatBadges}>
                {['JPG', 'PNG', 'WEBP', 'HEIC'].map((fmt) => (
                  <View key={fmt} style={[styles.badge, { backgroundColor: c.neutral[100] }]}>
                    <Text style={[styles.badgeText, { color: c.neutral[600] }]}>{fmt}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Camera button ─────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInUp.delay(240).duration(500)}
          style={styles.cameraSection}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleCamera}
            disabled={isLoading}
            style={[
              styles.cameraBtn,
              {
                backgroundColor: c.neutral[0],
                borderColor: c.neutral[200],
                opacity: isLoading ? 0.6 : 1,
              },
            ]}
          >
            {loading === 'camera' ? (
              <ActivityIndicator size="small" color={c.neutral[500]} />
            ) : (
              <Ionicons name="camera-outline" size={22} color={c.neutral[600]} />
            )}
            <Text style={[styles.cameraBtnText, { color: c.neutral[700] }]}>
              {t.upload.takePhoto}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Token info ────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(320).duration(500)}
          style={styles.tokenInfo}
        >
          <Card variant="filled" padding="md">
            <View style={styles.tokenRow}>
              <View style={[styles.tokenIconBox, { backgroundColor: c.secondary[100] }]}>
                <Ionicons name="wallet-outline" size={18} color={c.secondary[500]} />
              </View>
              <View style={styles.tokenTextContainer}>
                <Text style={[styles.tokenText, { color: c.neutral[900] }]}>
                  {t.upload.tokensAvailable.replace('{count}', String(tokens))}
                </Text>
                <Text style={[styles.tokenSubtext, { color: c.neutral[500] }]}>
                  {t.upload.eachScanCosts}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* ── Tips ──────────────────────────────────────────────────────── */}
        <Animated.View
          entering={FadeInDown.delay(420).duration(500)}
          style={styles.tips}
        >
          <Text style={[styles.tipsTitle, { color: c.neutral[400] }]}>
            {t.upload.tipsTitle}
          </Text>
          <Card variant="elevated" padding="md">
            <TipRow icon="checkmark-circle-outline" text={t.upload.tip1} delay={500} />
            <View style={[styles.tipDivider, { backgroundColor: c.neutral[100] }]} />
            <TipRow icon="checkmark-circle-outline" text={t.upload.tip2} delay={580} />
            <View style={[styles.tipDivider, { backgroundColor: c.neutral[100] }]} />
            <TipRow icon="checkmark-circle-outline" text={t.upload.tip3} delay={660} />
          </Card>
        </Animated.View>

      </View>
    </Screen>
  );
}

// ─── Tip Row ──────────────────────────────────────────────────────────────────
function TipRow({ icon, text, delay }: { icon: IoniconsName; text: string; delay: number }) {
  const c = useThemeColors();
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(350)} style={styles.tipRow}>
      <Ionicons name={icon} size={16} color={c.primary[500]} style={styles.tipIcon} />
      <Text style={[styles.tipText, { color: c.neutral[600] }]}>{text}</Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
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

  // Content
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },

  // Drop zone
  dropzoneWrapper: {
    marginBottom: spacing.lg,
  },
  dropzone: {
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  dropzoneGradient: {
    paddingVertical: spacing['4xl'],
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  dropzoneLoader: {
    marginBottom: spacing.lg,
  },
  dropzoneIconBox: {
    width: 88,
    height: 88,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  dropzoneTitle: {
    ...typography.h3,
    marginBottom: 2,
  },
  dropzoneSubtitle: {
    ...typography.bodySm,
    marginBottom: spacing.lg,
  },
  formatBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: {
    ...typography.captionMedium,
    fontSize: 11,
  },

  // Camera button
  cameraSection: {
    marginBottom: spacing.lg,
  },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  cameraBtnText: {
    ...typography.bodyMedium,
  },

  // Token
  tokenInfo: {
    marginBottom: spacing.lg,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  tokenIconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenTextContainer: {
    flex: 1,
  },
  tokenText: {
    ...typography.bodyMedium,
  },
  tokenSubtext: {
    ...typography.caption,
    marginTop: 2,
  },

  // Tips
  tips: {
    gap: spacing.md,
  },
  tipsTitle: {
    ...typography.captionMedium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  tipDivider: {
    height: StyleSheet.hairlineWidth,
  },
  tipIcon: {
    marginRight: spacing.md,
  },
  tipText: {
    ...typography.bodySm,
    flex: 1,
    lineHeight: 18,
  },
});
