import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

export const locales = ['en', 'he', 'es'] as const
export type Locale = (typeof locales)[number]

export const rtlLocales = ['he'] as const

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')
  const locale = (localeCookie?.value as Locale) || 'en'

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
