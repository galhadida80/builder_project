import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: {},
      },
      he: {
        translation: {},
      },
      es: {
        translation: {},
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'he', 'es'],
    interpolation: {
      escapeValue: false, // React already handles escaping
    },
    react: {
      useSuspense: false,
    },
  })

export default i18n
