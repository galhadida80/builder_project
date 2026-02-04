import { Box, Container, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { Button } from './ui/Button'

// Styled Components
const HeroSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  minHeight: '600px',
  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.primary.dark : '#1a1a1a',
  color: theme.palette.mode === 'dark' ? theme.palette.text.primary : '#ffffff',
  display: 'flex',
  alignItems: 'center',
  overflow: 'hidden',
  paddingTop: theme.spacing(10),
  paddingBottom: theme.spacing(10),
  [theme.breakpoints.down('md')]: {
    minHeight: '500px',
    paddingTop: theme.spacing(8),
    paddingBottom: theme.spacing(8),
  },
  [theme.breakpoints.down('sm')]: {
    minHeight: '400px',
    paddingTop: theme.spacing(6),
    paddingBottom: theme.spacing(6),
  },
}))

const BackgroundOverlay = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.6) 100%)',
  zIndex: 1,
}))

const BackgroundImage = styled(Box)<{ imageUrl?: string }>(({ imageUrl }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundImage: imageUrl ? `url(${imageUrl})` : 'none',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  opacity: 0.3,
  zIndex: 0,
}))

const HeroContent = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  maxWidth: '900px',
  margin: '0 auto',
  [theme.breakpoints.down('sm')]: {
    maxWidth: '100%',
  },
}))

const HeroTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 700,
  fontSize: '3.5rem',
  lineHeight: 1.2,
  marginBottom: theme.spacing(3),
  color: '#ffffff',
  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  [theme.breakpoints.down('md')]: {
    fontSize: '2.5rem',
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '2rem',
    marginBottom: theme.spacing(2),
  },
}))

const HeroSubtitle = styled(Typography)(({ theme }) => ({
  fontSize: '1.25rem',
  lineHeight: 1.6,
  marginBottom: theme.spacing(5),
  color: 'rgba(255, 255, 255, 0.9)',
  fontWeight: 400,
  [theme.breakpoints.down('md')]: {
    fontSize: '1.1rem',
    marginBottom: theme.spacing(4),
  },
  [theme.breakpoints.down('sm')]: {
    fontSize: '1rem',
    marginBottom: theme.spacing(3),
  },
}))

const CTAContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  justifyContent: 'center',
  marginBottom: theme.spacing(8),
  flexWrap: 'wrap',
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(6),
    '& button': {
      width: '100%',
      maxWidth: '300px',
    },
  },
}))

const TrustLogosSection = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 2,
  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  paddingTop: theme.spacing(5),
  marginTop: theme.spacing(5),
  [theme.breakpoints.down('sm')]: {
    paddingTop: theme.spacing(4),
    marginTop: theme.spacing(4),
  },
}))

const TrustLogosTitle = styled(Typography)(({ theme }) => ({
  fontSize: '0.875rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'rgba(255, 255, 255, 0.6)',
  marginBottom: theme.spacing(3),
  textAlign: 'center',
  [theme.breakpoints.down('sm')]: {
    fontSize: '0.75rem',
    marginBottom: theme.spacing(2),
  },
}))

const LogosGrid = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: theme.spacing(6),
  flexWrap: 'wrap',
  [theme.breakpoints.down('md')]: {
    gap: theme.spacing(4),
  },
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(3),
  },
}))

const LogoBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '40px',
  opacity: 0.7,
  transition: 'opacity 200ms ease-out',
  filter: 'grayscale(100%) brightness(200%)',
  '&:hover': {
    opacity: 1,
  },
  '& img': {
    maxHeight: '100%',
    maxWidth: '120px',
    objectFit: 'contain',
  },
  [theme.breakpoints.down('sm')]: {
    height: '30px',
    '& img': {
      maxWidth: '100px',
    },
  },
}))

// Component Props
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
  title = 'Build Smarter Inspect Faster Deliver Excellence',
  subtitle = 'Streamline your construction management with our comprehensive platform. From project planning to final inspection, we\'ve got you covered.',
  ctaPrimaryText = 'Request Demo',
  ctaPrimaryAction,
  ctaSecondaryText = 'Login',
  ctaSecondaryAction,
  backgroundImageUrl,
  trustLogos = [],
  showTrustLogos = true,
}: HeroProps) {
  return (
    <HeroSection>
      <BackgroundImage imageUrl={backgroundImageUrl} />
      <BackgroundOverlay />

      <Container maxWidth="lg">
        <HeroContent>
          <HeroTitle variant="h1">{title}</HeroTitle>
          <HeroSubtitle variant="h5">{subtitle}</HeroSubtitle>

          <CTAContainer>
            <Button
              variant="primary"
              size="large"
              onClick={ctaPrimaryAction}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                minWidth: '180px',
              }}
            >
              {ctaPrimaryText}
            </Button>
            <Button
              variant="secondary"
              size="large"
              onClick={ctaSecondaryAction}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                minWidth: '180px',
              }}
            >
              {ctaSecondaryText}
            </Button>
          </CTAContainer>

          {showTrustLogos && trustLogos.length > 0 && (
            <TrustLogosSection>
              <TrustLogosTitle>Trusted by Industry Leaders</TrustLogosTitle>
              <LogosGrid>
                {trustLogos.map((logo, index) => (
                  <LogoBox key={index}>
                    <img src={logo.imageUrl} alt={logo.alt} />
                  </LogoBox>
                ))}
              </LogosGrid>
            </TrustLogosSection>
          )}
        </HeroContent>
      </Container>
    </HeroSection>
  )
}
