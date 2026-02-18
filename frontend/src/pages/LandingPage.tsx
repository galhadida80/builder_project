import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Hero } from '../components/Hero'
import { Button } from '../components/ui/Button'
import turnerLogo from '../assets/logos/turner.svg'
import bechtelLogo from '../assets/logos/bechtel.svg'
import fluorLogo from '../assets/logos/fluor.svg'
import kiewitLogo from '../assets/logos/kiewit.svg'
import skanskaLogo from '../assets/logos/skanska.svg'
import {
  ConstructionIcon, SpeedIcon, SecurityIcon, GroupsIcon,
  AssignmentTurnedInIcon, BarChartIcon, ArrowForwardIcon,
  PhoneIphoneIcon, FormatQuoteIcon, CheckCircleOutlineIcon,
} from '@/icons'
import { Box, Container, Typography, Grid, Avatar } from '@/mui'

const BENTO_LAYOUT = [
  { xs: 12, md: 8, minHeight: { xs: 180, md: 220 } },
  { xs: 12, md: 4, minHeight: { xs: 160, md: 220 } },
  { xs: 12, md: 4, minHeight: { xs: 160, md: 200 } },
  { xs: 12, md: 8, minHeight: { xs: 180, md: 200 } },
  { xs: 12, sm: 6, md: 4, minHeight: { xs: 160, md: 180 } },
  { xs: 12, sm: 6, md: 4, minHeight: { xs: 160, md: 180 } },
]

