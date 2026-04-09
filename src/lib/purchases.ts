/**
 * In-App Purchase layer — RevenueCat
 *
 * react-native-purchases requires a custom native build (not supported in Expo Go).
 * The module is loaded dynamically so Expo Go doesn't crash.
 *
 * To finish setup:
 * 1. Add to app.json plugins: ["react-native-purchases"]
 * 2. Set EXPO_PUBLIC_REVENUECAT_ANDROID_KEY and EXPO_PUBLIC_REVENUECAT_IOS_KEY in .env
 * 3. Create products in Google Play Console / App Store Connect
 * 4. Add products to RevenueCat with matching IDs: pack_40, pack_120, pack_300
 * 5. Run: npx expo prebuild && npx expo run:android
 */

import { Platform, Alert } from 'react-native';
import { REVENUECAT } from '../config/env';
import { monitoring, Events } from './monitoring';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  tokens?: number;
  productId?: string;
  error?: string;
  userCancelled?: boolean;
}

// ─── Native module guard ──────────────────────────────────────────────────────
// react-native-purchases requires a custom native build — not available in Expo Go

let Purchases: any = null;
let LOG_LEVEL: any = null;
let purchasesAvailable = false;

try {
  const mod = require('react-native-purchases');
  Purchases = mod.default;
  LOG_LEVEL = mod.LOG_LEVEL;
  purchasesAvailable = true;
} catch {
  if (__DEV__) console.warn('[Purchases] react-native-purchases not available (Expo Go)');
}

// ─── Initialization ───────────────────────────────────────────────────────────

let isInitialized = false;

export async function initializePurchases(userId?: string): Promise<void> {
  if (!purchasesAvailable || isInitialized) return;

  const apiKey = Platform.OS === 'ios' ? REVENUECAT.IOS_KEY : REVENUECAT.ANDROID_KEY;

  if (!apiKey) {
    if (__DEV__) console.warn('[Purchases] RevenueCat API key not set — purchases disabled');
    return;
  }

  try {
    if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    Purchases.configure({ apiKey, appUserID: userId ?? null });
    isInitialized = true;
    if (__DEV__) console.log('[Purchases] RevenueCat initialized');
  } catch (err) {
    monitoring.captureError(err, { context: 'purchases_init' });
  }
}

export function identifyPurchaseUser(userId: string): void {
  if (!purchasesAvailable || !isInitialized) return;
  Purchases.logIn(userId).catch(() => {});
}

export function resetPurchaseUser(): void {
  if (!purchasesAvailable || !isInitialized) return;
  Purchases.logOut().catch(() => {});
}

// ─── Purchase flow ────────────────────────────────────────────────────────────

export async function purchaseTokenPack(
  productId: string,
  tokenCount: number,
  price: string
): Promise<PurchaseResult> {
  monitoring.track(Events.TOKEN_PURCHASE_STARTED, { productId, tokenCount });

  if (!purchasesAvailable || !isInitialized) {
    return new Promise((resolve) => {
      Alert.alert(
        'Purchase Coming Soon',
        `${tokenCount} tokens · ${price}\n\nIn-app purchase will be available soon!`,
        [{ text: 'OK', onPress: () => resolve({ success: false, userCancelled: true }) }]
      );
    });
  }

  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages.find(
      (p: any) => p.product.identifier === productId
    );

    if (!pkg) {
      throw new Error(`Product "${productId}" not found in RevenueCat offerings`);
    }

    await Purchases.purchasePackage(pkg);
    // Consumables don't add entitlements — token credit handled by our wallet API

    monitoring.track(Events.TOKEN_PURCHASE_SUCCESS, { productId, tokenCount });
    return { success: true, tokens: tokenCount, productId };

  } catch (err: any) {
    if (err.userCancelled) {
      return { success: false, userCancelled: true };
    }
    monitoring.captureError(err, { context: 'purchase_token_pack', productId });
    monitoring.track(Events.TOKEN_PURCHASE_FAILED, { productId, error: err.message });
    return { success: false, error: err.message };
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!purchasesAvailable || !isInitialized) {
    Alert.alert('Restore Purchases', 'Purchases are not configured yet.');
    return false;
  }
  try {
    await Purchases.restorePurchases();
    return true;
  } catch (err) {
    monitoring.captureError(err, { context: 'restore_purchases' });
    return false;
  }
}
