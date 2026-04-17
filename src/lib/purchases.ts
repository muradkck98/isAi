/**
 * RevenueCat In-App Purchase & Subscription layer
 *
 * Products:
 *   - lifetime  → one-time purchase, permanent "isAi Pro" access
 *   - yearly    → annual subscription
 *   - monthly   → monthly subscription
 *
 * Entitlement: "isAi Pro"
 *
 * react-native-purchases requires a custom native build (not Expo Go).
 * The module is loaded dynamically so Expo Go doesn't crash at startup.
 *
 * Setup checklist:
 *  1. Add "react-native-purchases" to app.json plugins  ✓
 *  2. Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY / IOS_KEY  ✓
 *  3. Create products in Google Play / App Store Connect
 *  4. Add products + Entitlement "isAi Pro" in RevenueCat dashboard
 *  5. npx expo prebuild && npx expo run:android
 */

import { Platform } from 'react-native';
import { REVENUECAT } from '../config/env';
import { monitoring, Events } from './monitoring';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanType = 'monthly' | 'yearly' | 'lifetime' | null;

export interface SubscriptionStatus {
  isActive: boolean;
  plan: PlanType;
  expiresAt: Date | null;
  willRenew: boolean;
  isLifetime: boolean;
}

export interface PurchaseResult {
  success: boolean;
  customerInfo?: any;
  userCancelled?: boolean;
  error?: string;
}

// ─── Entitlement & product identifiers ───────────────────────────────────────

export const ENTITLEMENT_ID = 'isAi Pro';

export const PRODUCT_IDS = {
  monthly:  'monthly',
  yearly:   'yearly',
  lifetime: 'lifetime',
} as const;

// ─── Native module guard ──────────────────────────────────────────────────────

let Purchases: any = null;
let LOG_LEVEL: any = null;
let purchasesAvailable = false;

try {
  const mod = require('react-native-purchases');
  Purchases = mod.default ?? mod.Purchases ?? mod;
  LOG_LEVEL = mod.LOG_LEVEL;
  purchasesAvailable = true;
} catch {
  if (__DEV__) console.warn('[Purchases] react-native-purchases not available (Expo Go or missing native build)');
}

// ─── Initialization ───────────────────────────────────────────────────────────

let isInitialized = false;

export async function initializePurchases(userId?: string): Promise<void> {
  if (!purchasesAvailable || isInitialized) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT.IOS_KEY : REVENUECAT.ANDROID_KEY;

  if (!apiKey) {
    if (__DEV__) console.warn('[Purchases] RevenueCat API key not configured');
    return;
  }

  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    Purchases.configure({
      apiKey,
      appUserID: userId ?? null,
      // Enable StoreKit2 on iOS 16+ for better purchase reliability
      usesStoreKit2IfAvailable: true,
    });

    isInitialized = true;
    if (__DEV__) console.log('[Purchases] RevenueCat initialized, user:', userId ?? 'anonymous');
  } catch (err) {
    monitoring.captureError(err, { context: 'purchases_init' });
  }
}

export function identifyPurchaseUser(userId: string): void {
  if (!purchasesAvailable || !isInitialized) return;
  Purchases.logIn(userId).catch((err: unknown) => {
    monitoring.captureError(err, { context: 'purchases_login' });
  });
}

export function resetPurchaseUser(): void {
  if (!purchasesAvailable || !isInitialized) return;
  Purchases.logOut().catch(() => {});
}

// ─── Customer info & entitlement check ───────────────────────────────────────

export async function getCustomerInfo(): Promise<any | null> {
  if (!purchasesAvailable || !isInitialized) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch (err) {
    monitoring.captureError(err, { context: 'get_customer_info' });
    return null;
  }
}

