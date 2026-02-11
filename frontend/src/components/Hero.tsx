import { Button } from './ui/Button'
import { Box, Container, Typography } from '@/mui'

export interface HeroProps {
  title?: string
  subtitle?: string
  ctaPrimaryText?: string
  ctaPrimaryAction?: () => void
  ctaSecondaryText?: string
  ctaSecondaryAction?: () => void
  backgroundImageUrl?: string
  trustLogos?: Array<{
    name: string
    imageUrl: string
    alt: string
  }>
  showTrustLogos?: boolean
}

export function Hero({
  title = 'Build Smarter\nInspect Faster\nDeliver Excellence',
  subtitle = 'Streamline your construction management with our comprehensive platform. From project planning to final inspection, we\'ve got you covered.',
  ctaPrimaryText = 'Request Demo',
  ctaPrimaryAction,
  ctaSecondaryText = 'Login',
  ctaSecondaryAction,
  trustLogos = [],
  showTrustLogos = true,
}: HeroProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: '100vh', md: '100vh' },
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'linear-gradient(160deg, #075985 0%, #0369A1 35%, #0284C7 65%, #0EA5E9 100%)',
        color: 'white',
      }}
    >
      {/* Dot pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.05,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Decorative glows */}
      <Box
        sx={{
          position: 'absolute',
          top: '-25%',
          right: '-10%',
          width: '50%',
          height: '70%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: '-20%',
          left: '-8%',
          width: '40%',
          height: '50%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 8, md: 0 } }}>
        <Box
          sx={{
            textAlign: 'center',
            maxWidth: 780,
            mx: 'auto',
          }}
        >
          {/* Title */}
          <Typography
            variant="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2.25rem', sm: '3rem', md: '3.75rem', lg: '4.25rem' },
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              mb: 3,
              whiteSpace: 'pre-line',
            }}
          >
            {title}
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="h5"
            sx={{
              fontSize: { xs: '1rem', sm: '1.125rem', md: '1.25rem' },
              lineHeight: 1.7,
              fontWeight: 400,
              opacity: 0.85,
              mb: 5,
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            {subtitle}
          </Typography>

          {/* CTA Buttons */}
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
              mb: { xs: 6, md: 8 },
            }}
          >
            <Button
              variant="primary"
              size="large"
              onClick={ctaPrimaryAction}
              sx={{
                px: 5,
                py: 1.75,
                fontSize: '1.05rem',
                minWidth: 200,
                bgcolor: 'white',
                color: '#0369A1',
                fontWeight: 700,
                borderRadius: 2.5,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {ctaPrimaryText}
            </Button>
            <Button
              variant="secondary"
              size="large"
              onClick={ctaSecondaryAction}
              sx={{
                px: 5,
                py: 1.75,
                fontSize: '1.05rem',
                minWidth: 200,
                borderColor: 'rgba(255,255,255,0.5)',
                color: 'white',
                fontWeight: 600,
                borderRadius: 2.5,
                backdropFilter: 'blur(4px)',
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              {ctaSecondaryText}
            </Button>
          </Box>

          {/* Trust Logos */}
          {showTrustLogos && trustLogos.length > 0 && (
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.12)', pt: 4 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  opacity: 0.5,
                  mb: 3,
                }}
              >
                Trusted by Industry Leaders
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: { xs: 3, md: 6 },
                  flexWrap: 'wrap',
                }}
              >
                {trustLogos.map((logo, index) => (
                  <Box
                    key={index}
                    sx={{
                      height: 32,
                      opacity: 0.5,
                      transition: 'opacity 200ms ease-out',
                      filter: 'brightness(0) invert(1)',
                      '&:hover': { opacity: 0.9 },
                      '& img': {
                        maxHeight: '100%',
                        maxWidth: 110,
                        objectFit: 'contain',
                      },
                    }}
                  >
                    <img src={logo.imageUrl} alt={logo.alt} />
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Container>
    </Box>
  )
}
