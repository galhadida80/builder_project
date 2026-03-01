import { useTranslation } from 'react-i18next'
import { Card as MuiCard, CardContent, CardHeader, Box, Typography, Chip, styled } from '@/mui'
import { StarIcon, CheckCircleIcon } from '@/icons'
import { MarketplaceTemplateWithListing } from '../../api/marketplace'

interface TemplateCardProps {
  template: MarketplaceTemplateWithListing
  onClick?: () => void
}

const StyledCard = styled(MuiCard)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}))

const RatingBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
}))

const BadgeContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  flexWrap: 'wrap',
  marginTop: theme.spacing(1),
}))

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const { t, i18n } = useTranslation()
  const isHebrew = i18n.language === 'he'

  const templateName = isHebrew ? (template.nameHe || template.name) : template.name
  const templateDescription = isHebrew ? (template.descriptionHe || template.description) : template.description
  const listing = template.listing

  const averageRating = listing?.averageRating ?? 0
  const reviewCount = listing?.reviewCount ?? 0
  const installCount = listing?.installCount ?? 0

  const getTemplateTypeColor = (type: string): 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
    switch (type) {
      case 'inspection':
        return 'primary'
      case 'checklist':
        return 'success'
      case 'safety_form':
        return 'warning'
      case 'quality_control':
        return 'info'
      case 'environmental':
        return 'success'
      case 'regulatory':
        return 'secondary'
      default:
        return 'primary'
    }
  }

  return (
    <StyledCard onClick={onClick}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
              {templateName}
            </Typography>
            {template.isOfficial && (
              <Chip
                icon={<CheckCircleIcon />}
                label={t('marketplace.official')}
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
            {listing?.featured && (
              <Chip
                label={t('marketplace.featured')}
                size="small"
                color="secondary"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Box>
        }
        subheader={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={t(`marketplace.templateTypes.${template.templateType}`)}
              size="small"
              color={getTemplateTypeColor(template.templateType)}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
            {averageRating > 0 && (
              <RatingBox>
                <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {averageRating.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({reviewCount})
                </Typography>
              </RatingBox>
            )}
            <Typography variant="body2" color="text.secondary">
              {t('marketplace.installCount', { count: installCount })}
            </Typography>
          </Box>
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {templateDescription && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {templateDescription}
          </Typography>
        )}
        <BadgeContainer>
          {template.category && (
            <Chip
              label={template.category}
              size="small"
              variant="outlined"
              sx={{ height: 24, fontSize: '0.7rem' }}
            />
          )}
          {template.trade && (
            <Chip
              label={template.trade}
              size="small"
              variant="outlined"
              sx={{ height: 24, fontSize: '0.7rem' }}
            />
          )}
          {template.buildingType && (
            <Chip
              label={template.buildingType}
              size="small"
              variant="outlined"
              sx={{ height: 24, fontSize: '0.7rem' }}
            />
          )}
          {template.tier === 'premium' ? (
            <Chip
              label={template.price ? `₪${template.price}` : t('marketplace.premium')}
              size="small"
              color="warning"
              sx={{ height: 24, fontSize: '0.7rem' }}
            />
          ) : (
            <Chip
              label={t('marketplace.free')}
              size="small"
              color="success"
              sx={{ height: 24, fontSize: '0.7rem' }}
            />
          )}
        </BadgeContainer>
      </CardContent>
    </StyledCard>
  )
}
