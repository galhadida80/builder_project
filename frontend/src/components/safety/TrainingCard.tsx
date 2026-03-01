import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { TrainingStatusBadge } from './TrainingStatusBadge'
import { Box, Typography, Stack, useTheme } from '@/mui'
import { getDateLocale } from '../../utils/dateLocale'
import type { SafetyTraining, TrainingStatus } from '../../types/safety'

const TRAINING_BORDER_COLORS: Record<TrainingStatus, string> = {
  valid: '#22C55E',
  expiring_soon: '#EAB308',
  expired: '#DC2626',
}

interface TrainingCardProps {
  training: SafetyTraining
  onClick: () => void
}

export function TrainingCard({ training, onClick }: TrainingCardProps) {
  const { t } = useTranslation()
  const theme = useTheme()

  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        cursor: 'pointer',
        borderLeft: `4px solid ${TRAINING_BORDER_COLORS[training.status]}`,
        '&:hover': { boxShadow: theme.shadows[4] },
      }}
    >
      <Stack spacing={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="subtitle1" fontWeight={600}>
            {training.trainingType}
          </Typography>
          <TrainingStatusBadge status={training.status} expiryDate={training.expiryDate} />
        </Box>

        <Box>
          <Typography variant="body2" color="text.secondary">
            {t('safetyTraining.worker')}: {training.worker?.contactName || t('common.unknown')}
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t('safetyTraining.trainingDate')}
            </Typography>
            <Typography variant="body2">
              {new Date(training.trainingDate).toLocaleDateString(getDateLocale())}
            </Typography>
          </Box>
          {training.expiryDate && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                {t('safetyTraining.expiryDate')}
              </Typography>
              <Typography variant="body2">
                {new Date(training.expiryDate).toLocaleDateString(getDateLocale())}
              </Typography>
            </Box>
          )}
        </Box>

        {training.certificateNumber && (
          <Typography variant="caption" color="text.secondary">
            {t('safetyTraining.certificateNumber')}: {training.certificateNumber}
          </Typography>
        )}
      </Stack>
    </Card>
  )
}
