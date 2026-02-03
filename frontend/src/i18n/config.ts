import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import dayjs from 'dayjs'
import 'dayjs/locale/he'
import enTranslations from './locales/en.json'
import heTranslations from './locales/he.json'

// Configure dayjs with Hebrew locale on initialization
dayjs.locale('en')

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      he: { translation: heTranslations },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  })

// Update dayjs locale when language changes
i18n.on('languageChanged', (lng) => {
  dayjs.locale(lng === 'he' ? 'he' : 'en')
})

export default i18n
