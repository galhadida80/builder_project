import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/Button'
import { ArrowForwardIcon, ConstructionIcon } from '@/icons'
import { Box, Container, Typography, Chip, keyframes } from '@/mui'

const float1 = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(15px, -25px) rotate(8deg); }
`
const float2 = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(-20px, 15px) rotate(-6deg); }
`
const float3 = keyframes`
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(10px, 20px) rotate(4deg); }
`

const BRAND_GRADIENT = 'linear-gradient(160deg, #8B3A14 0%, #C75B20 40%, #E07842 70%, #E89060 100%)'

export default function LandingHero() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <Box id="hero" sx={{ position: 'relative', overflow: 'hidden', background: BRAND_GRADIENT, minHeight: { xs: '100dvh', md: '92vh' } }}>
      {/* Floating shapes */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <Box sx={{ position: 'absolute', top: '15%', right: '10%', width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)', animation: `${float1} 8s ease-in-out infinite` }} />
        <Box sx={{ position: 'absolute', top: '55%', right: '25%', width: 80, height: 80, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.04)', animation: `${float2} 10s ease-in-out infinite` }} />
        <Box sx={{ position: 'absolute', bottom: '20%', left: '8%', width: 60, height: 60, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)', animation: `${float3} 7s ease-in-out infinite` }} />
        <Box sx={{ position: 'absolute', top: '30%', left: '15%', width: 100, height: 100, borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', animation: `${float2} 12s ease-in-out infinite` }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, pt: { xs: 14, md: 16 }, pb: { xs: 6, md: 10 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: { xs: 5, md: 8 } }}>
          {/* Text content */}
          <Box sx={{ flex: 1, textAlign: { xs: 'center', md: 'start' } }}>
            <Chip
              label={t('landing.heroBadge')}
              sx={{
                mb: 3,
                bgcolor: 'rgba(255,255,255,0.15)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.8rem',
                height: 36,
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            />
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '2.25rem', sm: '3rem', md: '3.5rem' },
                fontWeight: 800,
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
                color: 'white',
                mb: 2.5,
                whiteSpace: 'pre-line',
              }}
            >
              {t('landing.heroTitle')}
            </Typography>
            <Typography sx={{ fontSize: { xs: '1rem', md: '1.15rem' }, lineHeight: 1.75, color: 'rgba(255,255,255,0.85)', mb: 4, maxWidth: 520, mx: { xs: 'auto', md: 0 } }}>
              {t('landing.heroSubtitle')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: { xs: 'center', md: 'flex-start' } }}>
              <Button
                variant="primary"
                size="large"
                onClick={() => navigate('/login')}
                icon={<ArrowForwardIcon />}
                iconPosition="end"
                sx={{ py: 1.75, px: 4, fontSize: '1rem', fontWeight: 700, borderRadius: 3, bgcolor: 'white', color: '#a85020', '&:hover': { bgcolor: 'rgba(255,255,255,0.92)' } }}
              >
                {t('landing.getStarted')}
              </Button>
              <Button
                variant="secondary"
                size="large"
                onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                sx={{ py: 1.75, px: 4, fontSize: '1rem', fontWeight: 700, borderRadius: 3, borderColor: 'rgba(255,255,255,0.35)', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                {t('landing.requestDemo')}
              </Button>
            </Box>
            <Typography sx={{ mt: 3, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
              {t('landing.trustedBy')}
            </Typography>
          </Box>

          {/* Dashboard mockup */}
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' }, maxWidth: 520 }}>
            <DashboardMockup />
          </Box>
        </Box>
      </Container>
    </Box>
  )
}

function DashboardMockup() {
  return (
    <Box sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 32px 64px rgba(0,0,0,0.3)', transform: 'perspective(1200px) rotateY(-4deg)', transition: 'transform 400ms ease', '&:hover': { transform: 'perspective(1200px) rotateY(0deg)' } }}>
      {/* Browser chrome */}
      <Box sx={{ px: 2, py: 1.25, bgcolor: '#1e293b', display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ffbd2e' }} />
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28ca42' }} />
        <Box sx={{ flex: 1, bgcolor: '#0f172a', borderRadius: 1, px: 1.5, py: 0.5, mx: 1 }}>
          <Typography sx={{ fontSize: '0.6rem', color: '#64748b' }}>app.builderops.dev/dashboard</Typography>
        </Box>
      </Box>
      {/* Dashboard content */}
      <Box sx={{ p: 2, bgcolor: '#0f172a' }}>
        {/* Header bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ConstructionIcon sx={{ fontSize: 14, color: '#C75B20' }} />
            <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color: '#e2e8f0' }}>BuilderOps</Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#1e293b' }} />
        </Box>
        {/* KPI cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.5 }}>
          {['#C75B20', '#22c55e', '#3b82f6'].map((color) => (
            <Box key={color} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: `${color}12`, border: `1px solid ${color}25` }}>
              <Box sx={{ width: 20, height: 3, bgcolor: `${color}80`, borderRadius: 1, mb: 0.75 }} />
              <Box sx={{ width: 35, height: 7, bgcolor: color, borderRadius: 1 }} />
            </Box>
          ))}
        </Box>
        {/* Chart + sidebar */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1 }}>
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#1e293b', minHeight: 70 }}>
            <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'flex-end', height: 45 }}>
              {[55, 35, 70, 50, 80, 40, 65, 75, 45, 60].map((h, i) => (
                <Box key={i} sx={{ flex: 1, height: `${h}%`, bgcolor: '#C75B20', borderRadius: '2px 2px 0 0', opacity: 0.6 + i * 0.04 }} />
              ))}
            </Box>
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 1.5, bgcolor: '#1e293b' }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ display: 'flex', gap: 0.5, mb: 1, alignItems: 'center' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: i === 1 ? '#C75B20' : i === 2 ? '#22c55e' : '#3b82f6' }} />
                <Box sx={{ flex: 1, height: 4, bgcolor: '#334155', borderRadius: 1 }} />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
