import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScanResult } from '../types';
import { api } from '../services/api';

interface ScanState {
  currentScan: ScanResult | null;
  scanHistory: ScanResult[];
  isScanning: boolean;
  isLoadingHistory: boolean;

  // Local actions
  setCurrentScan: (scan: ScanResult | null) => void;
  addToHistory: (scan: ScanResult) => void;
  setScanning: (isScanning: boolean) => void;
  clearHistory: () => void;

  // Supabase operations
  fetchHistory: (userId: string) => Promise<void>;
  runScan: (
    imageUri: string,
    userId: string,
    socialMeta?: { platform?: string; postUrl?: string; authorName?: string | null }
  ) => Promise<ScanResult>;

  // Reset on logout
  reset: () => void;
}

export const useScanStore = create<ScanState>()(
  persist(
    (set, get) => ({
      currentScan: null,
      scanHistory: [],
      isScanning: false,
      isLoadingHistory: false,

      setCurrentScan: (currentScan) => set({ currentScan }),
      addToHistory: (scan) =>
        set((state) => ({ scanHistory: [scan, ...state.scanHistory] })),
      setScanning: (isScanning) => set({ isScanning }),
      clearHistory: () => set({ scanHistory: [] }),

      fetchHistory: async (userId) => {
        set({ isLoadingHistory: true });
        try {
          const history = await api.scan.getHistory(userId);
          set({ scanHistory: history });
        } catch {
          // Keep local cache on failure (offline-first)
        } finally {
          set({ isLoadingHistory: false });
        }
      },

      runScan: async (imageUri, userId, socialMeta) => {
        set({ isScanning: true });
        try {
          const result = await api.scan.analyze(imageUri, userId, socialMeta);
          set((state) => ({
            currentScan: result,
            scanHistory: [result, ...state.scanHistory],
          }));
          return result;
        } finally {
          set({ isScanning: false });
        }
      },

      reset: () => set({ currentScan: null, scanHistory: [], isScanning: false }),
    }),
    {
      name: 'scan-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Cache last 20 scans locally for offline history
      partialize: (state) => ({
        scanHistory: state.scanHistory.slice(0, 20),
        currentScan: state.currentScan,
      }),
    }
  )
);
