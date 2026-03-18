import { useMemo } from 'react';
import { getTranslations } from '../i18n';
import { useSettingsStore } from '../store/useSettingsStore';

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);

  const t = useMemo(() => getTranslations(language), [language]);

  return { t, language };
}
