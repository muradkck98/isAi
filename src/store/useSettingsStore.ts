import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import type { Language } from '../i18n';

export type ThemeMode = 'light' | 'dark' | 'system';

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
      themeMode: 'system',
      resolvedTheme: getSystemTheme(),

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
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
