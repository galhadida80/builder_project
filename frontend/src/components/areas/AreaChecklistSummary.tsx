import { useTranslation } from 'react-i18next'
import type { AreaChecklistSummary as AreaChecklistSummaryType } from '../../types'
import { Card } from '../ui/Card'
import { Box, Typography, LinearProgress, Skeleton } from '@/mui'
import { CheckCircleIcon, AssignmentIcon } from '@/icons'

interface AreaChecklistSummaryProps {
  summary: AreaChecklistSummaryType | null
  loading: boolean
}

export function AreaChecklistSummaryCard({ summary, loading }: AreaChecklistSummaryProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width={160} height={24} sx={{ mb: 1 }} />
          <Skeleton variant="rounded" height={8} sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={80} height={20} />
          </Box>
        </Box>
      </Card>
    )
  }

  if (!summary) return null

  const percentage = summary.completionPercentage

  return (
    <Card sx={{ mb: 2 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
          {t('areaChecklists.checklistSummary')}
        </Typography>

        <Box sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {t('areaChecklists.completionRate')}
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {percentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                bgcolor: percentage === 100 ? 'success.main' : 'primary.main',
              },
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 }, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <AssignmentIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="caption" color="text.secondary">
              {t('areaChecklists.totalInstances')}:
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {summary.totalInstances}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
            <Typography variant="caption" color="text.secondary">
              {t('areaChecklists.completedInstances')}:
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {summary.completedInstances}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Card>
  )
}
