import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RTL_LANGUAGES, LanguageCode, DEFAULT_LANGUAGE } from './config'

type Direction = 'ltr' | 'rtl'

interface LanguageContextType {
  language: LanguageCode
  setLanguage: (lang: LanguageCode) => void
  direction: Direction
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider')
  }
  return context
}

interface LanguageProviderProps {
  children: React.ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { i18n } = useTranslation()

  const [language, setLanguageState] = useState<LanguageCode>(() => {
    const stored = localStorage.getItem('language')
    return (stored as LanguageCode) || DEFAULT_LANGUAGE
  })

  const isRTL = useMemo(() => {
    return RTL_LANGUAGES.includes(language)
  }, [language])

  const direction: Direction = useMemo(() => {
    return isRTL ? 'rtl' : 'ltr'
  }, [isRTL])

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang)
    i18n.changeLanguage(lang).catch((error) => {
      console.error('Failed to change language:', error)
    })
  }

  useEffect(() => {
    localStorage.setItem('language', language)
    document.documentElement.setAttribute('dir', direction)
    document.documentElement.setAttribute('lang', language)
  }, [language, direction])

  useEffect(() => {
    const currentLang = i18n.language as LanguageCode
    if (currentLang !== language) {
      setLanguage(currentLang)
    }
  }, [])

  const value = useMemo(() => ({
    language,
    setLanguage,
    direction,
    isRTL,
  }), [language, direction, isRTL])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}
