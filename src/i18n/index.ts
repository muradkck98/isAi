import { en, TranslationKeys } from './locales/en';
import { tr } from './locales/tr';
import { es } from './locales/es';
import { ja } from './locales/ja';
import { zh } from './locales/zh';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { ko } from './locales/ko';
import { pt } from './locales/pt';
import { ru } from './locales/ru';
import { ar } from './locales/ar';
import { hi } from './locales/hi';
import { it } from './locales/it';

export type Language = 'en' | 'tr' | 'es' | 'ja' | 'zh' | 'de' | 'fr' | 'ko' | 'pt' | 'ru' | 'ar' | 'hi' | 'it';

const translations: Record<Language, TranslationKeys> = {
  en,
  tr,
  es,
  ja,
  zh,
  de,
  fr,
  ko,
  pt,
  ru,
  ar,
  hi,
  it,
};

export function getTranslations(lang: Language): TranslationKeys {
  return translations[lang] || translations.en;
}

export const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string; nativeLabel: string }[] = [
  { code: 'en', label: 'English',    flag: '🇺🇸', nativeLabel: 'English' },
  { code: 'ja', label: 'Japanese',   flag: '🇯🇵', nativeLabel: '日本語' },
  { code: 'zh', label: 'Chinese',    flag: '🇨🇳', nativeLabel: '中文' },
  { code: 'de', label: 'German',     flag: '🇩🇪', nativeLabel: 'Deutsch' },
  { code: 'fr', label: 'French',     flag: '🇫🇷', nativeLabel: 'Français' },
  { code: 'ko', label: 'Korean',     flag: '🇰🇷', nativeLabel: '한국어' },
  { code: 'pt', label: 'Portuguese', flag: '🇧🇷', nativeLabel: 'Português' },
  { code: 'es', label: 'Spanish',    flag: '🇪🇸', nativeLabel: 'Español' },
  { code: 'ru', label: 'Russian',    flag: '🇷🇺', nativeLabel: 'Русский' },
  { code: 'ar', label: 'Arabic',     flag: '🇸🇦', nativeLabel: 'العربية' },
  { code: 'hi', label: 'Hindi',      flag: '🇮🇳', nativeLabel: 'हिंदी' },
  { code: 'it', label: 'Italian',    flag: '🇮🇹', nativeLabel: 'Italiano' },
  { code: 'tr', label: 'Turkish',    flag: '🇹🇷', nativeLabel: 'Türkçe' },
];

export type { TranslationKeys };
