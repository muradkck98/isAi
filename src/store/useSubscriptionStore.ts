/**
 * Subscription store — tracks RevenueCat "isAi Pro" entitlement status.
 *
 * Source of truth is RevenueCat customerInfo (fetched on app boot + live updates).
 * We persist the last known status so the UI doesn't flash on cold start.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandSecureStorage } from '../lib/storage';
import {
  getCustomerInfo,
  parseSubscriptionStatus,
  type SubscriptionStatus,
  type PlanType,
} from '../lib/purchases';
import { monitoring } from '../lib/monitoring';

interface SubscriptionState {
  isActive: boolean;
  plan: PlanType;
  expiresAt: string | null;    // ISO string — Date is not serializable
  willRenew: boolean;
  isLifetime: boolean;
  isLoading: boolean;

  // Actions
  sync: () => Promise<void>;
  setFromCustomerInfo: (customerInfo: any) => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  isActive: false,
  plan: null as PlanType,
  expiresAt: null,
  willRenew: false,
  isLifetime: false,
  isLoading: false,
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      sync: async () => {
        set({ isLoading: true });
        try {
          const customerInfo = await getCustomerInfo();
          const status: SubscriptionStatus = parseSubscriptionStatus(customerInfo);
          set({
            isActive: status.isActive,
            plan: status.plan,
            expiresAt: status.expiresAt?.toISOString() ?? null,
            willRenew: status.willRenew,
            isLifetime: status.isLifetime,
            isLoading: false,
          });
        } catch (err) {
          monitoring.captureError(err, { context: 'subscription_sync' });
          set({ isLoading: false });
        }
      },

      setFromCustomerInfo: (customerInfo: any) => {
        const status: SubscriptionStatus = parseSubscriptionStatus(customerInfo);
        set({
          isActive: status.isActive,
          plan: status.plan,
          expiresAt: status.expiresAt?.toISOString() ?? null,
          willRenew: status.willRenew,
          isLifetime: status.isLifetime,
        });
      },

      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: 'subscription-store',
      storage: zustandSecureStorage,
    }
  )
);
