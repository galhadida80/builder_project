import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import dayjs from 'dayjs'
import 'dayjs/locale/he'
import 'dayjs/locale/es'
import enTranslations from './locales/en.json'
import heTranslations from './locales/he.json'
import esTranslations from './locales/es.json'

// Configure dayjs with default locale on initialization
dayjs.locale('en')

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      he: { translation: heTranslations },
      es: { translation: esTranslations },
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
  if (lng === 'he') {
    dayjs.locale('he')
  } else if (lng === 'es') {
    dayjs.locale('es')
  } else {
    dayjs.locale('en')
  }
})

export default i18n
