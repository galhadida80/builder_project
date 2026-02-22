import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import {
  ConstructionIcon, SpeedIcon, SecurityIcon, GroupsIcon,
  AssignmentTurnedInIcon, BarChartIcon, ArrowForwardIcon,
  FormatQuoteIcon, CheckCircleOutlineIcon, StarIcon,
  SearchIcon, SmartToyIcon,
} from '@/icons'
import { Box, Container, Typography, Grid, Avatar } from '@/mui'

export default function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const FEATURES = [
    { icon: <ConstructionIcon sx={{ fontSize: 28 }} />, title: t('landing.features.equipmentManagement') },
    { icon: <SearchIcon sx={{ fontSize: 28 }} />, title: t('landing.features.inspectionSystem') },
    { icon: <SmartToyIcon sx={{ fontSize: 28 }} />, title: t('landing.features.teamCollaboration') },
    { icon: <AssignmentTurnedInIcon sx={{ fontSize: 28 }} />, title: t('landing.features.approvalWorkflows') },
    { icon: <BarChartIcon sx={{ fontSize: 28 }} />, title: t('landing.features.analyticsReports') },
    { icon: <SpeedIcon sx={{ fontSize: 28 }} />, title: t('landing.features.realTimeTracking') },
  ]

  const TESTIMONIALS = useMemo(() => [
    {
      quote: t('landing.testimonials.quote1'),
      name: t('landing.testimonials.name1'),
      role: t('landing.testimonials.role1'),
      initials: 'DC',
    },
    {
      quote: t('landing.testimonials.quote2'),
      name: t('landing.testimonials.name2'),
      role: t('landing.testimonials.role2'),
      initials: 'ST',
    },
    {
      quote: t('landing.testimonials.quote3'),
      name: t('landing.testimonials.name3'),
      role: t('landing.testimonials.role3'),
      initials: 'MR',
    },
  ], [t])

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [TESTIMONIALS.length])

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Sticky Nav */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? 'rgba(26,22,18,0.8)'
            : 'rgba(248,247,245,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: (theme) => `${theme.palette.primary.main}1A`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              bgcolor: 'primary.main',
              p: 0.75,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'primary.contrastText',
            }}
          >
            <ConstructionIcon sx={{ fontSize: 24 }} />
          </Box>
          <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', letterSpacing: '-0.01em', color: 'text.primary' }}>
            BuilderOps
          </Typography>
        </Box>
        <Button
          variant="primary"
          onClick={() => navigate('/login')}
          sx={{
            px: 2.5,
            py: 1,
            borderRadius: 2,
            fontWeight: 700,
            fontSize: '0.875rem',
          }}
        >
          {t('landing.signIn')}
        </Button>
      </Box>

      {/* Hero Section with gradient overlay */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: (theme) => theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${theme.palette.background.default}60 0%, ${theme.palette.background.default} 100%)`
            : `linear-gradient(160deg, #85603a 0%, #c8956a 50%, #d4a67a 100%)`,
          color: 'white',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 2,
            px: { xs: 3, md: 6 },
            pt: { xs: 8, md: 12 },
            pb: { xs: 6, md: 8 },
            maxWidth: { xs: '100%', md: 600 },
            mx: { xs: 'auto', md: 0 },
          }}
        >
          <Container maxWidth="lg">
            <Typography
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                mb: 2,
                whiteSpace: 'pre-line',
                color: (theme) => theme.palette.mode === 'dark' ? 'text.primary' : 'white',
              }}
            >
              {t('landing.heroTitle')}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.7,
                mb: 4,
                opacity: 0.85,
                maxWidth: 480,
                color: (theme) => theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.85)',
              }}
            >
              {t('landing.heroSubtitle')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
              <Button
                variant="primary"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 3,
                  bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.main' : 'white',
                  color: (theme) => theme.palette.mode === 'dark' ? 'primary.contrastText' : '#85603a',
                  '&:hover': {
                    bgcolor: (theme) => theme.palette.mode === 'dark' ? 'primary.dark' : 'rgba(255,255,255,0.9)',
                  },
                }}
              >
                {t('landing.getStarted')}
              </Button>
              <Button
                variant="secondary"
                size="large"
                onClick={() => {}}
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1rem',
                  fontWeight: 700,
                  borderRadius: 3,
                  borderColor: (theme) => theme.palette.mode === 'dark'
                    ? `${theme.palette.primary.main}66`
                    : 'rgba(255,255,255,0.4)',
                  color: (theme) => theme.palette.mode === 'dark' ? 'text.primary' : 'white',
                  '&:hover': {
                    borderColor: (theme) => theme.palette.mode === 'dark'
                      ? 'primary.main'
                      : 'white',
                  },
                }}
              >
                {t('landing.requestDemo')}
              </Button>
            </Box>
          </Container>
        </Box>
      </Box>

      {/* Features Grid (2 columns on mobile) */}
      <Box sx={{ px: { xs: 3, md: 6 }, py: { xs: 6, md: 10 } }}>
        <Container maxWidth="lg">
          <Typography
            sx={{
              fontSize: { xs: '1.5rem', md: '2rem' },
              fontWeight: 700,
              mb: { xs: 4, md: 6 },
              textAlign: 'center',
              color: 'text.primary',
            }}
          >
            {t('landing.featuresTitle')}
          </Typography>
          <Grid container spacing={2}>
            {FEATURES.map((feature, index) => (
              <Grid item xs={6} sm={4} md={4} key={index}>
                <Box
                  sx={{
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: (theme) => `${theme.palette.primary.main}1A`,
                    borderRadius: 3,
                    p: { xs: 2.5, md: 3.5 },
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 1.5,
                    transition: 'all 200ms ease-out',
                    '&:hover': {
                      borderColor: (theme) => `${theme.palette.primary.main}66`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <Box sx={{ color: 'primary.main' }}>
                    {feature.icon}
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3, color: 'text.primary' }}>
                    {feature.title}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Social Proof / Stats */}
      <Box
        sx={{
          bgcolor: (theme) => `${theme.palette.primary.main}0D`,
          borderTop: '1px solid',
          borderBottom: '1px solid',
          borderColor: (theme) => `${theme.palette.primary.main}1A`,
          py: { xs: 6, md: 8 },
          px: { xs: 3, md: 6 },
        }}
      >
        <Container maxWidth="sm">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <StarIcon key={i} sx={{ fontSize: 20, color: 'primary.main' }} />
              ))}
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: '2rem', fontWeight: 800, color: 'primary.main' }}>
                500+
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: 'text.secondary' }}>
                {t('landing.stats.constructionTeams')}
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Testimonials */}
      <Box sx={{ py: { xs: 6, md: 10 }, px: { xs: 3, md: 6 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <FormatQuoteIcon sx={{ fontSize: 32, color: 'primary.main', opacity: 0.3, mb: 1 }} />
            <Typography
              sx={{
                fontSize: { xs: '1.25rem', md: '1.75rem' },
                fontWeight: 700,
                color: 'text.primary',
              }}
            >
              {t('landing.testimonials.sectionTitle')}
            </Typography>
          </Box>

          <Box sx={{ position: 'relative', minHeight: 200 }}>
            {TESTIMONIALS.map((testimonial, index) => (
              <Box
                key={index}
                sx={{
                  position: index === activeTestimonial ? 'relative' : 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  opacity: index === activeTestimonial ? 1 : 0,
                  transition: 'opacity 500ms ease-in-out',
                  pointerEvents: index === activeTestimonial ? 'auto' : 'none',
                }}
              >
                <Box
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: '0.95rem', md: '1.1rem' },
                      lineHeight: 1.8,
                      color: 'text.primary',
                      fontStyle: 'italic',
                      mb: 3,
                    }}
                  >
                    {testimonial.quote}
                  </Typography>
                  <Avatar
                    sx={{
                      width: 44,
                      height: 44,
                      bgcolor: 'primary.main',
                      mx: 'auto',
                      mb: 1,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {testimonial.initials}
                  </Avatar>
                  <Typography sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.9rem' }}>
                    {testimonial.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {testimonial.role}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
            {TESTIMONIALS.map((_, index) => (
              <Box
                key={index}
                onClick={() => setActiveTestimonial(index)}
                sx={{
                  width: index === activeTestimonial ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: index === activeTestimonial ? 'primary.main' : 'divider',
                  transition: 'all 300ms ease',
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Container>
      </Box>

      {/* Pricing */}
      <Box sx={{ py: { xs: 6, md: 10 }, px: { xs: 3, md: 6 }, bgcolor: 'background.paper' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 }, maxWidth: 600, mx: 'auto' }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'primary.main',
                mb: 1,
              }}
            >
              {t('landing.pricing.label')}
            </Typography>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.5rem', md: '2rem' },
                color: 'text.primary',
                mb: 1.5,
              }}
            >
              {t('landing.pricing.title')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('landing.pricing.subtitle')}
            </Typography>
          </Box>

          <Grid container spacing={3} justifyContent="center" alignItems="stretch">
            {/* Starter */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  p: 3.5,
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 200ms ease-out',
                  '&:hover': { borderColor: 'primary.light', transform: 'translateY(-4px)' },
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'text.primary', mb: 1 }}>
                  {t('landing.pricing.starter.name')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                  {t('landing.pricing.starter.description')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '2.5rem', color: 'text.primary', lineHeight: 1 }}>
                    $49
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    / {t('landing.pricing.perMonth')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, mb: 3 }}>
                  {['upTo5Projects', 'equipmentTracking', 'basicInspections', 'emailSupport'].map((key) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                      <Typography variant="body2" color="text.primary">
                        {t(`landing.pricing.starter.features.${key}`)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Button variant="secondary" onClick={() => navigate('/login')} sx={{ width: '100%', py: 1.5, borderRadius: 2 }}>
                  {t('landing.pricing.getStarted')}
                </Button>
              </Box>
            </Grid>

            {/* Professional */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  p: 3.5,
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: (theme) => `0 12px 32px ${theme.palette.primary.main}1F`,
                  transition: 'all 200ms ease-out',
                  '&:hover': { transform: 'translateY(-4px)' },
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    px: 2.5,
                    py: 0.5,
                    borderRadius: 5,
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {t('landing.pricing.popular')}
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'text.primary', mb: 1 }}>
                  {t('landing.pricing.professional.name')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                  {t('landing.pricing.professional.description')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '2.5rem', color: 'text.primary', lineHeight: 1 }}>
                    $149
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                    / {t('landing.pricing.perMonth')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, mb: 3 }}>
                  {['unlimitedProjects', 'fullEquipmentMgmt', 'advancedInspections', 'approvalWorkflows', 'analyticsReports', 'prioritySupport'].map((key) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                      <Typography variant="body2" color="text.primary" fontWeight={500}>
                        {t(`landing.pricing.professional.features.${key}`)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Button variant="primary" onClick={() => navigate('/login')} sx={{ width: '100%', py: 1.5, borderRadius: 2 }}>
                  {t('landing.pricing.getStarted')}
                </Button>
              </Box>
            </Grid>

            {/* Enterprise */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  p: 3.5,
                  borderRadius: 3,
                  bgcolor: 'background.default',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 200ms ease-out',
                  '&:hover': { borderColor: 'primary.light', transform: 'translateY(-4px)' },
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: 'text.primary', mb: 1 }}>
                  {t('landing.pricing.enterprise.name')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                  {t('landing.pricing.enterprise.description')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '2.5rem', color: 'text.primary', lineHeight: 1 }}>
                    {t('landing.pricing.enterprise.price')}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, mb: 3 }}>
                  {['everythingInPro', 'ssoIntegration', 'dedicatedSupport', 'customIntegrations', 'slaGuarantee', 'onPremiseOption'].map((key) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main' }} />
                      <Typography variant="body2" color="text.primary">
                        {t(`landing.pricing.enterprise.features.${key}`)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                <Button variant="secondary" onClick={() => navigate('/login')} sx={{ width: '100%', py: 1.5, borderRadius: 2 }}>
                  {t('landing.pricing.contactSales')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Bottom CTA */}
      <Box
        sx={{
          background: 'linear-gradient(160deg, #85603a 0%, #c8956a 50%, #d4a67a 100%)',
          py: { xs: 6, md: 8 },
          px: { xs: 3, md: 6 },
          position: 'relative',
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontWeight: 700,
                color: 'white',
                mb: 2,
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              {t('landing.ctaTitle')}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', mb: 4, fontSize: '1rem', maxWidth: 480, mx: 'auto' }}>
              {t('landing.ctaSubtitle')}
            </Typography>
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: 5,
                py: 1.75,
                fontSize: '1rem',
                bgcolor: 'white',
                color: '#85603a',
                fontWeight: 700,
                borderRadius: 3,
                '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' },
              }}
              icon={<ArrowForwardIcon />}
              iconPosition="end"
            >
              {t('landing.getStarted')}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: 'background.paper', py: 4, px: { xs: 3, md: 6 }, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.5 }}>
              <ConstructionIcon sx={{ fontSize: 18, color: 'primary.main' }} />
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 800, color: 'text.primary' }}>
                BuilderOps
              </Typography>
            </Box>
            <Typography sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
              &copy; {new Date().getFullYear()} BuilderOps. {t('landing.allRightsReserved')}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
