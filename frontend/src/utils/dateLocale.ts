import i18n from '../i18n/config'

const LOCALE_MAP: Record<string, string> = {
  he: 'he-IL',
  es: 'es-ES',
  en: 'en-US',
}

export function getDateLocale(): string {
  return LOCALE_MAP[i18n.language] || 'en-US'
}
