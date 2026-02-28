import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Skeleton, Paper, alpha } from '@/mui'
import { DashboardIcon } from '@/icons'
import { useClientPortal } from '../contexts/ClientPortalContext'
import { ProgressOverview } from '../components/client-portal/ProgressOverview'
import { MilestoneTimeline } from '../components/client-portal/MilestoneTimeline'
import { BudgetSummary } from '../components/client-portal/BudgetSummary'
import { EmptyState } from '../components/ui/EmptyState'

export default function ClientPortalDashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    projectId,
    project,
    overview,
    progress,
    canViewBudget,
    loading,
    error,
    refreshAll,
  } = useClientPortal()

  useEffect(() => {
    if (!projectId) {
      navigate('/client-portal/login')
      return
    }
  }, [projectId, navigate])

  useEffect(() => {
    if (projectId && !loading && !overview && !error) {
      refreshAll()
    }
  }, [projectId, loading, overview, error, refreshAll])

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rounded" height={300} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rounded" height={250} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (error || !overview || !project) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <EmptyState
          variant="not-found"
          title={t('clientPortal.dashboardNotAvailable')}
          description={error || t('clientPortal.unableToLoadDashboard')}
          action={{
            label: t('clientPortal.tryAgain'),
            onClick: () => refreshAll(),
          }}
        />
      </Box>
    )
  }

  const milestones = overview.timeline
    .filter((event) => event.eventType === 'milestone')
    .map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      targetDate: event.date,
      completedAt: event.metadata?.completedAt as string | undefined,
      status: event.metadata?.status as string || 'in_progress',
      completionPercentage: (event.metadata?.completionPercentage as number) || 0,
      isOverdue: false,
    }))

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 40,
              height: 40,
              borderRadius: 2,
              background: (theme) =>
                `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.main, 0.08)})`,
              color: 'primary.main',
              flexShrink: 0,
            }}
          >
            <DashboardIcon sx={{ fontSize: '1.25rem' }} />
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
          >
            {t('clientPortal.dashboard')}
          </Typography>
        </Box>
        <Typography
          variant="body1"
          sx={{ color: 'text.secondary', fontSize: { xs: '0.9rem', sm: '1rem' }, ml: { xs: 0, sm: 7 } }}
        >
          {project.name}
        </Typography>
      </Box>

      {project.description && (
        <Paper
          sx={{
            borderRadius: 3,
            p: { xs: 2, sm: 2.5 },
            mb: 3,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
            border: 1,
            borderColor: (theme) => alpha(theme.palette.primary.main, 0.12),
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontSize: { xs: '0.85rem', sm: '0.9rem' },
              lineHeight: 1.6,
            }}
          >
            {project.description}
          </Typography>
        </Paper>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <ProgressOverview progress={progress} loading={false} />

        {milestones.length > 0 && <MilestoneTimeline milestones={milestones} loading={false} />}

        {overview.progress && (
          <BudgetSummary
            budget={
              canViewBudget
                ? {
                    totalBudgeted: '$0',
                    totalActual: '$0',
                    totalVariance: '$0',
                    variancePercentage: 0,
                    approvedChangeOrders: 0,
                    totalChangeOrderAmount: '$0',
                  }
                : null
            }
            loading={false}
            canView={canViewBudget}
          />
        )}
      </Box>

      {project.locationLat && project.locationLng && (
        <Paper sx={{ borderRadius: 3, p: { xs: 2, sm: 2.5 }, mt: 3, overflow: 'hidden' }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 600, fontSize: '0.95rem', color: 'text.primary', mb: 2 }}
          >
            {t('clientPortal.projectLocation')}
          </Typography>
          {project.locationAddress && (
            <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 2 }}>
              {project.locationAddress}
            </Typography>
          )}
          <Box
            component="a"
            href={`https://www.google.com/maps?q=${project.locationLat},${project.locationLng}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              borderRadius: 2,
              bgcolor: 'primary.main',
              color: 'white',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'primary.dark',
                transform: 'translateY(-1px)',
              },
            }}
          >
            {t('clientPortal.viewOnMap')}
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          mt: 3,
          pt: 2.5,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
          {t('clientPortal.lastUpdated')}:{' '}
          {new Date(overview.lastUpdated).toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </Box>
    </Box>
  )
}
