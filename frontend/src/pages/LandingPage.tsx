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
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', overflowX: 'hidden' }}>
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
