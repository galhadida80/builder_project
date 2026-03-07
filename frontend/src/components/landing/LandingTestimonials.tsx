import { useTranslation } from 'react-i18next'
import { useInView } from '@/hooks/useInView'
import { FormatQuoteIcon, StarIcon } from '@/icons'
import { Box, Container, Typography, Avatar } from '@/mui'
import { useMemo } from 'react'

export default function LandingTestimonials() {
  const { t } = useTranslation()
  const { ref, isVisible } = useInView(0.1)

  const TESTIMONIALS = useMemo(() => [
    {
      quote: t('landing.testimonials.quote1'),
      name: t('landing.testimonials.name1'),
      role: t('landing.testimonials.role1'),
      initials: 'DC',
      color: '#C75B20',
    },
    {
      quote: t('landing.testimonials.quote2'),
      name: t('landing.testimonials.name2'),
      role: t('landing.testimonials.role2'),
      initials: 'ST',
      color: '#2563eb',
    },
    {
      quote: t('landing.testimonials.quote3'),
      name: t('landing.testimonials.name3'),
      role: t('landing.testimonials.role3'),
      initials: 'MR',
      color: '#16a34a',
    },
  ], [t])

  return (
    <Box
      ref={ref}
      sx={{
        py: { xs: 8, md: 12 },
        px: { xs: 2, md: 6 },
        bgcolor: (th) => th.palette.mode === 'dark' ? 'background.default' : '#faf8f6',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 } }}>
          <FormatQuoteIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.3, mb: 1 }} />
          <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary' }}>
            {t('landing.testimonials.sectionTitle')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: { xs: 2.5, md: 3 },
          }}
        >
          {TESTIMONIALS.map((item, index) => (
            <Box
              key={index}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 400ms ease',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${index * 120}ms`,
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                  transform: 'translateY(-4px)',
                },
              }}
            >
              {/* Stars */}
              <Box sx={{ display: 'flex', gap: 0.25, mb: 2 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon key={i} sx={{ fontSize: 16, color: '#f59e0b' }} />
                ))}
              </Box>

              <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'text.primary', flex: 1, mb: 3 }}>
                &ldquo;{item.quote}&rdquo;
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: item.color, fontSize: '0.8rem', fontWeight: 700 }}>
                  {item.initials}
                </Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary' }}>
                    {item.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {item.role}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
