import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, Skeleton, Chip, alpha } from '@/mui'
import {
  TimelineIcon,
  CheckCircleIcon,
  HourglassBottomIcon,
  WarningAmberIcon,
  CalendarTodayIcon,
} from '@/icons'
import type { ClientPortalMilestone } from '@/api/clientPortal'
import { getDateLocale } from '@/utils/dateLocale'

interface MilestoneTimelineProps {
  milestones: ClientPortalMilestone[]
  loading?: boolean
}

export function MilestoneTimeline({ milestones, loading = false }: MilestoneTimelineProps) {
  const { t } = useTranslation()
  const dateLocale = getDateLocale()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (loading) {
    return (
      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 3 }} />
        {[...Array(3)].map((_, i) => (
          <Box key={i} sx={{ mb: 2.5 }}>
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
          </Box>
        ))}
      </Paper>
    )
  }

  if (!milestones || milestones.length === 0) {
    return (
      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 }, textAlign: 'center' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            py: 3,
            color: 'text.secondary',
          }}
        >
          <TimelineIcon sx={{ fontSize: '3rem', opacity: 0.3 }} />
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {t('clientPortal.noMilestones')}
          </Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: 2.5,
            background: (theme) =>
              `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.2)}, ${alpha(theme.palette.info.main, 0.08)})`,
            color: 'info.main',
            flexShrink: 0,
          }}
        >
          <TimelineIcon sx={{ fontSize: '1.3rem' }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
          {t('clientPortal.milestones')}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative' }}>
        {milestones.map((milestone, index) => (
          <MilestoneItem
            key={milestone.id}
            milestone={milestone}
            isLast={index === milestones.length - 1}
            formatDate={formatDate}
          />
        ))}
      </Box>
    </Paper>
  )
}

interface MilestoneItemProps {
  milestone: ClientPortalMilestone
  isLast: boolean
  formatDate: (dateString: string) => string
}

function MilestoneItem({ milestone, isLast, formatDate }: MilestoneItemProps) {
  const { t } = useTranslation()

  const getStatusConfig = () => {
    if (milestone.completedAt) {
      return {
        icon: <CheckCircleIcon />,
        color: 'success.main',
        bgColor: (theme: { palette: { success: { main: string } } }) => alpha(theme.palette.success.main, 0.15),
        label: t('clientPortal.completed'),
      }
    }
    if (milestone.isOverdue) {
      return {
        icon: <WarningAmberIcon />,
        color: 'error.main',
        bgColor: (theme: { palette: { error: { main: string } } }) => alpha(theme.palette.error.main, 0.15),
        label: t('clientPortal.overdue'),
      }
    }
    return {
      icon: <HourglassBottomIcon />,
      color: 'info.main',
      bgColor: (theme: { palette: { info: { main: string } } }) => alpha(theme.palette.info.main, 0.15),
      label: t('clientPortal.inProgress'),
    }
  }

  const statusConfig = getStatusConfig()

  return (
    <Box sx={{ display: 'flex', gap: 2, pb: isLast ? 0 : 3, position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: statusConfig.bgColor,
            color: statusConfig.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 2,
            borderColor: statusConfig.color,
            zIndex: 1,
            '& svg': { fontSize: '1.25rem' },
          }}
        >
          {statusConfig.icon}
        </Box>
        {!isLast && (
          <Box
            sx={{
              width: 2,
              flex: 1,
              bgcolor: 'divider',
              mt: 1,
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          p: { xs: 1.5, sm: 2 },
          borderRadius: 2,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
            {milestone.title}
          </Typography>
          <Chip
            label={statusConfig.label}
            size="small"
            sx={{
              bgcolor: statusConfig.bgColor,
              color: statusConfig.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
            }}
          />
        </Box>

        {milestone.description && (
          <Typography
            variant="body2"
            sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 1.5, lineHeight: 1.5 }}
          >
            {milestone.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 1.5 }}>
          {(milestone.targetDate || milestone.completedAt) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CalendarTodayIcon sx={{ fontSize: '0.9rem', color: 'text.secondary' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                {milestone.completedAt
                  ? `${t('clientPortal.completed')}: ${formatDate(milestone.completedAt)}`
                  : milestone.targetDate
                    ? `${t('clientPortal.target')}: ${formatDate(milestone.targetDate)}`
                    : ''}
              </Typography>
            </Box>
          )}
        </Box>

        {milestone.completionPercentage !== undefined && milestone.completionPercentage < 100 && (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
                {t('clientPortal.progress')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.primary', fontSize: '0.75rem', fontWeight: 700 }}>
                {Math.round(milestone.completionPercentage)}%
              </Typography>
            </Box>
            <Box
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: 'background.paper',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${milestone.completionPercentage}%`,
                  height: '100%',
                  bgcolor: statusConfig.color,
                  borderRadius: 3,
                  transition: 'width 0.3s',
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}
