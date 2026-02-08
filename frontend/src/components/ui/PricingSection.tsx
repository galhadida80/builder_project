import { Card as MuiCard, CardContent, Box, Typography, Grid, SxProps, Theme } from '@mui/material'
import { styled, alpha } from '@mui/material'
import { Button } from './Button'

interface PricingCardProps {
  tier: string
  price: string | number
  features: string[]
  buttonText: string
  onButtonClick?: () => void
  featured?: boolean
  description?: string
  sx?: SxProps<Theme>
}

const StyledPricingCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'featured',
})<{ featured?: boolean }>(({ theme, featured }) => ({
  borderRadius: 16,
  transition: 'all 200ms ease-out',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  ...(featured && {
    transform: 'scale(1.05)',
    boxShadow: `0 20px 40px ${alpha(theme.palette.primary.main, 0.3)}`,
    border: `2px solid ${theme.palette.primary.main}`,
  }),
  ...(!featured && {
    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
    boxShadow: theme.shadows[1],
  }),
  '&:hover': {
    boxShadow: featured ? `0 24px 48px ${alpha(theme.palette.primary.main, 0.4)}` : theme.shadows[4],
  },
}))

export function PricingCard({
  tier,
  price,
  features,
  buttonText,
  onButtonClick,
  featured = false,
  description,
  ...props
}: PricingCardProps) {
  return (
    <StyledPricingCard featured={featured} {...props}>
      <CardContent sx={{ p: 3, pb: 2, flexGrow: 1 }}>
        {featured && (
          <Box
            sx={{
              display: 'inline-block',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              mb: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'primary.main',
                fontWeight: 700,
                textTransform: 'uppercase',
                fontSize: '0.7rem',
              }}
            >
              Most Popular
            </Typography>
          </Box>
        )}

        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 1,
          }}
        >
          {tier}
        </Typography>

        {description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
            }}
          >
            {price}
          </Typography>
          {typeof price === 'number' && (
            <Typography variant="body2" color="text.secondary">
              per month
            </Typography>
          )}
        </Box>

        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: 'text.primary',
            mb: 1.5,
            mt: 2,
          }}
        >
          Features
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {features.map((feature, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box
                sx={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: '50%',
                  bgcolor: featured ? 'primary.main' : 'success.main',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mt: 0.25,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                ✓
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ pt: 0.25 }}>
                {feature}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>

      <Box sx={{ px: 3, pb: 3 }}>
        <Button
          fullWidth
          variant={featured ? 'primary' : 'secondary'}
          onClick={onButtonClick}
        >
          {buttonText}
        </Button>
      </Box>
    </StyledPricingCard>
  )
}

interface PricingSectionProps {
  spacing?: number
  sx?: SxProps<Theme>
}

const DEFAULT_PRICING_TIERS = [
  {
    tier: 'Starter',
    price: '$9',
    description: 'For individuals and small teams',
    features: [
      'Up to 5 projects',
      '1 GB storage',
      'Basic analytics',
      'Community support',
    ],
    buttonText: 'Get Started',
  },
  {
    tier: 'Professional',
    price: '$49',
    description: 'For growing teams',
    features: [
      'Unlimited projects',
      '100 GB storage',
      'Advanced analytics',
      'Priority support',
      'Custom integrations',
      'Team collaboration',
    ],
    buttonText: 'Start Free Trial',
    featured: true,
  },
  {
    tier: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Unlimited everything',
      'Unlimited storage',
      'Advanced analytics & reporting',
      '24/7 dedicated support',
      'Custom integrations',
      'Single sign-on (SSO)',
      'Custom contracts',
    ],
    buttonText: 'Contact Sales',
  },
]

export function PricingSection({ spacing = 3, sx }: PricingSectionProps) {
  return (
    <Box sx={sx}>
      <Grid container spacing={spacing}>
        {DEFAULT_PRICING_TIERS.map((tierData) => (
          <Grid item xs={12} sm={6} md={4} key={tierData.tier}>
            <PricingCard
              tier={tierData.tier}
              price={tierData.price}
              description={tierData.description}
              features={tierData.features}
              buttonText={tierData.buttonText}
              featured={tierData.featured}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
