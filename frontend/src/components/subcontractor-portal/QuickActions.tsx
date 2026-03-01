import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, alpha } from '@/mui'
import {
  AssignmentIcon,
  HelpOutlineIcon,
  ApprovalIcon,
  TimelineIcon,
  ArrowForwardIcon,
} from '@/icons'

interface QuickAction {
  id: string
  titleKey: string
  descriptionKey: string
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'info' | 'error'
  count?: number
  onClick: () => void
}

interface QuickActionsProps {
  onViewTasks: () => void
  onViewRFIs: () => void
  onViewApprovals: () => void
  onViewActivity: () => void
  pendingTasksCount?: number
  pendingRFIsCount?: number
  pendingApprovalsCount?: number
}

export function QuickActions({
  onViewTasks,
  onViewRFIs,
  onViewApprovals,
  onViewActivity,
  pendingTasksCount = 0,
  pendingRFIsCount = 0,
  pendingApprovalsCount = 0,
}: QuickActionsProps) {
  const { t } = useTranslation()

  const actions: QuickAction[] = [
    {
      id: 'tasks',
      titleKey: 'subcontractorPortal.viewAllTasks',
      descriptionKey: 'subcontractorPortal.manageYourTasks',
      icon: <AssignmentIcon />,
      color: 'primary',
      count: pendingTasksCount,
      onClick: onViewTasks,
    },
    {
      id: 'rfis',
      titleKey: 'subcontractorPortal.viewPendingRFIs',
      descriptionKey: 'subcontractorPortal.respondToRFIs',
      icon: <HelpOutlineIcon />,
      color: 'warning',
      count: pendingRFIsCount,
      onClick: onViewRFIs,
    },
    {
      id: 'approvals',
      titleKey: 'subcontractorPortal.viewPendingApprovals',
      descriptionKey: 'subcontractorPortal.reviewApprovals',
      icon: <ApprovalIcon />,
      color: 'success',
      count: pendingApprovalsCount,
      onClick: onViewApprovals,
    },
    {
      id: 'activity',
      titleKey: 'subcontractorPortal.viewActivity',
      descriptionKey: 'subcontractorPortal.trackRecentChanges',
      icon: <TimelineIcon />,
      color: 'info',
      onClick: onViewActivity,
    },
  ]

  return (
    <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          fontSize: { xs: '1.1rem', sm: '1.25rem' },
          mb: 2.5,
        }}
      >
        {t('subcontractorPortal.quickActions')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
          gap: 2,
        }}
      >
        {actions.map((action) => (
          <QuickActionCard key={action.id} action={action} />
        ))}
      </Box>
    </Paper>
  )
}

interface QuickActionCardProps {
  action: QuickAction
}

function QuickActionCard({ action }: QuickActionCardProps) {
  const { t } = useTranslation()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      action.onClick()
    }
  }

  return (
    <Box
      onClick={action.onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      sx={{
        bgcolor: 'background.paper',
        borderRadius: 2.5,
        border: 1,
        borderColor: 'divider',
        p: 2,
        cursor: 'pointer',
        transition: 'all 200ms',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: `${action.color}.main`,
          transform: 'translateY(-2px)',
          boxShadow: (theme) =>
            `0 4px 12px ${alpha(theme.palette[action.color].main, 0.15)}`,
        },
        '&:active': {
          transform: 'translateY(0)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: `${action.color}.main`,
          outlineOffset: 2,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette[action.color].main, 0.15),
            color: `${action.color}.main`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            '& > svg': { fontSize: '1.5rem' },
          }}
        >
          {action.icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '0.95rem', sm: '1rem' },
                color: 'text.primary',
              }}
            >
              {t(action.titleKey)}
            </Typography>
            {action.count !== undefined && action.count > 0 && (
              <Box
                sx={{
                  bgcolor: `${action.color}.main`,
                  color: `${action.color}.contrastText`,
                  borderRadius: 1.5,
                  px: 1,
                  py: 0.25,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {action.count}
              </Box>
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.8rem', sm: '0.85rem' },
              mb: 1.5,
            }}
          >
            {t(action.descriptionKey)}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: `${action.color}.main`,
              fontSize: '0.85rem',
              fontWeight: 600,
            }}
          >
            <span>{t('common.view')}</span>
            <ArrowForwardIcon sx={{ fontSize: '1rem' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
