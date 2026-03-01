import { useTranslation } from 'react-i18next'
import {
  Box,
  Typography,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@/mui'
import { CheckCircleIcon, StarIcon } from '@/icons'
import { MarketplaceTemplateDetail } from '../../../api/marketplace'

interface OverviewTabProps {
  template: MarketplaceTemplateDetail
  isHebrew: boolean
}

export function OverviewTab({ template, isHebrew }: OverviewTabProps) {
  const { t } = useTranslation()

  const templateName = isHebrew
    ? template.nameHe || template.name
    : template.name
  const templateDescription = isHebrew
    ? template.descriptionHe || template.description
    : template.description

  const averageRating = template?.listing?.averageRating ?? 0
  const reviewCount = template?.listing?.reviewCount ?? 0
  const installCount = template?.listing?.installCount ?? 0

  return (
    <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {template.isOfficial && (
          <Chip
            icon={<CheckCircleIcon />}
            label={t('marketplace.official', 'Official')}
            size="small"
            color="primary"
          />
        )}
        {template.listing?.featured && (
          <Chip
            label={t('marketplace.featured', 'Featured')}
            size="small"
            color="secondary"
          />
        )}
        <Chip
          label={t(`marketplace.templateTypes.${template.templateType}`)}
          size="small"
        />
        {template.tier === 'premium' ? (
          <Chip
            label={template.price ? `₪${template.price}` : t('marketplace.premium', 'Premium')}
            size="small"
            color="warning"
          />
        ) : (
          <Chip label={t('marketplace.free', 'Free')} size="small" color="success" />
        )}
      </Box>

      {templateDescription && (
        <Typography variant="body1" sx={{ mb: 3 }}>
          {templateDescription}
        </Typography>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <StarIcon sx={{ color: 'warning.main' }} />
          <Typography variant="h6" fontWeight={600}>
            {averageRating > 0 ? averageRating.toFixed(1) : t('marketplace.noRating', 'No ratings yet')}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {t('marketplace.installCount', { count: installCount })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('marketplace.version', { version: template.version })}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        {t('marketplace.details', 'Details')}
      </Typography>
      <List dense>
        {template.category && (
          <ListItem>
            <ListItemText
              primary={t('marketplace.category', 'Category')}
              secondary={template.category}
            />
          </ListItem>
        )}
        {template.trade && (
          <ListItem>
            <ListItemText
              primary={t('marketplace.trade', 'Trade')}
              secondary={template.trade}
            />
          </ListItem>
        )}
        {template.buildingType && (
          <ListItem>
            <ListItemText
              primary={t('marketplace.buildingType', 'Building Type')}
              secondary={template.buildingType}
            />
          </ListItem>
        )}
        {template.regulatoryStandard && (
          <ListItem>
            <ListItemText
              primary={t('marketplace.regulatoryStandard', 'Regulatory Standard')}
              secondary={template.regulatoryStandard}
            />
          </ListItem>
        )}
        {template.createdBy && (
          <ListItem>
            <ListItemText
              primary={t('marketplace.createdBy', 'Created By')}
              secondary={template.createdBy.fullName}
            />
          </ListItem>
        )}
      </List>
    </Box>
  )
}
