/**
 * Lightweight monitoring & analytics layer.
 *
 * Architecture:
 *  - Events → logged to Supabase `analytics_events` table (batched)
 *  - Errors → logged to Supabase `error_logs` table
 *  - Performance → simple timing helpers
 *
 * To upgrade to Sentry/Datadog later, swap the flush functions only.
 */

import { Platform } from 'react-native';
import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  user_id?: string;
  session_id: string;
  platform: string;
  app_version: string;
  created_at: string;
}

interface ErrorLog {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  user_id?: string;
  platform: string;
  app_version: string;
  created_at: string;
}

// ─── Session ID ───────────────────────────────────────────────────────────────

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const APP_VERSION = '1.0.0';
const PLATFORM = Platform.OS;

// ─── Event queue (batch flush every 10 events or 30 seconds) ─────────────────

const eventQueue: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(async () => {
    await flushEvents();
    flushTimer = null;
  }, 30_000);
}

async function flushEvents() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.splice(0, eventQueue.length);
  try {
    await supabase.from('analytics_events').insert(batch);
  } catch {
    // silently fail — don't break the app for analytics
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

let currentUserId: string | undefined;

export const monitoring = {
  /** Call after login to tag future events with userId */
  identify(userId: string) {
    currentUserId = userId;
  },

  /** Call on logout */
  reset() {
    currentUserId = undefined;
  },

  /** Track a named event with optional properties */
  track(name: string, properties?: Record<string, unknown>) {
    const event: AnalyticsEvent = {
      name,
      properties,
      user_id: currentUserId,
      session_id: SESSION_ID,
      platform: PLATFORM,
      app_version: APP_VERSION,
      created_at: new Date().toISOString(),
    };
    eventQueue.push(event);

    if (eventQueue.length >= 10) {
      flushEvents();
    } else {
      scheduleFlush();
    }
  },

  /** Track screen views */
  screen(screenName: string, properties?: Record<string, unknown>) {
    monitoring.track('screen_view', { screen_name: screenName, ...properties });
  },

  /** Log an error (non-fatal) */
  async captureError(error: unknown, context?: Record<string, unknown>) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    const log: ErrorLog = {
      message,
      stack,
      context,
      user_id: currentUserId,
      platform: PLATFORM,
      app_version: APP_VERSION,
      created_at: new Date().toISOString(),
    };

    // Fire-and-forget
    supabase.from('error_logs').insert(log).then(() => {}, () => {});

    if (__DEV__) {
      console.error('[monitoring]', message, context);
    }
  },

  /** Simple performance timer */
  startTimer(label: string) {
    const start = Date.now();
    return {
      end(extraProps?: Record<string, unknown>) {
        const duration_ms = Date.now() - start;
        monitoring.track('performance', { label, duration_ms, ...extraProps });
        if (__DEV__) {
          console.log(`[perf] ${label}: ${duration_ms}ms`);
        }
      },
    };
  },
};

// ─── Standard event names (prevents typos) ───────────────────────────────────

export const Events = {
  // Auth
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  REGISTER_SUCCESS: 'register_success',
  LOGOUT: 'logout',
  GOOGLE_LOGIN_START: 'google_login_start',
  GOOGLE_LOGIN_SUCCESS: 'google_login_success',
  GOOGLE_LOGIN_FAILED: 'google_login_failed',

  // Scan
  SCAN_STARTED: 'scan_started',
  SCAN_COMPLETED: 'scan_completed',
  SCAN_FAILED: 'scan_failed',
  IMAGE_UPLOADED: 'image_uploaded',
  SOCIAL_SCAN_STARTED: 'social_scan_started',

  // Wallet
  TOKEN_PACK_VIEWED: 'token_pack_viewed',
  TOKEN_PURCHASE_STARTED: 'token_purchase_started',
  TOKEN_PURCHASE_SUCCESS: 'token_purchase_success',
  TOKEN_PURCHASE_FAILED: 'token_purchase_failed',
  AD_WATCHED: 'ad_watched',
  AD_FAILED: 'ad_failed',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Settings
  LANGUAGE_CHANGED: 'language_changed',
  THEME_CHANGED: 'theme_changed',
} as const;
