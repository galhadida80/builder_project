import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import {
  ConstructionIcon, CheckCircleOutlineIcon, StarIcon,
} from '@/icons'
import { Box, Container, Typography, Grid, Card } from '@/mui'

export default function PricingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const PRICING_TIERS = [
    {
      name: t('landing.pricing.starter.name'),
      price: t('landing.pricing.starter.price'),
      description: t('landing.pricing.starter.description'),
      features: [
        t('landing.pricing.starter.features.upTo5Projects'),
        t('landing.pricing.starter.features.equipmentTracking'),
        t('landing.pricing.starter.features.basicInspections'),
        t('landing.pricing.starter.features.emailSupport'),
      ],
      cta: t('landing.pricing.starter.cta'),
      popular: false,
    },
    {
      name: t('landing.pricing.professional.name'),
      price: t('landing.pricing.professional.price'),
      description: t('landing.pricing.professional.description'),
      features: [
        t('landing.pricing.professional.features.unlimitedProjects'),
        t('landing.pricing.professional.features.fullEquipmentMgmt'),
        t('landing.pricing.professional.features.advancedInspections'),
        t('landing.pricing.professional.features.approvalWorkflows'),
        t('landing.pricing.professional.features.analyticsReports'),
        t('landing.pricing.professional.features.prioritySupport'),
      ],
      cta: t('landing.pricing.professional.cta'),
      popular: true,
    },
    {
      name: t('landing.pricing.enterprise.name'),
      price: t('landing.pricing.enterprise.price'),
      description: t('landing.pricing.enterprise.description'),
      features: [
        t('landing.pricing.enterprise.features.everythingInPro'),
        t('landing.pricing.enterprise.features.ssoIntegration'),
        t('landing.pricing.enterprise.features.dedicatedSupport'),
        t('landing.pricing.enterprise.features.customIntegrations'),
        t('landing.pricing.enterprise.features.slaGuarantee'),
        t('landing.pricing.enterprise.features.onPremiseOption'),
      ],
      cta: t('landing.pricing.enterprise.cta'),
      popular: false,
    },
  ]

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
            ? 'rgba(10,10,10,0.8)'
            : 'rgba(248,247,245,0.8)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid',
          borderColor: (theme) => `${theme.palette.primary.main}1A`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }} onClick={() => navigate('/')}>
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

      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background: (theme) => theme.palette.mode === 'dark'
            ? `linear-gradient(180deg, ${theme.palette.background.default}60 0%, ${theme.palette.background.default} 100%)`
            : `linear-gradient(160deg, #a85020 0%, #e07842 50%, #e89060 100%)`,
          color: 'white',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              sx={{
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                mb: 2,
                color: (theme) => theme.palette.mode === 'dark' ? 'text.primary' : 'white',
              }}
            >
              {t('landing.pricing.heroTitle')}
            </Typography>
            <Typography
              sx={{
                fontSize: { xs: '1rem', md: '1.125rem' },
                lineHeight: 1.7,
                opacity: 0.85,
                maxWidth: 600,
                mx: 'auto',
                color: (theme) => theme.palette.mode === 'dark' ? 'text.secondary' : 'rgba(255,255,255,0.85)',
              }}
            >
              {t('landing.pricing.heroSubtitle')}
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Pricing Cards */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 }, flex: 1 }}>
        <Grid container spacing={3}>
          {PRICING_TIERS.map((tier) => (
            <Grid item xs={12} md={4} key={tier.name}>
              <Card
                sx={{
                  position: 'relative',
                  p: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 3,
                  border: tier.popular ? '2px solid' : '1px solid',
                  borderColor: tier.popular ? 'primary.main' : 'divider',
                  bgcolor: 'background.paper',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: tier.popular ? 6 : 3,
                  },
                }}
              >
                {tier.popular && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                    }}
                  >
                    <StarIcon sx={{ fontSize: 14 }} />
                    {t('landing.pricing.popular')}
                  </Box>
                )}

                <Box sx={{ mb: 3 }}>
                  <Typography
                    sx={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      mb: 1,
                      color: 'text.primary',
                    }}
                  >
                    {tier.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.875rem',
                      color: 'text.secondary',
                      mb: 2,
                      minHeight: 40,
                    }}
                  >
                    {tier.description}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      color: 'text.primary',
                    }}
                  >
                    {tier.price}
                  </Typography>
                </Box>

                <Box sx={{ flex: 1, mb: 3 }}>
                  {tier.features.map((feature, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1,
                        mb: 1.5,
                      }}
                    >
                      <CheckCircleOutlineIcon
                        sx={{
                          fontSize: 20,
                          color: 'primary.main',
                          mt: 0.25,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          fontSize: '0.875rem',
                          color: 'text.secondary',
                          lineHeight: 1.6,
                        }}
                      >
                        {feature}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Button
                  variant={tier.popular ? 'primary' : 'secondary'}
                  fullWidth
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 700,
                  }}
                >
                  {tier.cta}
                </Button>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* FAQ or Additional Info */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography
            sx={{
              fontSize: '1.5rem',
              fontWeight: 700,
              mb: 2,
              color: 'text.primary',
            }}
          >
            {t('landing.pricing.questions')}
          </Typography>
          <Typography
            sx={{
              fontSize: '1rem',
              color: 'text.secondary',
              mb: 3,
            }}
          >
            {t('landing.pricing.contactUs')}
          </Typography>
          <Button
            variant="secondary"
            onClick={() => navigate('/login')}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
            }}
          >
            {t('landing.pricing.contactSales')}
          </Button>
        </Box>
      </Container>
    </Box>
  )
}
