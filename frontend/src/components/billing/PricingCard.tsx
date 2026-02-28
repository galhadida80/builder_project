import { Box, Typography, Button, Divider, List, ListItem, ListItemIcon, ListItemText, Chip, alpha } from '@/mui'
import type { SxProps, Theme } from '@/mui'
import { CheckCircleIcon, StarIcon } from '@/icons'
import type { BillingCycle, PlanTier } from '@/types/subscription'

interface PricingCardProps {
  tier: PlanTier
  name: string
  description?: string
  monthlyPrice: number
  annualPrice: number
  billingCycle: BillingCycle
  features: string[]
  maxUsers?: number
  maxProjects?: number
  maxStorageGb?: number
  highlighted?: boolean
  currentPlan?: boolean
  ctaText: string
  ctaDisabled?: boolean
  onCtaClick: () => void
  loading?: boolean
  sx?: SxProps<Theme>
}

export function PricingCard({
  tier,
  name,
  description,
  monthlyPrice,
  annualPrice,
  billingCycle,
  features,
  maxUsers,
  maxProjects,
  maxStorageGb,
  highlighted = false,
  currentPlan = false,
  ctaText,
  ctaDisabled = false,
  onCtaClick,
  loading = false,
  sx,
}: PricingCardProps) {
  const price = billingCycle === 'monthly' ? monthlyPrice : annualPrice
  const monthlyEquivalent = billingCycle === 'annual' ? annualPrice / 12 : monthlyPrice

  const getTierColor = (): 'primary' | 'success' | 'warning' => {
    if (tier === 'starter') return 'primary'
    if (tier === 'professional') return 'success'
    return 'warning'
  }

  const color = getTierColor()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!ctaDisabled && !loading) {
        onCtaClick()
      }
    }
  }

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 3,
        border: 2,
        borderColor: highlighted ? `${color}.main` : 'divider',
        p: { xs: 2, sm: 2.5, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        transition: 'border-color 200ms, transform 200ms, box-shadow 200ms',
        ...(highlighted && {
          boxShadow: (theme) => `0 4px 20px ${alpha(theme.palette[color].main, 0.25)}`,
        }),
        '&:hover': {
          borderColor: `${color}.main`,
          transform: 'translateY(-2px)',
          boxShadow: (theme) => `0 6px 24px ${alpha(theme.palette[color].main, 0.3)}`,
        },
        ...sx as Record<string, unknown>,
      }}
    >
      {highlighted && (
        <Box
          sx={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1,
          }}
        >
          <Chip
            icon={<StarIcon sx={{ fontSize: '1rem' }} />}
            label="מומלץ"
            color={color}
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>
      )}

      {currentPlan && (
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 12, sm: 16 },
            right: { xs: 12, sm: 16 },
          }}
        >
          <Chip
            label="התוכנית הנוכחית"
            color="success"
            size="small"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            color: `${color}.main`,
            mb: 0.5,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
          }}
        >
          {name}
        </Typography>
        {description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.813rem', sm: '0.875rem' },
            }}
          >
            {description}
          </Typography>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              lineHeight: 1,
            }}
          >
            ₪{Math.round(monthlyEquivalent).toLocaleString('he-IL')}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              fontSize: { xs: '0.813rem', sm: '0.875rem' },
            }}
          >
            / חודש
          </Typography>
        </Box>
        {billingCycle === 'annual' && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              display: 'block',
              mt: 0.5,
              fontSize: { xs: '0.688rem', sm: '0.75rem' },
            }}
          >
            ₪{annualPrice.toLocaleString('he-IL')} חיוב שנתי
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 2 }} />

      <List
        sx={{
          mb: 2,
          flex: 1,
          p: 0,
        }}
      >
        {features.map((feature, index) => (
          <ListItem
            key={index}
            sx={{
              px: 0,
              py: { xs: 0.5, sm: 0.75 },
              alignItems: 'flex-start',
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 28, sm: 32 }, mt: 0.25 }}>
              <CheckCircleIcon
                sx={{
                  fontSize: { xs: '1rem', sm: '1.125rem' },
                  color: `${color}.main`,
                }}
              />
            </ListItemIcon>
            <ListItemText
              primary={feature}
              primaryTypographyProps={{
                variant: 'body2',
                sx: {
                  fontSize: { xs: '0.813rem', sm: '0.875rem' },
                  color: 'text.primary',
                  fontWeight: 500,
                },
              }}
            />
          </ListItem>
        ))}
      </List>

      {(maxUsers || maxProjects || maxStorageGb) && (
        <>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 600,
                display: 'block',
                mb: 1,
                fontSize: { xs: '0.688rem', sm: '0.75rem' },
              }}
            >
              מגבלות:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {maxUsers && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: { xs: '0.688rem', sm: '0.75rem' },
                  }}
                >
                  עד {maxUsers} משתמשים
                </Typography>
              )}
              {maxProjects && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: { xs: '0.688rem', sm: '0.75rem' },
                  }}
                >
                  עד {maxProjects} פרויקטים
                </Typography>
              )}
              {maxStorageGb && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.secondary',
                    fontSize: { xs: '0.688rem', sm: '0.75rem' },
                  }}
                >
                  עד {maxStorageGb}GB אחסון
                </Typography>
              )}
            </Box>
          </Box>
        </>
      )}

      <Button
        variant={highlighted ? 'contained' : 'outlined'}
        color={color}
        size="large"
        fullWidth
        disabled={ctaDisabled || loading}
        onClick={onCtaClick}
        onKeyDown={handleKeyDown}
        sx={{
          py: { xs: 1, sm: 1.25 },
          fontWeight: 700,
          fontSize: { xs: '0.875rem', sm: '0.938rem' },
          borderWidth: 2,
          '&:hover': {
            borderWidth: 2,
          },
        }}
      >
        {loading ? 'טוען...' : ctaText}
      </Button>
    </Box>
  )
}
