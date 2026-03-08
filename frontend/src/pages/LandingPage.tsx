import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Box } from '@/mui'
import LandingNav from '@/components/landing/LandingNav'
import LandingHero from '@/components/landing/LandingHero'
import LandingStats from '@/components/landing/LandingStats'
import LandingFeatures from '@/components/landing/LandingFeatures'
import LandingShowcase from '@/components/landing/LandingShowcase'
import LandingTestimonials from '@/components/landing/LandingTestimonials'
import LandingPricing from '@/components/landing/LandingPricing'
import LandingFAQ from '@/components/landing/LandingFAQ'
import LandingFooter from '@/components/landing/LandingFooter'

export default function LandingPage() {
  const { i18n } = useTranslation()

  useEffect(() => {
    const prevLang = i18n.language
    if (prevLang !== 'he') {
      i18n.changeLanguage('he')
      document.documentElement.setAttribute('dir', 'rtl')
      document.documentElement.setAttribute('lang', 'he')
    }
    return () => {
      if (prevLang !== 'he') {
        i18n.changeLanguage(prevLang)
        document.documentElement.setAttribute('dir', prevLang === 'he' ? 'rtl' : 'ltr')
        document.documentElement.setAttribute('lang', prevLang)
      }
    }
  }, [i18n])

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', overflowX: 'hidden', direction: 'rtl' }}>
      <LandingNav />
      <LandingHero />
      <LandingStats />
      <LandingFeatures />
      <LandingShowcase />
      <LandingTestimonials />
      <LandingPricing />
      <LandingFAQ />
      <LandingFooter />
    </Box>
  )
}
