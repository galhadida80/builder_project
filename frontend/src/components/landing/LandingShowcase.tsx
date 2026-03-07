import { useTranslation } from 'react-i18next'
import { useInView } from '@/hooks/useInView'
import { SettingsIcon, DashboardIcon, BarChartIcon, ArrowForwardIcon } from '@/icons'
import { Box, Container, Typography } from '@/mui'

export default function LandingShowcase() {
  const { t } = useTranslation()
  const { ref: stepsRef, isVisible: stepsVisible } = useInView(0.1)
  const { ref: demoRef, isVisible: demoVisible } = useInView(0.1)

  const STEPS = [
    { num: '01', icon: <SettingsIcon sx={{ fontSize: 28 }} />, titleKey: 'step1Title', descKey: 'step1Desc', color: '#C75B20' },
    { num: '02', icon: <DashboardIcon sx={{ fontSize: 28 }} />, titleKey: 'step2Title', descKey: 'step2Desc', color: '#2563eb' },
    { num: '03', icon: <BarChartIcon sx={{ fontSize: 28 }} />, titleKey: 'step3Title', descKey: 'step3Desc', color: '#16a34a' },
  ]

  return (
    <>
      {/* How It Works */}
      <Box
        id="how-it-works"
        ref={stepsRef}
        sx={{
          py: { xs: 8, md: 12 },
          px: { xs: 2, md: 6 },
          bgcolor: (th) => th.palette.mode === 'dark' ? 'background.default' : '#faf8f6',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 } }}>
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'primary.main', mb: 1.5 }}>
              {t('landing.howItWorks.label')}
            </Typography>
            <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              {t('landing.howItWorks.title')}
            </Typography>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 3, md: 4 }, position: 'relative' }}>
            {/* Connector line (desktop only) */}
            <Box
              sx={{
                display: { xs: 'none', md: 'block' },
                position: 'absolute',
                top: 52,
                left: '20%',
                right: '20%',
                height: 2,
                bgcolor: 'divider',
                zIndex: 0,
              }}
            />
            {STEPS.map((step, index) => (
              <Box
                key={step.num}
                sx={{
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 1,
                  opacity: stepsVisible ? 1 : 0,
                  transform: stepsVisible ? 'translateY(0)' : 'translateY(24px)',
                  transition: 'all 500ms ease',
                  transitionDelay: `${index * 150}ms`,
                }}
              >
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    bgcolor: `${step.color}12`,
                    border: `2px solid ${step.color}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                    color: step.color,
                    position: 'relative',
                  }}
                >
                  {step.icon}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: step.color,
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                    }}
                  >
                    {step.num}
                  </Box>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: 'text.primary', mb: 1 }}>
                  {t(`landing.howItWorks.${step.titleKey}`)}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.7, maxWidth: 280, mx: 'auto' }}>
                  {t(`landing.howItWorks.${step.descKey}`)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Demo / Video Section */}
      <Box
        id="demo"
        ref={demoRef}
        sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 6 } }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
            <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary', mb: 2 }}>
              {t('landing.demo.title')}
            </Typography>
            <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.7, maxWidth: 520, mx: 'auto' }}>
              {t('landing.demo.subtitle')}
            </Typography>
          </Box>

          {/* Video placeholder */}
          <Box
            sx={{
              position: 'relative',
              borderRadius: 4,
              overflow: 'hidden',
              bgcolor: '#0f172a',
              aspectRatio: '16/9',
              boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
              opacity: demoVisible ? 1 : 0,
              transform: demoVisible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.97)',
              transition: 'all 600ms ease',
              cursor: 'pointer',
              '&:hover .play-btn': { transform: 'translate(-50%, -50%) scale(1.1)' },
            }}
          >
            {/* Gradient overlay */}
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(199,91,32,0.3) 0%, rgba(15,23,42,0.8) 100%)' }} />
            {/* Play button */}
            <Box
              className="play-btn"
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                transition: 'transform 300ms ease',
              }}
            >
              <ArrowForwardIcon sx={{ fontSize: 28, color: '#C75B20', transform: 'rotate(0deg)' }} />
            </Box>
            {/* Decorative lines */}
            <Box sx={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <Box sx={{ height: 4, width: '60%', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }} />
                <Box sx={{ height: 4, flex: 1, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
              </Box>
              <Box sx={{ height: 4, width: '40%', bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
            </Box>
          </Box>
        </Container>
      </Box>
    </>
  )
}
