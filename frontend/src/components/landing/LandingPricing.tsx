import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useInView } from '@/hooks/useInView'
import { Button } from '@/components/ui/Button'
import { CheckCircleOutlineIcon } from '@/icons'
import { Box, Container, Typography } from '@/mui'

const PLANS = [
  {
    nameKey: 'starter',
    price: '$49',
    features: ['upTo5Projects', 'equipmentTracking', 'basicInspections', 'emailSupport'],
    highlighted: false,
    btnVariant: 'secondary' as const,
    btnKey: 'getStarted',
    checkColor: '#16a34a',
  },
  {
    nameKey: 'professional',
    price: '$149',
    features: ['unlimitedProjects', 'fullEquipmentMgmt', 'advancedInspections', 'approvalWorkflows', 'analyticsReports', 'prioritySupport'],
    highlighted: true,
    btnVariant: 'primary' as const,
    btnKey: 'getStarted',
    checkColor: '#C75B20',
  },
  {
    nameKey: 'enterprise',
    priceKey: 'enterprise.price',
    features: ['everythingInPro', 'ssoIntegration', 'dedicatedSupport', 'customIntegrations', 'slaGuarantee', 'onPremiseOption'],
    highlighted: false,
    btnVariant: 'secondary' as const,
    btnKey: 'contactSales',
    checkColor: '#16a34a',
  },
]

export default function LandingPricing() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { ref, isVisible } = useInView(0.1)

  return (
    <Box id="pricing" ref={ref} sx={{ py: { xs: 8, md: 12 }, px: { xs: 2, md: 6 }, bgcolor: 'background.paper' }}>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: { xs: 5, md: 8 }, maxWidth: 600, mx: 'auto' }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'primary.main', mb: 1.5 }}>
            {t('landing.pricing.label')}
          </Typography>
          <Typography component="h2" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' }, fontWeight: 800, color: 'text.primary', mb: 2, lineHeight: 1.2 }}>
            {t('landing.pricing.title')}
          </Typography>
          <Typography sx={{ fontSize: '1rem', color: 'text.secondary' }}>
            {t('landing.pricing.subtitle')}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: { xs: 2.5, md: 3 }, alignItems: 'stretch' }}>
          {PLANS.map((plan, index) => (
            <Box
              key={plan.nameKey}
              sx={{
                p: { xs: 3, md: 4 },
                borderRadius: 4,
                bgcolor: 'background.default',
                border: plan.highlighted ? '2px solid' : '1px solid',
                borderColor: plan.highlighted ? 'primary.main' : 'divider',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: plan.highlighted ? (th) => `0 16px 48px ${th.palette.primary.main}1A` : 'none',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: 'all 400ms ease',
                transitionDelay: `${index * 100}ms`,
                '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 40px rgba(0,0,0,0.08)' },
              }}
            >
              {plan.highlighted && (
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
              )}

              <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: 'text.primary', mb: 0.75 }}>
                {t(`landing.pricing.${plan.nameKey}.name`)}
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 3, minHeight: 40 }}>
                {t(`landing.pricing.${plan.nameKey}.description`)}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                <Typography sx={{ fontWeight: 800, fontSize: '2.5rem', color: 'text.primary', lineHeight: 1 }}>
                  {plan.priceKey ? t(`landing.pricing.${plan.priceKey}`) : plan.price}
                </Typography>
                {!plan.priceKey && (
                  <Typography sx={{ fontSize: '0.875rem', color: 'text.secondary', mr: 0.5 }}>
                    / {t('landing.pricing.perMonth')}
                  </Typography>
                )}
              </Box>

              <Box sx={{ flex: 1, mb: 3 }}>
                {plan.features.map((featureKey) => (
                  <Box key={featureKey} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 18, color: plan.checkColor }} />
                    <Typography sx={{ fontSize: '0.875rem', color: 'text.primary', fontWeight: plan.highlighted ? 500 : 400 }}>
                      {t(`landing.pricing.${plan.nameKey}.features.${featureKey}`)}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Button
                variant={plan.btnVariant}
                onClick={() => navigate('/login')}
                sx={{ width: '100%', py: 1.5, borderRadius: 2.5, fontWeight: 700 }}
              >
                {t(`landing.pricing.${plan.btnKey}`)}
              </Button>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  )
}
