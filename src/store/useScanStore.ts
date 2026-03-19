import { create } from 'zustand';
import { ScanResult } from '../types';
import { api } from '../services/api';

// No AsyncStorage persistence — scan history is always fetched from Supabase.
// Eliminates "NativeModule: AsyncStorage is null" errors.

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

export const useScanStore = create<ScanState>()((set, get) => ({
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
      // Keep current state on failure
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
        // Keep last 50 scans in memory
        scanHistory: [result, ...state.scanHistory].slice(0, 50),
      }));
      return result;
    } finally {
      set({ isScanning: false });
    }
  },

  reset: () => set({ currentScan: null, scanHistory: [], isScanning: false }),
}));
