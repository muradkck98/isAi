/**
 * Rewarded Ads — Google AdMob
 *
 * react-native-google-mobile-ads is installed.
 * app.json uses TEST App IDs → safe to run in dev/emulator.
 *
 * To go live:
 * 1. Replace app.json androidAppId / iosAppId with your real AdMob App IDs
 * 2. Set EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID and EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID in .env
 * 3. Run: npx expo prebuild && npx expo run:android
 */

import { Platform } from 'react-native';
import { monitoring, Events } from './monitoring';

// react-native-google-mobile-ads requires a custom native build (not supported in Expo Go)
let mobileAds: any;
let RewardedAd: any;
let RewardedAdEventType: any;
let TestIds: any;
let adsAvailable = false;

try {
  const module = require('react-native-google-mobile-ads');
  mobileAds = module.default;
  RewardedAd = module.RewardedAd;
  RewardedAdEventType = module.RewardedAdEventType;
  TestIds = module.TestIds;
  adsAvailable = true;
} catch {
  if (__DEV__) console.warn('[Ads] react-native-google-mobile-ads not available (Expo Go)');
}

// ─── Ad Unit IDs ──────────────────────────────────────────────────────────────

function getRewardedAdUnitId(): string {
  if (__DEV__) {
    // Always use test IDs in development to avoid policy violations
    return Platform.OS === 'ios' ? TestIds.REWARDED : TestIds.REWARDED;
  }

  const envId = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID
    : process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID;

  return envId ?? '';
}

// ─── Initialization ───────────────────────────────────────────────────────────

export async function initializeAds(): Promise<void> {
  if (!adsAvailable) return;
  try {
    await mobileAds().initialize();
    if (__DEV__) console.log('[Ads] AdMob initialized');
  } catch (err) {
    monitoring.captureError(err, { context: 'ads_init' });
  }
}

// ─── Rewarded Ad ──────────────────────────────────────────────────────────────

export interface AdResult {
  earned: boolean;
  rewardAmount?: number;
  rewardType?: string;
  error?: string;
}

export async function showRewardedAd(): Promise<AdResult> {
  if (!adsAvailable) {
    if (__DEV__) console.warn('[Ads] Skipping ad — not available in Expo Go');
    return { earned: false, error: 'Ads not available in this build' };
  }

  const adUnitId = getRewardedAdUnitId();

  if (!adUnitId) {
    monitoring.track(Events.AD_FAILED, { reason: 'no_ad_unit_id' });
    return { earned: false, error: 'Ad unit not configured' };
  }

  return new Promise((resolve) => {
    const rewarded = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });

    let earned = false;
    let rewardAmount: number | undefined;
    let rewardType: string | undefined;

    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        rewarded.show();
      }
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        earned = true;
        rewardAmount = reward.amount;
        rewardType   = reward.type;
        monitoring.track(Events.AD_WATCHED, {
          reward_amount: reward.amount,
          reward_type: reward.type,
        });
      }
    );

    // Ad closed (after earning or after skipping)
    const unsubscribeClosed = rewarded.addAdEventListener(
      'closed' as any,
      () => {
        unsubscribeLoaded();
        unsubscribeEarned();
        unsubscribeClosed();
        resolve({ earned, rewardAmount, rewardType });
      }
    );

    rewarded.addAdEventListener('error' as any, (error: any) => {
      unsubscribeLoaded();
      unsubscribeEarned();
      monitoring.captureError(error, { context: 'rewarded_ad_load' });
      monitoring.track(Events.AD_FAILED, { error: String(error) });
      resolve({ earned: false, error: String(error) });
    });

    rewarded.load();
  });
}
