/**
 * PaywallScreen — RevenueCat native Paywall UI
 *
 * Uses react-native-purchases-ui to render the paywall configured in the
 * RevenueCat dashboard. Falls back to a manual paywall if the native UI is
 * unavailable (Expo Go / missing native build).
 *
 * Products: monthly, yearly, lifetime
 * Entitlement: "isAi Pro"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useTranslation } from '../../hooks/useTranslation';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { radius } from '../../theme/radius';
import { useAuthStore } from '../../store/useAuthStore';
import { useSubscriptionStore } from '../../store/useSubscriptionStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  ENTITLEMENT_ID,
} from '../../lib/purchases';
import { haptic } from '../../utils/haptics';
import { monitoring } from '../../lib/monitoring';

// ─── Try to load RevenueCat UI ─────────────────────────────────────────────────

let RevenueCatUI: any = null;
let rcuiAvailable = false;

try {
  RevenueCatUI = require('react-native-purchases-ui').RevenueCatUI;
  rcuiAvailable = true;
} catch {
  if (__DEV__) console.warn('[PaywallScreen] react-native-purchases-ui not available');
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaywallScreenProps {
  onClose?: () => void;
  onPurchase?: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PaywallScreen({ onClose, onPurchase }: PaywallScreenProps) {
  const c = useThemeColors();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setFromCustomerInfo } = useSubscriptionStore();

  // If RevenueCat UI is available, render native paywall
  if (rcuiAvailable) {
    return (
      <NativePaywall
        onClose={onClose}
        onPurchase={onPurchase}
        setFromCustomerInfo={setFromCustomerInfo}
      />
    );
  }

  // Fallback: manual paywall for Expo Go / missing native build
  return (
    <FallbackPaywall
      c={c}
      t={t}
      user={user}
      onClose={onClose}
      onPurchase={onPurchase}
      setFromCustomerInfo={setFromCustomerInfo}
    />
  );
}

// ─── Native RevenueCat Paywall ────────────────────────────────────────────────

function NativePaywall({
  onClose,
  onPurchase,
  setFromCustomerInfo,
}: {
  onClose?: () => void;
  onPurchase?: () => void;
  setFromCustomerInfo: (info: any) => void;
}) {
  const handlePurchaseCompleted = useCallback(
    ({ customerInfo }: { customerInfo: any }) => {
      haptic.success();
      setFromCustomerInfo(customerInfo);
      monitoring.track('subscription_purchase_completed', {
        entitlements: Object.keys(customerInfo?.entitlements?.active ?? {}),
      });
      onPurchase?.();
    },
    [onPurchase, setFromCustomerInfo]
  );

  const handleRestoreCompleted = useCallback(
    ({ customerInfo }: { customerInfo: any }) => {
      haptic.success();
      setFromCustomerInfo(customerInfo);
    },
    [setFromCustomerInfo]
  );

  const handleDismiss = useCallback(() => {
    onClose?.();
  }, [onClose]);

  // Present as full-screen modal using RevenueCat's presentPaywall
  // This renders the paywall configured in the RevenueCat dashboard
  return (
    <RevenueCatUI.Paywall
      onPurchaseCompleted={handlePurchaseCompleted}
      onRestoreCompleted={handleRestoreCompleted}
      onDismiss={handleDismiss}
    />
  );
}

// ─── Fallback manual paywall ──────────────────────────────────────────────────

const PLAN_CONFIG = [
  {
    id: 'monthly' as const,
    icon: '📅',
    period: 'Monthly',
    price: '$4.99',
    perMonth: '$4.99/mo',
    highlight: false,
    badge: null,
  },
  {
    id: 'yearly' as const,
    icon: '🏆',
    period: 'Yearly',
    price: '$29.99',
    perMonth: '$2.50/mo',
    highlight: true,
    badge: 'BEST VALUE — Save 50%',
  },
  {
    id: 'lifetime' as const,
    icon: '♾️',
    period: 'Lifetime',
    price: '$59.99',
    perMonth: 'One-time',
    highlight: false,
    badge: null,
  },
];

const FEATURES = [
  { icon: '🔍', text: 'Unlimited AI image detection' },
  { icon: '⚡', text: 'Priority scan processing' },
  { icon: '📱', text: 'Social media post scanning' },
  { icon: '📊', text: 'Detailed probability reports' },
  { icon: '🌍', text: '13 language support' },
  { icon: '🔒', text: 'Privacy-first — no image storage' },
];

function FallbackPaywall({
  c,
  t,
  user,
  onClose,
  onPurchase,
  setFromCustomerInfo,
}: {
  c: any;
  t: any;
  user: any;
  onClose?: () => void;
  onPurchase?: () => void;
  setFromCustomerInfo: (info: any) => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly' | 'lifetime'>('yearly');
  const [offerings, setOfferings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    getOfferings().then((o) => {
      if (o) setOfferings(o);
    });
  }, []);

  const handlePurchase = async () => {
    haptic.medium();
    setLoading(true);
    try {
      const pkg = offerings?.current?.availablePackages?.find(
        (p: any) =>
          p.product.identifier === selectedPlan ||
          p.packageType?.toLowerCase() === selectedPlan
      );

      if (!pkg) {
        // RevenueCat not set up yet — show placeholder
        Alert.alert(
          'Coming Soon',
          `isAi Pro ${selectedPlan} plan will be available soon!`,
          [{ text: 'OK' }]
        );
        return;
      }

      const result = await purchasePackage(pkg);

      if (result.success && result.customerInfo) {
        setFromCustomerInfo(result.customerInfo);
        haptic.success();
        Alert.alert(
          '🎉 Welcome to isAi Pro!',
          'Your subscription is now active. Enjoy unlimited access.',
          [{ text: 'Continue', onPress: onPurchase }]
        );
      } else if (!result.userCancelled && result.error) {
        Alert.alert(t.empty.somethingWrong, result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    haptic.light();
    setRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.customerInfo) {
        const isActive = !!result.customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
        setFromCustomerInfo(result.customerInfo);
        Alert.alert(
          isActive ? '✅ Restored!' : 'Nothing to restore',
          isActive
            ? 'Your isAi Pro subscription has been restored.'
            : 'No active subscription found for this account.'
        );
      } else if (result.error) {
        Alert.alert(t.empty.somethingWrong, result.error);
      }
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={[fallback.container, { backgroundColor: '#0F172A' }]}>
      {/* Close */}
      {onClose && (
        <TouchableOpacity
          onPress={onClose}
          style={fallback.closeBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      )}

      <ScrollView
        contentContainerStyle={fallback.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Animated.View entering={FadeInDown.duration(600).springify()} style={fallback.hero}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={fallback.heroIcon}
          >
            <Text style={fallback.heroIconText}>✦</Text>
          </LinearGradient>
          <Text style={fallback.heroTitle}>isAi Pro</Text>
          <Text style={fallback.heroSubtitle}>
            Unlimited AI image detection, no tokens needed
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInUp.delay(100).duration(500)} style={fallback.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={fallback.featureRow}>
              <Text style={fallback.featureIcon}>{f.icon}</Text>
              <Text style={fallback.featureText}>{f.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Plans */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={fallback.plans}>
          {PLAN_CONFIG.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => { haptic.light(); setSelectedPlan(plan.id); }}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    fallback.planCard,
                    isSelected && fallback.planCardSelected,
                  ]}
                >
                  {plan.badge && (
                    <LinearGradient
                      colors={['#6366F1', '#8B5CF6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={fallback.planBadge}
                    >
                      <Text style={fallback.planBadgeText}>{plan.badge}</Text>
                    </LinearGradient>
                  )}
                  <View style={fallback.planContent}>
                    <Text style={fallback.planIcon}>{plan.icon}</Text>
                    <View style={fallback.planInfo}>
                      <Text style={fallback.planPeriod}>{plan.period}</Text>
                      <Text style={fallback.planPerMonth}>{plan.perMonth}</Text>
                    </View>
                    <View style={fallback.planRight}>
                      <Text style={[fallback.planPrice, isSelected && { color: '#A78BFA' }]}>
                        {plan.price}
                      </Text>
                      {isSelected && (
                        <View style={fallback.checkCircle}>
                          <Ionicons name="checkmark" size={14} color="#fff" />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Bottom spacing for sticky footer */}
        <View style={{ height: 160 }} />
      </ScrollView>

      {/* Sticky footer */}
      <Animated.View entering={FadeInUp.delay(400)} style={fallback.footer}>
        <LinearGradient
          colors={['transparent', '#0F172A']}
          style={fallback.footerGradient}
          pointerEvents="none"
        />
        <View style={fallback.footerContent}>
          <TouchableOpacity
            onPress={handlePurchase}
            disabled={loading}
            activeOpacity={0.88}
            style={fallback.purchaseWrapper}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={fallback.purchaseBtn}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={fallback.purchaseBtnText}>
                  Get isAi Pro — {PLAN_CONFIG.find((p) => p.id === selectedPlan)?.price}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring}
            style={fallback.restoreBtn}
          >
            {restoring ? (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
            ) : (
              <Text style={fallback.restoreBtnText}>Restore Purchases</Text>
            )}
          </TouchableOpacity>

          <Text style={fallback.legal}>
            Subscriptions auto-renew unless cancelled · Lifetime is a one-time purchase
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const fallback = StyleSheet.create({
  container: { flex: 1 },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    right: spacing.xl,
    zIndex: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  scroll: {
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingHorizontal: spacing.xl,
  },

  hero: { alignItems: 'center', marginBottom: spacing['2xl'] },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  heroIconText: { fontSize: 32, color: '#fff', fontWeight: '800' },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 22,
  },

  features: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radius['2xl'],
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { fontSize: 18, width: 28 },
  featureText: { ...typography.body, color: 'rgba(255,255,255,0.8)', flex: 1 },

  plans: { gap: spacing.md, marginBottom: spacing['2xl'] },
  planCard: {
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: '#6366F1',
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  planBadge: {
    paddingVertical: 5,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  planBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.8 },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  planIcon: { fontSize: 24 },
  planInfo: { flex: 1 },
  planPeriod: { ...typography.bodyMedium, color: '#fff' },
  planPerMonth: { ...typography.caption, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  planRight: { alignItems: 'flex-end', gap: 6 },
  planPrice: { fontSize: 20, fontWeight: '800', color: 'rgba(255,255,255,0.7)' },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footerGradient: { height: 40, marginBottom: -1 },
  footerContent: {
    backgroundColor: '#0F172A',
    paddingHorizontal: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.xl,
    paddingTop: spacing.sm,
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
  purchaseBtn: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  restoreBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  restoreBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  legal: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    lineHeight: 15,
  },
});
