import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Avatar } from './ui/Avatar'
import { EmptyState } from './ui/EmptyState'
import { CheckCircleIcon as ApprovedIcon, CancelIcon as RejectedIcon, HourglassBottomIcon as PendingIcon, CommentIcon, HistoryIcon } from '@/icons'
import { Box, Typography, Chip, Skeleton, Avatar as MuiAvatar, SxProps, Theme } from '@/mui'

export interface ApprovalAction {
  id: string
  action: 'submitted' | 'approved' | 'rejected' | 'commented' | 'revised' | 'resubmitted'
  user: {
    id: string
    fullName: string
    email: string
    avatar?: string
  }
  timestamp: string
  comment?: string
  changes?: Record<string, { old: string; new: string }>
  status?: 'pending' | 'approved' | 'rejected'
}

interface ApprovalAuditTrailProps {
  actions: ApprovalAction[]
  loading?: boolean
  sx?: SxProps<Theme>
}

const ACTION_CONFIG: Record<ApprovalAction['action'], { icon: React.ReactNode; color: 'success' | 'error' | 'warning' | 'info' | 'default'; label: string }> = {
  submitted: {
    icon: <PendingIcon sx={{ fontSize: 18 }} />,
    color: 'info',
    label: 'Submitted',
  },
  approved: {
    icon: <ApprovedIcon sx={{ fontSize: 18 }} />,
    color: 'success',
    label: 'Approved',
  },
  rejected: {
    icon: <RejectedIcon sx={{ fontSize: 18 }} />,
    color: 'error',
    label: 'Rejected',
  },
  commented: {
    icon: <CommentIcon sx={{ fontSize: 18 }} />,
    color: 'info',
    label: 'Commented',
  },
  revised: {
    icon: <HistoryIcon sx={{ fontSize: 18 }} />,
    color: 'warning',
    label: 'Revised',
  },
  resubmitted: {
    icon: <PendingIcon sx={{ fontSize: 18 }} />,
    color: 'info',
    label: 'Resubmitted',
  },
}

export function ApprovalAuditTrail({ actions, loading = false, sx }: ApprovalAuditTrailProps) {
  const { t } = useTranslation()

  const ACTION_LABELS: Record<ApprovalAction['action'], string> = {
    submitted: t('approvalAuditTrail.submitted'),
    approved: t('approvalAuditTrail.approved'),
    rejected: t('approvalAuditTrail.rejected'),
    commented: t('approvalAuditTrail.commented'),
    revised: t('approvalAuditTrail.revised'),
    resubmitted: t('approvalAuditTrail.resubmitted'),
  }

  if (loading) {
    return (
      <Box sx={sx}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton width="30%" height={20} sx={{ mb: 1 }} />
              <Skeleton width="60%" height={16} />
              <Skeleton width="40%" height={14} sx={{ mt: 1 }} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        variant="no-data"
        icon={<HistoryIcon />}
        title={t('approvals.noHistory')}
        description={t('approvals.noHistoryDescription')}
        sx={sx}
      />
    )
  }

  return (
    <Box sx={sx}>
      {actions.map((action, index) => {
        const config = ACTION_CONFIG[action.action]
        const isLast = index === actions.length - 1

        return (
          <Box
            key={action.id}
            sx={{
              display: 'flex',
              gap: 2,
              pb: isLast ? 0 : 2.5,
              position: 'relative',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: 40,
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: `${config.color}.light`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: `${config.color}.main`,
                  zIndex: 1,
                }}
              >
                {config.icon}
              </Box>

              {!isLast && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    bgcolor: 'divider',
                    mt: 1,
                    mb: 1,
                    minHeight: 60,
                  }}
                />
              )}
            </Box>

            <Box sx={{ flex: 1, pt: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip
                  label={ACTION_LABELS[action.action]}
                  size="small"
                  color={config.color}
                  variant="outlined"
                  sx={{ height: 24, fontWeight: 500 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(action.timestamp).toLocaleDateString(getDateLocale(), {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {' '}
                  {new Date(action.timestamp).toLocaleTimeString(getDateLocale(), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar name={action.user.fullName} size="small" />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {action.user.fullName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {action.user.email}
                  </Typography>
                </Box>
              </Box>

              {action.comment && (
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    mb: 1,
                    borderLeft: '3px solid',
                    borderColor: `${config.color}.main`,
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {action.comment}
                  </Typography>
                </Box>
              )}

              {action.changes && Object.keys(action.changes).length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {t('approvalAuditTrail.changes')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 0.5 }}>
                    {Object.entries(action.changes).map(([field, values]) => (
                      <Typography key={field} variant="caption" color="text.secondary">
                        <strong>{field}:</strong> {values.old} → {values.new}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
