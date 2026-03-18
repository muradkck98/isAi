import { useMemo } from 'react';
import { colors as lightColors } from '../theme/colors';
import { darkColors } from '../theme/darkColors';
import { useSettingsStore } from '../store/useSettingsStore';

export function useThemeColors() {
  const resolvedTheme = useSettingsStore((s) => s.resolvedTheme);

  const themeColors = useMemo(
    () => (resolvedTheme === 'dark' ? darkColors : lightColors),
    [resolvedTheme]
  );

  return themeColors;
}

export function useIsDark() {
  return useSettingsStore((s) => s.resolvedTheme === 'dark');
}
