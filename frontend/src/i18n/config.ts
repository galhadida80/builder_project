import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enTranslations from './locales/en.json'
import heTranslations from './locales/he.json'
import esTranslations from './locales/es.json'

export type LanguageCode = 'en' | 'he' | 'es'

export const SUPPORTED_LANGUAGES: { code: LanguageCode; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
]

export const RTL_LANGUAGES: LanguageCode[] = ['he']
export const DEFAULT_LANGUAGE: LanguageCode = 'he'

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      he: {
        translation: heTranslations,
      },
      es: {
        translation: esTranslations,
      },
    },
    lng: 'he',
    fallbackLng: 'en',
    supportedLngs: ['en', 'he', 'es'],
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    react: {
      useSuspense: false,
    },
  })

// Set HTML dir attribute based on language
const setHtmlDir = (language: string) => {
  const isRTL = language === 'he'
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
}

// Set initial direction
setHtmlDir(i18n.language)

// Update direction when language changes
i18n.on('languageChanged', (lng) => {
  setHtmlDir(lng)
})

export default i18n
