import { useTranslation } from 'react-i18next'
import { Box, Typography, Paper, Skeleton, Grid, alpha } from '@/mui'
import {
  AssignmentIcon,
  CheckCircleIcon,
  HourglassBottomIcon,
  PendingIcon,
  ErrorIcon,
  HelpOutlineIcon,
  ApprovalIcon,
  ScheduleIcon,
  WorkIcon,
} from '@/icons'
import type { SubcontractorDashboardResponse } from '@/api/subcontractors'
import { DashboardQuickStat } from './DashboardQuickStat'
import { DashboardStatCard } from './DashboardStatCard'

interface PortalDashboardProps {
  dashboard: SubcontractorDashboardResponse | null
  loading?: boolean
}

export function PortalDashboard({ dashboard, loading = false }: PortalDashboardProps) {
  const { t } = useTranslation()

  if (loading || !dashboard) {
    return (
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
          <Skeleton variant="text" width={200} height={28} sx={{ mb: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 2 }}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            ))}
          </Box>
        </Paper>
        <Grid container spacing={3}>
          {[...Array(3)].map((_, i) => (
            <Grid item xs={12} md={4} key={i}>
              <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  const { taskStats, rfiStats, approvalStats, upcomingDeadlines } = dashboard

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
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
            <WorkIcon sx={{ fontSize: '1.4rem' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              {t('subcontractorPortal.dashboard')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.25 }}>
              {t('subcontractorPortal.yourWorkSummary')}
            </Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: { xs: 1.5, sm: 2 },
          }}
        >
          <DashboardQuickStat
            value={taskStats.total}
            label={t('subcontractorPortal.totalTasks')}
            icon={<AssignmentIcon fontSize="small" />}
            color="primary.main"
          />
          <DashboardQuickStat
            value={rfiStats.total}
            label={t('subcontractorPortal.totalRFIs')}
            icon={<HelpOutlineIcon fontSize="small" />}
            color="info.main"
          />
          <DashboardQuickStat
            value={approvalStats.total}
            label={t('subcontractorPortal.totalApprovals')}
            icon={<ApprovalIcon fontSize="small" />}
            color="secondary.main"
          />
          <DashboardQuickStat
            value={upcomingDeadlines}
            label={t('subcontractorPortal.upcomingDeadlines')}
            icon={<ScheduleIcon fontSize="small" />}
            color="warning.main"
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <DashboardStatCard
            title={t('subcontractorPortal.tasks')}
            icon={<AssignmentIcon sx={{ fontSize: '1.4rem' }} />}
            color="primary.main"
            stats={[
              {
                value: taskStats.inProgress,
                label: t('subcontractorPortal.inProgress'),
                icon: <HourglassBottomIcon fontSize="small" />,
                color: 'info.main',
              },
              {
                value: taskStats.completed,
                label: t('subcontractorPortal.completed'),
                icon: <CheckCircleIcon fontSize="small" />,
                color: 'success.main',
              },
              {
                value: taskStats.overdue,
                label: t('subcontractorPortal.overdue'),
                icon: <ErrorIcon fontSize="small" />,
                color: 'error.main',
              },
            ]}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardStatCard
            title={t('subcontractorPortal.rfis')}
            icon={<HelpOutlineIcon sx={{ fontSize: '1.4rem' }} />}
            color="info.main"
            stats={[
              {
                value: rfiStats.waitingResponse,
                label: t('subcontractorPortal.waitingResponse'),
                icon: <PendingIcon fontSize="small" />,
                color: 'warning.main',
              },
              {
                value: rfiStats.answered,
                label: t('subcontractorPortal.answered'),
                icon: <CheckCircleIcon fontSize="small" />,
                color: 'success.main',
              },
              {
                value: rfiStats.open,
                label: t('subcontractorPortal.open'),
                icon: <HourglassBottomIcon fontSize="small" />,
                color: 'info.main',
              },
            ]}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <DashboardStatCard
            title={t('subcontractorPortal.approvals')}
            icon={<ApprovalIcon sx={{ fontSize: '1.4rem' }} />}
            color="secondary.main"
            stats={[
              {
                value: approvalStats.pending,
                label: t('subcontractorPortal.pending'),
                icon: <PendingIcon fontSize="small" />,
                color: 'warning.main',
              },
              {
                value: approvalStats.approved,
                label: t('subcontractorPortal.approved'),
                icon: <CheckCircleIcon fontSize="small" />,
                color: 'success.main',
              },
              {
                value: approvalStats.rejected,
                label: t('subcontractorPortal.rejected'),
                icon: <ErrorIcon fontSize="small" />,
                color: 'error.main',
              },
            ]}
          />
        </Grid>
      </Grid>
    </Box>
  )
}
