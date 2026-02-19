import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Tabs } from '../components/ui/Tabs'
import { CircularProgressDisplay } from '../components/ui/ProgressBar'
import { apiClient } from '../api/client'
import { useToast } from '../components/common/ToastProvider'
import { getDateLocale } from '../utils/dateLocale'
import { Box, Typography, Skeleton, Grid } from '@/mui'
import { useTheme, useMediaQuery } from '@/mui'

interface TimelineEvent {
  id: string
  eventType: string
  title: string
  description?: string
  date: string
  userName?: string
}

// Backend response interfaces (camelCase from CamelCaseModel)
interface ProgressMetrics {
  overallPercentage: number
  inspectionsCompleted: number
  inspectionsTotal: number
  equipmentSubmitted: number
  equipmentTotal: number
  materialsSubmitted: number
  materialsTotal: number
  checklistsCompleted: number
  checklistsTotal: number
}

interface TeamStats {
  totalMembers: number
  activeMembers: number
  roles: Record<string, number>
}

interface ProjectStats {
  totalInspections: number
  pendingInspections: number
  totalEquipment: number
  totalMaterials: number
  totalMeetings: number
  openFindings: number
  daysRemaining: number | null
  daysElapsed: number | null
}

interface ProjectOverviewData {
  projectId: string
  projectName: string
  projectCode: string
  projectStatus: string
  progress: ProgressMetrics
  timeline: TimelineEvent[]
  teamStats: TeamStats
  stats: ProjectStats
  lastUpdated: string
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { showError } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [loading, setLoading] = useState(true)
  const [overviewData, setOverviewData] = useState<ProjectOverviewData | null>(null)
  const [activeTab, setActiveTab] = useState('summary')

  const dateLocale = getDateLocale()

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return

      try {
        setLoading(true)
        const response = await apiClient.get(`/projects/${projectId}/overview`)
        setOverviewData(response.data)
      } catch (error) {
        console.error('Failed to load project overview:', error)
        showError(t('overview.failedToLoad'))
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [projectId])

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (!overviewData) {
    return (
      <Box sx={{ p: 3 }}>
        <EmptyState
          variant="not-found"
          title={t('overview.notAvailable')}
          description={t('overview.unableToLoad')}
          action={{ label: t('overview.backToProject'), onClick: () => navigate(`/projects/${projectId}`) }}
        />
      </Box>
    )
  }

  const { progress, timeline, teamStats, stats } = overviewData

  // Calculate derived metrics from detailed progress data
  const totalItems =
    progress.inspectionsTotal +
    progress.equipmentTotal +
    progress.materialsTotal +
    progress.checklistsTotal

  const completedItems = totalItems > 0
    ? Math.round(progress.overallPercentage / 100 * totalItems)
    : 0

  const inProgressItems =
    progress.equipmentSubmitted +
    progress.materialsSubmitted +
    (progress.inspectionsTotal - progress.inspectionsCompleted > 0
      ? progress.inspectionsTotal - progress.inspectionsCompleted : 0)

  const pendingItems = Math.max(0, totalItems - completedItems - inProgressItems)

  const summaryContent = (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              {t('overview.projectProgress')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 1 }}>
              <CircularProgressDisplay
                value={progress.overallPercentage}
                size={isMobile ? 120 : 160}
                thickness={6}
                showLabel
              />
              <Typography variant="body2" color="text.secondary">
                {t('overview.itemsCompleted', { completed: completedItems, total: totalItems })}
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {completedItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('overview.completed')}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="info.main">
                  {inProgressItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('overview.inProgress')}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  {pendingItems}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('overview.pending')}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              {t('overview.projectStats')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('overview.timeline')}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h4" fontWeight={700}>
                    {stats.daysElapsed || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('overview.daysElapsed')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {stats.daysRemaining || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('overview.daysRemaining')}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {t('overview.activityFindings')}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h4" fontWeight={700}>
                    {timeline.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('overview.recentActivities')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={stats.openFindings > 0 ? 'error.main' : 'success.main'}
                  >
                    {stats.openFindings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('overview.openFindings')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Card>
      </Grid>
    </Grid>
  )

  const timelineContent = (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          {t('overview.recentActivity')}
        </Typography>
        {timeline.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {t('overview.noRecentActivity')}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {timeline.slice(0, 20).map((event) => (
              <Box
                key={event.id}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 2,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" fontWeight={600}>{event.title}</Typography>
                  {event.description && (
                    <Typography variant="caption" color="text.secondary">{event.description}</Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                  {new Date(event.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Card>
  )

  const teamContent = (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          {t('overview.teamOverview')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body1" color="text.secondary">
              {t('overview.totalTeamMembers')}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {teamStats.totalMembers}
            </Typography>
          </Box>

          {Object.entries(teamStats.roles || {}).map(([role, count]) => (
            <Box
              key={role}
              sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {t(`roles.${role}`, { defaultValue: role.replace('_', ' ') })}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {count}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Card>
  )

  const statsContent = (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          {t('overview.detailedStatistics')}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('overview.completionRate')}
              </Typography>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {Math.round(progress.overallPercentage)}%
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('overview.totalItems')}
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {totalItems}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('overview.itemsCompletedLabel')}
              </Typography>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {completedItems}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('overview.itemsPending')}
              </Typography>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                {pendingItems}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('nav.inspections')}
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {progress.inspectionsCompleted}/{progress.inspectionsTotal}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('nav.equipment')}
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {progress.equipmentSubmitted}/{progress.equipmentTotal}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('nav.materials')}
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {progress.materialsSubmitted}/{progress.materialsTotal}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t('equipment.checklist')}
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {progress.checklistsCompleted}/{progress.checklistsTotal}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Card>
  )

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          {t('overview.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('overview.subtitle')}
        </Typography>
      </Box>

      <Tabs
        items={[
          { label: t('overview.tabs.summary'), value: 'summary' },
          { label: t('overview.tabs.timeline'), value: 'timeline' },
          { label: t('overview.tabs.team'), value: 'team' },
          { label: t('overview.tabs.statistics'), value: 'stats' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />
      <Box sx={{ mt: 3 }}>
        {activeTab === 'summary' && summaryContent}
        {activeTab === 'timeline' && timelineContent}
        {activeTab === 'team' && teamContent}
        {activeTab === 'stats' && statsContent}
      </Box>
    </Box>
  )
}
