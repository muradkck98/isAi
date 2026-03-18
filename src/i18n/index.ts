import { en, TranslationKeys } from './locales/en';
import { tr } from './locales/tr';
import { es } from './locales/es';

export type Language = 'en' | 'tr' | 'es';

const translations: Record<Language, TranslationKeys> = {
  en,
  tr,
  es,
};

export function getTranslations(lang: Language): TranslationKeys {
  return translations[lang] || translations.en;
}

export const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'tr', label: 'Türkçe',  flag: '🇹🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

export type { TranslationKeys };