export function parseSubscriptionStatus(customerInfo: any | null): SubscriptionStatus {
  if (!customerInfo) {
    return { isActive: false, plan: null, expiresAt: null, willRenew: false, isLifetime: false };
  }

  const entitlement = customerInfo.entitlements?.active?.[ENTITLEMENT_ID];

  if (!entitlement) {
    return { isActive: false, plan: null, expiresAt: null, willRenew: false, isLifetime: false };
  }

  const productId = entitlement.productIdentifier as string;
  const expiresDateStr: string | null = entitlement.expirationDate ?? null;
  const isLifetime = entitlement.productIdentifier === PRODUCT_IDS.lifetime || expiresDateStr === null;

  let plan: PlanType = null;
  if (productId.includes('lifetime')) plan = 'lifetime';
  else if (productId.includes('yearly') || productId.includes('annual')) plan = 'yearly';
  else if (productId.includes('monthly')) plan = 'monthly';

  return {
    isActive: true,
    plan,
    expiresAt: expiresDateStr ? new Date(expiresDateStr) : null,
    willRenew: entitlement.willRenew ?? false,
    isLifetime,
  };
}

export async function checkSubscriptionStatus(): Promise<SubscriptionStatus> {
  const customerInfo = await getCustomerInfo();
  return parseSubscriptionStatus(customerInfo);
}

// ─── Offerings ────────────────────────────────────────────────────────────────

export async function getOfferings(): Promise<any | null> {
  if (!purchasesAvailable || !isInitialized) return null;
  try {
    return await Purchases.getOfferings();
  } catch (err) {
    monitoring.captureError(err, { context: 'get_offerings' });
    return null;
  }
}

// ─── Purchase flow ────────────────────────────────────────────────────────────

export async function purchasePackage(pkg: any): Promise<PurchaseResult> {
  if (!purchasesAvailable || !isInitialized) {
    return { success: false, error: 'Purchases not initialized' };
  }

  monitoring.track(Events.TOKEN_PURCHASE_STARTED, {
    productId: pkg?.product?.identifier,
  });

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive = !!customerInfo.entitlements?.active?.[ENTITLEMENT_ID];

    if (isActive) {
      monitoring.track(Events.TOKEN_PURCHASE_SUCCESS, {
        productId: pkg?.product?.identifier,
      });
      return { success: true, customerInfo };
    } else {
      // Purchase went through but entitlement not active — edge case
      return { success: false, error: 'Entitlement not activated after purchase' };
    }
  } catch (err: any) {
    if (err?.userCancelled === true) {
      return { success: false, userCancelled: true };
    }
    monitoring.captureError(err, { context: 'purchase_package' });
    monitoring.track(Events.TOKEN_PURCHASE_FAILED, { error: err?.message });
    return { success: false, error: err?.message ?? 'Purchase failed' };
  }
}

// ─── Restore purchases ────────────────────────────────────────────────────────

export async function restorePurchases(): Promise<PurchaseResult> {
  if (!purchasesAvailable || !isInitialized) {
    return { success: false, error: 'Purchases not initialized' };
  }
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = !!customerInfo.entitlements?.active?.[ENTITLEMENT_ID];
    return { success: true, customerInfo };
  } catch (err: any) {
    monitoring.captureError(err, { context: 'restore_purchases' });
    return { success: false, error: err?.message ?? 'Restore failed' };
  }
}

// ─── Customer Center (support / manage subscription) ─────────────────────────
// Shows RevenueCat's built-in support UI: cancel, refund, contact support.

export async function presentCustomerCenter(): Promise<void> {
  if (!purchasesAvailable || !isInitialized) return;
  try {
    // RevenueCat UI package required: react-native-purchases-ui
    const { RevenueCatUI } = require('react-native-purchases-ui');
    await RevenueCatUI.presentCustomerCenter();
  } catch (err) {
    monitoring.captureError(err, { context: 'customer_center' });
  }
}

// ─── Listener ─────────────────────────────────────────────────────────────────
// Call this once in your root component to react to subscription changes
// (renewals, cancellations, billing issues) in real time.

export function addCustomerInfoListener(
  callback: (customerInfo: any) => void
): (() => void) {
  if (!purchasesAvailable || !isInitialized) return () => {};

  const listener = Purchases.addCustomerInfoUpdateListener(callback);
  // Returns an unsubscribe function — call it in useEffect cleanup
  return () => listener?.remove?.();
}

// ─── isPro helper ─────────────────────────────────────────────────────────────

export function isPro(customerInfo: any | null): boolean {
  return !!customerInfo?.entitlements?.active?.[ENTITLEMENT_ID];
}
