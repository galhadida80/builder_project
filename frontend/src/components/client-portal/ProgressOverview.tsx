import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, Skeleton, LinearProgress, alpha } from '@/mui'
import { CheckCircleIcon, HourglassBottomIcon, PendingIcon, ConstructionIcon } from '@/icons'
import type { ProgressMetrics } from '@/api/clientPortal'

interface ProgressOverviewProps {
  progress: ProgressMetrics | null
  loading?: boolean
}

export function ProgressOverview({ progress, loading = false }: ProgressOverviewProps) {
  const { t } = useTranslation()

  if (loading || !progress) {
    return (
      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 2 }} />
        <Skeleton variant="rounded" height={12} sx={{ borderRadius: 5, mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Paper>
    )
  }

  const totalItems =
    progress.inspectionsTotal +
    progress.equipmentTotal +
    progress.materialsTotal +
    progress.checklistsTotal

  const completedItems = totalItems > 0 ? Math.round((progress.overallPercentage / 100) * totalItems) : 0
  const inProgressItems =
    progress.equipmentSubmitted +
    progress.materialsSubmitted +
    (progress.inspectionsTotal - progress.inspectionsCompleted > 0
      ? progress.inspectionsTotal - progress.inspectionsCompleted
      : 0)
  const pendingItems = Math.max(0, totalItems - completedItems - inProgressItems)

  return (
    <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 2.5,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.main, 0.08)})`,
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          <ConstructionIcon sx={{ fontSize: '1.4rem' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            {t('clientPortal.projectProgress')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.25 }}>
            {t('clientPortal.overallCompletion')}
          </Typography>
        </Box>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            fontSize: { xs: '2rem', sm: '2.5rem' },
            color: 'primary.main',
          }}
        >
          {Math.round(progress.overallPercentage)}%
        </Typography>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <LinearProgress
          variant="determinate"
          value={progress.overallPercentage}
          sx={{
            height: 12,
            borderRadius: 6,
            bgcolor: 'action.hover',
            '& .MuiLinearProgress-bar': {
              borderRadius: 6,
              background: (theme) =>
                `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
            },
          }}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: { xs: 1.5, sm: 2 },
          pt: 2.5,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <StatCell
          value={completedItems}
          label={t('clientPortal.completed')}
          icon={<CheckCircleIcon fontSize="small" />}
          color="success.main"
        />
        <StatCell
          value={inProgressItems}
          label={t('clientPortal.inProgress')}
          icon={<HourglassBottomIcon fontSize="small" />}
          color="info.main"
        />
        <StatCell
          value={pendingItems}
          label={t('clientPortal.pending')}
          icon={<PendingIcon fontSize="small" />}
          color="warning.main"
        />
      </Box>

      <Box
        sx={{
          mt: 2.5,
          pt: 2.5,
          borderTop: 1,
          borderColor: 'divider',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 1.5,
        }}
      >
        <MetricRow
          label={t('clientPortal.inspections')}
          value={`${progress.inspectionsCompleted}/${progress.inspectionsTotal}`}
        />
        <MetricRow
          label={t('clientPortal.equipment')}
          value={`${progress.equipmentSubmitted}/${progress.equipmentTotal}`}
        />
        <MetricRow
          label={t('clientPortal.materials')}
          value={`${progress.materialsSubmitted}/${progress.materialsTotal}`}
        />
        <MetricRow
          label={t('clientPortal.checklists')}
          value={`${progress.checklistsCompleted}/${progress.checklistsTotal}`}
        />
      </Box>
    </Paper>
  )
}

interface StatCellProps {
  value: number
  label: string
  icon: React.ReactNode
  color: string
}

function StatCell({ value, label, icon, color }: StatCellProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.75,
        p: { xs: 1.25, sm: 1.5 },
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.mode === 'dark' ? color : color, 0.08),
        border: 1,
        borderColor: (theme) => alpha(color, 0.2),
      }}
    >
      <Box sx={{ color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</Box>
      <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', sm: '1.75rem' }, color }}>
        {value}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontWeight: 600,
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          textAlign: 'center',
        }}
      >
        {label}
      </Typography>
    </Box>
  )
}

interface MetricRowProps {
  label: string
  value: string
}

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}
