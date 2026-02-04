import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import enTranslations from './locales/en.json'
import heTranslations from './locales/he.json'

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  he: 'עברית',
} as const

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES

// RTL languages
export const RTL_LANGUAGES: LanguageCode[] = ['he']

// Default language
export const DEFAULT_LANGUAGE: LanguageCode = 'en'

// Language detector configuration
const detectorOptions = {
  order: ['localStorage', 'navigator'],
  lookupLocalStorage: 'language',
  caches: ['localStorage'],
}

// i18next configuration
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      he: {
        translation: heTranslations,
      },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(SUPPORTED_LANGUAGES),
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false,
    },

    detection: detectorOptions,

    react: {
      useSuspense: false,
    },
  })
  .catch((error) => {
    console.error('Failed to initialize i18n:', error)
  })

export default i18n
