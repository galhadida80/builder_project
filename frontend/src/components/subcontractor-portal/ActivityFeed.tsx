import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, Skeleton, Chip, alpha } from '@/mui'
import {
  TimelineIcon,
  AssignmentIcon,
  HelpOutlineIcon,
  ApprovalIcon,
  DescriptionIcon,
  CheckCircleIcon,
  ErrorIcon,
  NotificationsIcon,
  InfoIcon,
} from '@/icons'
import type { TimelineEvent } from '@/api/clientPortal'
import { getDateLocale } from '@/utils/dateLocale'

interface ActivityFeedProps {
  activities: TimelineEvent[]
  loading?: boolean
}

export function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  const { t } = useTranslation()
  const dateLocale = getDateLocale()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
        <Skeleton variant="text" width={180} height={28} sx={{ mb: 3 }} />
        {[...Array(5)].map((_, i) => (
          <Box key={i} sx={{ mb: 2.5 }}>
            <Skeleton variant="rounded" height={90} sx={{ borderRadius: 2 }} />
          </Box>
        ))}
      </Paper>
    )
  }

  if (!activities || activities.length === 0) {
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
            {t('subcontractorPortal.noActivity')}
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
          {t('subcontractorPortal.activityFeed')}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative' }}>
        {activities.map((activity, index) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            isLast={index === activities.length - 1}
            formatDate={formatDate}
          />
        ))}
      </Box>
    </Paper>
  )
}

interface ActivityItemProps {
  activity: TimelineEvent
  isLast: boolean
  formatDate: (dateString: string) => string
}

function ActivityItem({ activity, isLast, formatDate }: ActivityItemProps) {
  const { t } = useTranslation()

  const getActivityConfig = () => {
    const eventType = activity.eventType.toLowerCase()

    if (eventType.includes('task')) {
      return {
        icon: <AssignmentIcon />,
        color: 'primary.main',
        bgColor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.15),
        label: t('subcontractorPortal.task'),
      }
    }
    if (eventType.includes('rfi') || eventType.includes('question')) {
      return {
        icon: <HelpOutlineIcon />,
        color: 'warning.main',
        bgColor: (theme: { palette: { warning: { main: string } } }) => alpha(theme.palette.warning.main, 0.15),
        label: t('subcontractorPortal.rfi'),
      }
    }
    if (eventType.includes('approval')) {
      return {
        icon: <ApprovalIcon />,
        color: 'secondary.main',
        bgColor: (theme: { palette: { secondary: { main: string } } }) => alpha(theme.palette.secondary.main, 0.15),
        label: t('subcontractorPortal.approval'),
      }
    }
    if (eventType.includes('document')) {
      return {
        icon: <DescriptionIcon />,
        color: 'info.main',
        bgColor: (theme: { palette: { info: { main: string } } }) => alpha(theme.palette.info.main, 0.15),
        label: t('subcontractorPortal.document'),
      }
    }
    if (eventType.includes('complete') || eventType.includes('approved')) {
      return {
        icon: <CheckCircleIcon />,
        color: 'success.main',
        bgColor: (theme: { palette: { success: { main: string } } }) => alpha(theme.palette.success.main, 0.15),
        label: t('subcontractorPortal.completed'),
      }
    }
    if (eventType.includes('error') || eventType.includes('reject')) {
      return {
        icon: <ErrorIcon />,
        color: 'error.main',
        bgColor: (theme: { palette: { error: { main: string } } }) => alpha(theme.palette.error.main, 0.15),
        label: t('subcontractorPortal.alert'),
      }
    }
    if (eventType.includes('notification')) {
      return {
        icon: <NotificationsIcon />,
        color: 'info.main',
        bgColor: (theme: { palette: { info: { main: string } } }) => alpha(theme.palette.info.main, 0.15),
        label: t('subcontractorPortal.notification'),
      }
    }

    return {
      icon: <InfoIcon />,
      color: 'text.secondary',
      bgColor: (theme: { palette: { action: { hover: string } } }) => theme.palette.action.hover,
      label: t('subcontractorPortal.update'),
    }
  }

  const activityConfig = getActivityConfig()

  return (
    <Box sx={{ display: 'flex', gap: 2, pb: isLast ? 0 : 3, position: 'relative' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: activityConfig.bgColor,
            color: activityConfig.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 2,
            borderColor: activityConfig.color,
            zIndex: 1,
            '& svg': { fontSize: '1.25rem' },
          }}
        >
          {activityConfig.icon}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, mb: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
            {activity.title}
          </Typography>
          <Chip
            label={activityConfig.label}
            size="small"
            sx={{
              bgcolor: activityConfig.bgColor,
              color: activityConfig.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 24,
              flexShrink: 0,
            }}
          />
        </Box>

        {activity.description && (
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.85rem', sm: '0.875rem' },
              mb: 1.5,
              lineHeight: 1.5,
            }}
          >
            {activity.description}
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
          <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
            {formatDate(activity.date)}
          </Typography>
          {activity.userName && (
            <>
              <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
                •
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
                {activity.userName}
              </Typography>
            </>
          )}
        </Box>
      </Box>
    </Box>
  )
}
