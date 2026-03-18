import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/layout/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { useAuthStore } from '../../store/useAuthStore';
import { useWalletStore } from '../../store/useWalletStore';
import { useScanStore } from '../../store/useScanStore';
import { useSettingsStore, type ThemeMode } from '../../store/useSettingsStore';
import { LANGUAGE_OPTIONS } from '../../i18n';
import { haptic } from '../../utils/haptics';

export function ProfileScreen() {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const { tokens, totalScans, reset: resetWallet } = useWalletStore();
  const { reset: resetScans } = useScanStore();
  const { language, themeMode, setLanguage, setThemeMode } = useSettingsStore();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    haptic.medium();
    await logout();
    // Clear all user-specific local data
    resetWallet();
    resetScans();
  };

  const themeLabel = themeMode === 'light' ? t.profile.lightMode : themeMode === 'dark' ? t.profile.darkMode : t.profile.systemMode;
  const currentLangLabel = LANGUAGE_OPTIONS.find((l) => l.code === language)?.label ?? 'English';

  return (
    <Screen scrollable inTabNavigator backgroundColor={c.background.secondary}>
      <View style={styles.container}>
        {/* Profile Header */}
        <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.header}>
          <LinearGradient colors={[c.primary[400], c.primary[600]]} style={styles.avatar}>
            <Text style={styles.avatarText}>{(user?.displayName || 'D')[0].toUpperCase()}</Text>
          </LinearGradient>
          <Text style={[styles.name, { color: c.neutral[900] }]}>{user?.displayName || 'Detective'}</Text>
          <Text style={[styles.email, { color: c.neutral[500] }]}>{user?.email || 'user@example.com'}</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)}>
          <Card variant="elevated" padding="lg" style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.primary[600] }]}>{tokens}</Text>
                <Text style={[styles.statLabel, { color: c.neutral[500] }]}>{t.common.tokens}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.neutral[200] }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.primary[600] }]}>{totalScans}</Text>
                <Text style={[styles.statLabel, { color: c.neutral[500] }]}>{t.profile.totalScans}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.neutral[200] }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: c.primary[600] }]}>{t.profile.free}</Text>
                <Text style={[styles.statLabel, { color: c.neutral[500] }]}>{t.profile.plan}</Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View entering={FadeInUp.delay(300).duration(500)} style={[styles.menu, { backgroundColor: c.neutral[0] }]}>
          <MenuItem emoji="🌐" title={t.profile.language} value={currentLangLabel} onPress={() => { haptic.selection(); setShowLanguagePicker(true); }} c={c} />
          <MenuItem emoji="🎨" title={t.profile.appearance} value={themeLabel} onPress={() => { haptic.selection(); setShowThemePicker(true); }} c={c} />
          <MenuItem emoji="🔔" title={t.profile.notifications} onPress={() => haptic.selection()} c={c} />
          <MenuItem emoji="🔒" title={t.profile.privacy} onPress={() => haptic.selection()} c={c} />
          <MenuItem emoji="📖" title={t.profile.about} onPress={() => haptic.selection()} c={c} />
          <MenuItem emoji="💬" title={t.profile.feedback} onPress={() => haptic.selection()} c={c} />
          <MenuItem emoji="⭐" title={t.profile.rateApp} onPress={() => haptic.selection()} c={c} isLast />
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.logoutSection}>
          <Button title={t.auth.signOut} onPress={handleLogout} variant="ghost" size="md" />
          <Text style={[styles.version, { color: c.neutral[400] }]}>{t.profile.version}</Text>
        </Animated.View>
      </View>

      {/* Language Picker Modal */}
      <PickerModal visible={showLanguagePicker} onClose={() => setShowLanguagePicker(false)} title={t.profile.language} cancelLabel={t.common.cancel} c={c} bottomInset={insets.bottom}>
        {LANGUAGE_OPTIONS.map((lang) => (
          <PickerOption key={lang.code} label={`${lang.flag}  ${lang.label}`} selected={language === lang.code}
            onPress={() => { haptic.selection(); setLanguage(lang.code); setShowLanguagePicker(false); }} c={c} />
        ))}
      </PickerModal>

      {/* Theme Picker Modal */}
      <PickerModal visible={showThemePicker} onClose={() => setShowThemePicker(false)} title={t.profile.appearance} cancelLabel={t.common.cancel} c={c} bottomInset={insets.bottom}>
        {([
          { mode: 'light' as ThemeMode, label: t.profile.lightMode, emoji: '☀️' },
          { mode: 'dark' as ThemeMode, label: t.profile.darkMode, emoji: '🌙' },
          { mode: 'system' as ThemeMode, label: t.profile.systemMode, emoji: '📱' },
        ]).map((option) => (
          <PickerOption key={option.mode} label={`${option.emoji}  ${option.label}`} selected={themeMode === option.mode}
            onPress={() => { haptic.selection(); setThemeMode(option.mode); setShowThemePicker(false); }} c={c} />
        ))}
      </PickerModal>
    </Screen>
  );
}

