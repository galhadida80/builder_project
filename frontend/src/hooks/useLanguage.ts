import { useTranslation } from 'react-i18next'

export type SupportedLanguage = 'en' | 'he'

export interface UseLanguageReturn {
  language: SupportedLanguage
  changeLanguage: (lng: SupportedLanguage) => Promise<void>
  t: (key: string) => string
}

/**
 * Custom hook for managing language selection and translation
 * Wraps react-i18next with type-safe language options
 */
export function useLanguage(): UseLanguageReturn {
  const { i18n, t } = useTranslation()

  const changeLanguage = async (lng: SupportedLanguage): Promise<void> => {
    await i18n.changeLanguage(lng)
  }

  return {
    language: i18n.language as SupportedLanguage,
    changeLanguage,
    t,
  }
}
