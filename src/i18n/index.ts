import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Only bundle English synchronously – other locales are lazy-loaded on demand
import en from './locales/en.json';

export const supportedLanguages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const;

// Read stored language synchronously to prevent flicker in PWA
const storedLang = (() => {
  try {
    return localStorage.getItem('i18nextLng') || undefined;
  } catch {
    return undefined;
  }
})();

const nonEnglishCodes = ['es', 'pt', 'fr', 'de'] as const;
const detectedLang = storedLang && [...nonEnglishCodes, 'en'].includes(storedLang) ? storedLang : undefined;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    lng: detectedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    // Allow adding resources asynchronously
    partialBundledLanguages: true,
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LocaleLoader = () => Promise<{ default: any }>;

// Lazy-load non-English locale if needed
if (detectedLang && detectedLang !== 'en') {
  const loaders: Record<string, LocaleLoader> = {
    es: () => import('./locales/es.json'),
    pt: () => import('./locales/pt.json'),
    fr: () => import('./locales/fr.json'),
    de: () => import('./locales/de.json'),
  };

  const loader = loaders[detectedLang];
  if (loader) {
    loader().then((mod) => {
      i18n.addResourceBundle(detectedLang, 'translation', mod.default, true, true);
      // Trigger re-render with newly loaded translations
      i18n.changeLanguage(detectedLang);
    });
  }
}

// Also lazy-load when language changes at runtime
i18n.on('languageChanged', (lng) => {
  if (lng === 'en' || i18n.hasResourceBundle(lng, 'translation')) return;
  const loaders: Record<string, LocaleLoader> = {
    es: () => import('./locales/es.json'),
    pt: () => import('./locales/pt.json'),
    fr: () => import('./locales/fr.json'),
    de: () => import('./locales/de.json'),
  };
  const loader = loaders[lng];
  if (loader) {
    loader().then((mod) => {
      i18n.addResourceBundle(lng, 'translation', mod.default, true, true);
      i18n.changeLanguage(lng);
    });
  }
});

export default i18n;
