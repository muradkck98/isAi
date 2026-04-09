import { create } from 'zustand';
import { ScanResult } from '../types';
import { api } from '../services/api';

interface ScanState {
  currentScan: ScanResult | null;
  isScanning: boolean;

  setCurrentScan: (scan: ScanResult | null) => void;
  setScanning: (isScanning: boolean) => void;

  runScan: (
    imageUri: string,
    userId: string,
    socialMeta?: { platform?: string; postUrl?: string; authorName?: string | null }
  ) => Promise<ScanResult>;

  reset: () => void;
}

export const useScanStore = create<ScanState>()((set) => ({
  currentScan: null,
  isScanning: false,

  setCurrentScan: (currentScan) => set({ currentScan }),
  setScanning: (isScanning) => set({ isScanning }),

  runScan: async (imageUri, userId, socialMeta) => {
    set({ isScanning: true });
    try {
      const result = await api.scan.analyze(imageUri, userId, socialMeta);
      set({ currentScan: result });
      return result;
    } finally {
      set({ isScanning: false });
    }
  },

  reset: () => set({ currentScan: null, isScanning: false }),
}));
