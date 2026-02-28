import i18n from '../i18n/config'

const LOCALE_MAP: Record<string, string> = {
  he: 'he-IL',
  en: 'en-US',
}

export function getDateLocale(lang?: string): string {
  return LOCALE_MAP[lang || i18n.language] || 'en-US'
}
