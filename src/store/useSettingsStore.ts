import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Appearance } from 'react-native';
import type { Language } from '../i18n';
import { zustandSecureStorage } from '../lib/storage';

export type ThemeMode = 'light' | 'dark' | 'system';
// Language type is now imported from i18n to keep in sync with 13 supported languages

interface SettingsState {
  language: Language;
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setLanguage: (lang: Language) => void;
  setThemeMode: (mode: ThemeMode) => void;
  resolveTheme: () => void;
}

function getSystemTheme(): 'light' | 'dark' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: 'en',
      themeMode: 'dark',
      resolvedTheme: 'dark',

      setLanguage: (language) => set({ language }),

      setThemeMode: (themeMode) => {
        const resolvedTheme =
          themeMode === 'system' ? getSystemTheme() : themeMode;
        set({ themeMode, resolvedTheme });
      },

      resolveTheme: () => {
        const { themeMode } = get();
        const resolvedTheme =
          themeMode === 'system' ? getSystemTheme() : themeMode;
        set({ resolvedTheme });
      },
    }),
    {
      name: 'settings-store',
      storage: zustandSecureStorage,
    }
  )
);
