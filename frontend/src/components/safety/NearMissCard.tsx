import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { formatRelativeTime } from '../../utils/safetyHelpers'
import type { NearMiss, NearMissSeverity } from '../../types/safety'
import { Box, Typography, Chip, Stack, useTheme } from '@/mui'

const SEVERITY_BORDER_COLORS: Record<NearMissSeverity, string> = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#DC2626',
}

interface NearMissCardProps {
  nearMiss: NearMiss
  onClick: () => void
}

export default function NearMissCard({ nearMiss, onClick }: NearMissCardProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        borderLeft: `4px solid ${SEVERITY_BORDER_COLORS[nearMiss.severity]}`,
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      <Stack spacing={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1, pr: 1 }}>
            {nearMiss.title || t('nearMisses.untitled')}
          </Typography>
          <Chip
            label={t(`nearMisses.severity_${nearMiss.severity}`)}
            size="small"
            sx={{
              bgcolor: `${SEVERITY_BORDER_COLORS[nearMiss.severity]}22`,
              color: SEVERITY_BORDER_COLORS[nearMiss.severity],
              fontWeight: 600,
            }}
          />
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {nearMiss.description}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {formatRelativeTime(nearMiss.occurredAt, t)}
          </Typography>
          {nearMiss.isAnonymous && (
            <Chip label={t('nearMisses.anonymous')} size="small" variant="outlined" />
          )}
        </Box>
      </Stack>
    </Card>
  )
}