function MenuItem({ emoji, title, value, onPress, c, isLast }: {
  emoji: string; title: string; value?: string; onPress: () => void; c: any; isLast?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.menuItem, !isLast && { borderBottomWidth: 1, borderBottomColor: c.neutral[100] }]} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={[styles.menuTitle, { color: c.neutral[800] }]}>{title}</Text>
      {value && <Text style={[styles.menuValue, { color: c.neutral[400] }]}>{value}</Text>}
      <Text style={[styles.menuChevron, { color: c.neutral[400] }]}>›</Text>
    </TouchableOpacity>
  );
}

function PickerModal({ visible, onClose, title, cancelLabel, children, c, bottomInset = 0 }: {
  visible: boolean; onClose: () => void; title: string; cancelLabel: string; children: React.ReactNode; c: any; bottomInset?: number;
}) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable
          style={[styles.modalContent, { backgroundColor: c.neutral[0], paddingBottom: Math.max(spacing.xl, bottomInset + spacing.md) }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[styles.modalHandle, { backgroundColor: c.neutral[200] }]} />
          <Text style={[styles.modalTitle, { color: c.neutral[900] }]}>{title}</Text>
          {children}
          <TouchableOpacity onPress={onClose} style={[styles.modalCancel, { backgroundColor: c.neutral[100] }]}>
            <Text style={[styles.modalCancelText, { color: c.neutral[600] }]}>{cancelLabel}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PickerOption({ label, selected, onPress, c }: {
  label: string; selected: boolean; onPress: () => void; c: any;
}) {
  return (
    <TouchableOpacity style={[styles.pickerOption, selected && { backgroundColor: c.primary[50] }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.pickerOptionText, { color: c.neutral[900] }, selected && { color: c.primary[600], fontWeight: '600' }]}>{label}</Text>
      {selected && <Text style={[styles.checkmark, { color: c.primary[500] }]}>✓</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: spacing['2xl'], paddingBottom: spacing.xl },
  header: { alignItems: 'center', marginBottom: spacing['2xl'] },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  name: { ...typography.h2 },
  email: { ...typography.bodySm, marginTop: 4 },
  statsCard: { marginBottom: spacing['2xl'] },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.caption, marginTop: 4 },
  statDivider: { width: 1, height: 40 },
  menu: { borderRadius: radius['2xl'], overflow: 'hidden', marginBottom: spacing['2xl'] },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  menuEmoji: { fontSize: 20, marginRight: spacing.lg },
  menuTitle: { ...typography.body, flex: 1 },
  menuValue: { ...typography.bodySm, marginRight: spacing.sm },
  menuChevron: { fontSize: 22 },
  logoutSection: { alignItems: 'center', gap: spacing.md },
  version: { ...typography.caption },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { width: '100%', borderTopLeftRadius: radius['3xl'], borderTopRightRadius: radius['3xl'], borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: spacing.xl, paddingTop: spacing.lg },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typography.h3, marginBottom: spacing.xl, textAlign: 'center' },
  modalCancel: { marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  modalCancelText: { ...typography.bodyMedium },
  pickerOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderRadius: radius.lg, marginBottom: spacing.xs },
  pickerOptionText: { ...typography.body, fontSize: 16 },
  checkmark: { fontSize: 18, fontWeight: '700' },
});