export default function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const FEATURES = [
    {
      icon: <SpeedIcon sx={{ fontSize: 28 }} />,
      title: t('landing.features.realTimeTracking'),
      description: t('landing.features.realTimeTrackingDesc'),
    },
    {
      icon: <ConstructionIcon sx={{ fontSize: 28 }} />,
      title: t('landing.features.equipmentManagement'),
      description: t('landing.features.equipmentManagementDesc'),
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 28 }} />,
      title: t('landing.features.inspectionSystem'),
      description: t('landing.features.inspectionSystemDesc'),
    },
    {
      icon: <GroupsIcon sx={{ fontSize: 28 }} />,
      title: t('landing.features.teamCollaboration'),
      description: t('landing.features.teamCollaborationDesc'),
    },
    {
      icon: <AssignmentTurnedInIcon sx={{ fontSize: 28 }} />,
      title: t('landing.features.approvalWorkflows'),
      description: t('landing.features.approvalWorkflowsDesc'),
    },
    {
      icon: <BarChartIcon sx={{ fontSize: 28 }} />,
      title: t('landing.features.analyticsReports'),
      description: t('landing.features.analyticsReportsDesc'),
    },
  ]

  const STATS = [
    { value: '500+', label: t('landing.stats.constructionTeams') },
    { value: '12K+', label: t('landing.stats.projectsManaged') },
    { value: '98%', label: t('landing.stats.onTimeDelivery') },
    { value: '3.2M', label: t('landing.stats.inspectionsCompleted') },
  ]

  const TESTIMONIALS = [
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
  ]

  const trustLogos = [
    { name: 'Turner Construction', imageUrl: turnerLogo, alt: 'Turner Construction logo' },
    { name: 'Bechtel', imageUrl: bechtelLogo, alt: 'Bechtel logo' },
    { name: 'Fluor', imageUrl: fluorLogo, alt: 'Fluor logo' },
    { name: 'Kiewit', imageUrl: kiewitLogo, alt: 'Kiewit logo' },
    { name: 'Skanska', imageUrl: skanskaLogo, alt: 'Skanska logo' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [TESTIMONIALS.length])

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Floating Nav */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          py: 2.5,
          px: { xs: 2, md: 4 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <ConstructionIcon sx={{ fontSize: 22 }} />
              </Box>
              <Typography
                sx={{ color: 'white', fontWeight: 700, fontSize: '1.125rem', letterSpacing: '-0.01em' }}
              >
                BuilderOps
              </Typography>
            </Box>
            <Button
              variant="secondary"
              onClick={() => navigate('/login')}
              sx={{
                borderColor: 'rgba(255,255,255,0.4)',
                color: 'white',
                px: 3,
                borderRadius: 2,
                backdropFilter: 'blur(4px)',
                bgcolor: 'rgba(255,255,255,0.08)',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.15)',
                },
              }}
            >
              {t('landing.signIn')}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Hero
        title={t('landing.heroTitle')}
        subtitle={t('landing.heroSubtitle')}
        ctaPrimaryText={t('landing.getStarted')}
        ctaPrimaryAction={() => navigate('/login')}
        ctaSecondaryText={t('landing.requestDemo')}
        ctaSecondaryAction={() => {}}
        trustLogos={trustLogos}
        showTrustLogos={true}
      />

      {/* Stats Section */}
      <Box sx={{ bgcolor: '#075985', py: { xs: 5, md: 6 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {STATS.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: { xs: '2rem', md: '2.5rem' },
                      fontWeight: 700,
                      color: 'white',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: { xs: '0.8rem', md: '0.875rem' },
                      color: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                      mt: 0.5,
                    }}
                  >
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Bento Grid Section */}
      <Box sx={{ bgcolor: 'background.default', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 }, maxWidth: 600, mx: 'auto' }}>
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'primary.main',
                mb: 1.5,
              }}
            >
              {t('landing.featuresLabel')}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                mb: 2,
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              {t('landing.featuresTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('landing.featuresSubtitle')}
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {FEATURES.map((feature, index) => {
              const layout = BENTO_LAYOUT[index]
              return (
                <Grid item xs={layout.xs} sm={layout.sm} md={layout.md} key={index}>
                  <Box
                    sx={{
                      p: 3.5,
                      borderRadius: 3,
                      bgcolor: 'background.paper',
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                      minHeight: layout.minHeight,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 200ms ease-out',
                      cursor: 'default',
                      '&:hover': {
                        borderColor: 'primary.light',
                        boxShadow: '0 8px 24px rgba(3, 105, 161, 0.08)',
                        transform: 'translateY(-4px)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: index === 0 ? 56 : 48,
                        height: index === 0 ? 56 : 48,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mb: 2.5,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        color: 'text.primary',
                        fontSize: index === 0 ? '1.15rem' : '1rem',
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, flex: 1 }}>
                      {feature.description}
                    </Typography>
                  </Box>
                </Grid>
              )
            })}
          </Grid>
        </Container>
      </Box>

      {/* Mobile App Preview Section */}
      <Box sx={{ bgcolor: '#F0F9FF', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'primary.main',
                  mb: 1.5,
                }}
              >
                Mobile
              </Typography>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'text.primary',
                  mb: 2,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                {t('landing.mobilePreview.title')}
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ lineHeight: 1.8, maxWidth: 480 }}
              >
                {t('landing.mobilePreview.subtitle')}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Box
                  sx={{
                    width: 260,
                    aspectRatio: '9/18',
                    borderRadius: '36px',
                    bgcolor: '#1E293B',
                    border: '4px solid #334155',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.15)',
                  }}
                >
                  {/* Notch */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 80,
                      height: 24,
                      borderRadius: '12px',
                      bgcolor: '#334155',
                      zIndex: 2,
                    }}
                  />
                  {/* Screen content */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 8,
                      borderRadius: '28px',
                      bgcolor: '#F8FAFC',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Status bar area */}
                    <Box sx={{ height: 32, bgcolor: '#0369A1' }} />
                    {/* App header */}
                    <Box
                      sx={{
                        bgcolor: '#0369A1',
                        px: 2,
                        py: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <ConstructionIcon sx={{ fontSize: 16, color: 'white' }} />
                      <Typography sx={{ color: 'white', fontSize: '0.7rem', fontWeight: 600 }}>
                        BuilderOps
                      </Typography>
                    </Box>
                    {/* Mock content */}
                    <Box sx={{ p: 1.5, flex: 1 }}>
                      <Box
                        sx={{
                          bgcolor: 'white',
                          borderRadius: 1.5,
                          p: 1.5,
                          mb: 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                      >
                        <Box sx={{ width: '70%', height: 8, bgcolor: '#E2E8F0', borderRadius: 1, mb: 0.8 }} />
                        <Box sx={{ width: '50%', height: 6, bgcolor: '#F1F5F9', borderRadius: 1 }} />
                      </Box>
                      <Box
                        sx={{
                          bgcolor: 'white',
                          borderRadius: 1.5,
                          p: 1.5,
                          mb: 1,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                      >
                        <Box sx={{ width: '80%', height: 8, bgcolor: '#E2E8F0', borderRadius: 1, mb: 0.8 }} />
                        <Box sx={{ width: '40%', height: 6, bgcolor: '#F1F5F9', borderRadius: 1 }} />
                      </Box>
                      <Box
                        sx={{
                          bgcolor: 'white',
                          borderRadius: 1.5,
                          p: 1.5,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        }}
                      >
                        <Box sx={{ width: '60%', height: 8, bgcolor: '#E2E8F0', borderRadius: 1, mb: 0.8 }} />
                        <Box sx={{ width: '45%', height: 6, bgcolor: '#F1F5F9', borderRadius: 1 }} />
                      </Box>
                    </Box>
                    {/* Bottom nav */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-around',
                        py: 1,
                        borderTop: '1px solid #E2E8F0',
                        bgcolor: 'white',
                      }}
                    >
                      {[1, 2, 3, 4].map((i) => (
                        <Box
                          key={i}
                          sx={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            bgcolor: i === 1 ? '#0369A1' : '#CBD5E1',
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box sx={{ bgcolor: 'background.default', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
            <FormatQuoteIcon sx={{ fontSize: 40, color: 'primary.main', opacity: 0.3, mb: 1 }} />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              {t('landing.testimonials.sectionTitle')}
            </Typography>
          </Box>

          <Box sx={{ position: 'relative', minHeight: 240 }}>
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
                    p: { xs: 3, md: 5 },
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    textAlign: 'center',
                    position: 'relative',
                    '&::before': {
                      content: '"\u201C"',
                      position: 'absolute',
                      top: { xs: 8, md: 16 },
                      left: { xs: 16, md: 32 },
                      fontSize: { xs: '3rem', md: '4rem' },
                      color: 'primary.main',
                      opacity: 0.15,
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1,
                    },
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontSize: { xs: '1rem', md: '1.15rem' },
                      lineHeight: 1.8,
                      color: 'text.primary',
                      fontStyle: 'italic',
                      mb: 3,
                      maxWidth: 560,
                      mx: 'auto',
                    }}
                  >
                    {testimonial.quote}
                  </Typography>
                  <Avatar
                    sx={{
                      width: 48,
                      height: 48,
                      bgcolor: 'primary.main',
                      mx: 'auto',
                      mb: 1.5,
                      fontSize: '1rem',
                      fontWeight: 600,
                    }}
                  >
                    {testimonial.initials}
                  </Avatar>
                  <Typography
                    sx={{ fontWeight: 600, color: 'text.primary', fontSize: '0.95rem' }}
                  >
                    {testimonial.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {testimonial.role}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          {/* Dots indicator */}
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

      {/* Pricing Section */}
      <Box sx={{ bgcolor: '#F0F9FF', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 }, maxWidth: 600, mx: 'auto' }}>
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'primary.main',
                mb: 1.5,
              }}
            >
              {t('landing.pricing.label')}
            </Typography>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: 'text.primary',
                mb: 2,
                fontSize: { xs: '1.5rem', md: '2rem' },
              }}
            >
              {t('landing.pricing.title')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('landing.pricing.subtitle')}
            </Typography>
          </Box>

          <Grid container spacing={3} justifyContent="center" alignItems="stretch">
            {/* Starter */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 200ms ease-out',
                  '&:hover': { borderColor: 'primary.light', boxShadow: '0 8px 24px rgba(3, 105, 161, 0.08)', transform: 'translateY(-4px)' },
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
                <Button
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  sx={{ width: '100%', py: 1.5, borderRadius: 2 }}
                >
                  {t('landing.pricing.getStarted')}
                </Button>
              </Box>
            </Grid>

            {/* Professional (highlighted) */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: '0 12px 32px rgba(3, 105, 161, 0.12)',
                  transition: 'all 200ms ease-out',
                  '&:hover': { boxShadow: '0 16px 40px rgba(3, 105, 161, 0.18)', transform: 'translateY(-4px)' },
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: -14,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    bgcolor: 'primary.main',
                    color: 'white',
                    px: 2.5,
                    py: 0.5,
                    borderRadius: 5,
                    fontSize: '0.75rem',
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
                <Button
                  variant="primary"
                  onClick={() => navigate('/login')}
                  sx={{ width: '100%', py: 1.5, borderRadius: 2 }}
                >
                  {t('landing.pricing.getStarted')}
                </Button>
              </Box>
            </Grid>

            {/* Enterprise */}
            <Grid item xs={12} sm={6} md={4}>
              <Box
                sx={{
                  p: 4,
                  borderRadius: 3,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 200ms ease-out',
                  '&:hover': { borderColor: 'primary.light', boxShadow: '0 8px 24px rgba(3, 105, 161, 0.08)', transform: 'translateY(-4px)' },
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
                <Button
                  variant="secondary"
                  onClick={() => navigate('/login')}
                  sx={{ width: '100%', py: 1.5, borderRadius: 2 }}
                >
                  {t('landing.pricing.contactSales')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Bottom CTA Section */}
      <Box
        sx={{
          background: 'linear-gradient(160deg, #075985 0%, #0369A1 50%, #0284C7 100%)',
          py: { xs: 8, md: 10 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />
        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: 'white',
                mb: 2,
                letterSpacing: '-0.02em',
                fontSize: { xs: '1.5rem', md: '2.25rem' },
              }}
            >
              {t('landing.ctaTitle')}
            </Typography>
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.8)',
                mb: 4,
                fontSize: { xs: '0.95rem', md: '1.1rem' },
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              {t('landing.ctaSubtitle')}
            </Typography>
            <Button
              variant="primary"
              size="large"
              onClick={() => navigate('/login')}
              sx={{
                px: 5,
                py: 1.75,
                fontSize: '1.05rem',
                bgcolor: 'white',
                color: '#0369A1',
                fontWeight: 700,
                borderRadius: 2.5,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.92)',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                },
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
      <Box sx={{ bgcolor: '#0F172A', py: 4 }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ConstructionIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
                BuilderOps
              </Typography>
            </Box>
            <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' }}>
              &copy; {new Date().getFullYear()} BuilderOps. {t('landing.allRightsReserved')}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  )
}
