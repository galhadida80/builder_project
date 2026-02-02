import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enTranslations from './locales/en.json';
import heTranslations from './locales/he.json';

// List all namespaces available in translation files
const NAMESPACES = [
  'common',
  'nav',
  'login',
  'dashboard',
  'projects',
  'equipment',
  'materials',
  'meetings',
  'approvals',
  'areas',
  'contacts',
  'inspections',
  'rfis',
  'audit'
];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslations,
      he: heTranslations
    },
    defaultNS: 'common',
    ns: NAMESPACES,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
