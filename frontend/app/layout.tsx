import type { Metadata, Viewport } from 'next'
import { headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import ThemeRegistry from '@/components/providers/ThemeRegistry'
import './globals.css'

export const metadata: Metadata = {
  title: 'BuilderOps - Construction Management Platform',
  description: 'Comprehensive platform for managing construction projects, equipment approvals, inspections, and team collaboration.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0369A1',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const direction = (headersList.get('x-direction') || 'ltr') as 'ltr' | 'rtl'
  const locale = headersList.get('x-locale') || 'en'
  const messages = await getMessages()

  return (
    <html lang={locale} dir={direction}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Heebo:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeRegistry initialDirection={direction}>
            {children}
          </ThemeRegistry>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
