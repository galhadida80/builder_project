import { useTranslation } from 'react-i18next'
import { useInView } from '@/hooks/useInView'
import {
  SpeedIcon, ConstructionIcon, SearchIcon,
  SmartToyIcon, AssignmentTurnedInIcon, BarChartIcon,
} from '@/icons'
import { Box, Container, Typography } from '@/mui'

const FEATURE_ICONS = [
  { icon: <SpeedIcon sx={{ fontSize: 32 }} />, key: 'realTimeTracking', accent: '#C75B20' },
  { icon: <ConstructionIcon sx={{ fontSize: 32 }} />, key: 'equipmentManagement', accent: '#2563eb' },
  { icon: <SearchIcon sx={{ fontSize: 32 }} />, key: 'inspectionSystem', accent: '#16a34a' },
  { icon: <SmartToyIcon sx={{ fontSize: 32 }} />, key: 'teamCollaboration', accent: '#9333ea' },
  { icon: <AssignmentTurnedInIcon sx={{ fontSize: 32 }} />, key: 'approvalWorkflows', accent: '#0891b2' },
  { icon: <BarChartIcon sx={{ fontSize: 32 }} />, key: 'analyticsReports', accent: '#e11d48' },
]

export default function LandingFeatures() {
  const { t } = useTranslation()
  const { ref, isVisible } = useInView(0.1)

  return (
    <Box id="features" ref={ref} sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 6 } }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 }, maxWidth: 600, mx: 'auto' }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'primary.main',
              mb: 1.5,
            }}
          >
            {t('landing.featuresLabel')}
          </Typography>
          <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary', mb: 2, lineHeight: 1.2 }}>
            {t('landing.featuresTitle')}
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: 'text.secondary', lineHeight: 1.7 }}>
            {t('landing.featuresSubtitle')}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {FEATURE_ICONS.map((feature, index) => (
            <Box
              key={feature.key}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 300ms ease',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
                transitionDelay: `${index * 80}ms`,
                cursor: 'default',
                '&:hover': {
                  borderColor: feature.accent,
                  boxShadow: `0 8px 32px ${feature.accent}15`,
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 3,
                  bgcolor: `${feature.accent}10`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feature.accent,
                  mb: 2.5,
                }}
              >
                {feature.icon}
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: '1.05rem', color: 'text.primary', mb: 1 }}>
                {t(`landing.features.${feature.key}`)}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', lineHeight: 1.7 }}>
                {t(`landing.features.${feature.key}Desc`)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
