import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { Tabs } from '../components/ui/Tabs'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'
import { SummaryTab, StatsTab, StatCell, TimelineTab, TeamTab } from '../components/overview/ProjectSummaryCards'
import type { TimelineEvent, TeamStats } from '../components/overview/ProjectSummaryCards'
import { apiClient } from '../api/client'
import { useToast } from '../components/common/ToastProvider'
import { getDateLocale } from '../utils/dateLocale'
import { MapIcon, LocationOnIcon, NavigateNextIcon } from '@/icons'
import { Box, Typography, Skeleton, alpha, useTheme, useMediaQuery } from '@/mui'

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
  projectStatus: string
  progress: ProgressMetrics
  timeline: TimelineEvent[]
  teamStats: TeamStats
  stats: ProjectStats
  lastUpdated: string
  locationLat: number | null
  locationLng: number | null
  locationAddress: string | null
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
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={120} height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
          {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />)}
        </Box>
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (!overviewData) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
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

  const totalItems = progress.inspectionsTotal + progress.equipmentTotal + progress.materialsTotal + progress.checklistsTotal
  const completedItems = totalItems > 0 ? Math.round(progress.overallPercentage / 100 * totalItems) : 0
  const inProgressItems = progress.equipmentSubmitted + progress.materialsSubmitted + (progress.inspectionsTotal - progress.inspectionsCompleted > 0 ? progress.inspectionsTotal - progress.inspectionsCompleted : 0)
  const pendingItems = Math.max(0, totalItems - completedItems - inProgressItems)

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('overview.title')}
        actions={<StatusBadge status={overviewData.projectStatus} />}
      />

      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Card sx={{ p: { xs: 2.5, sm: 3 }, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('overview.projectProgress')}
              </Typography>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                {Math.round(progress.overallPercentage)}<Typography component="span" sx={{ color: 'primary.main', fontWeight: 700, fontSize: 'inherit' }}>%</Typography>
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'end' }}>
              {stats.daysRemaining !== null && (
                <Typography variant="body2" color="text.secondary">
                  {t('overview.daysRemaining')}: <strong>{stats.daysRemaining}</strong>
                </Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ width: '100%', height: 10, bgcolor: 'action.hover', borderRadius: 5, overflow: 'hidden', mb: 2 }}>
            <Box sx={{ width: `${progress.overallPercentage}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 5, transition: 'width 0.5s' }} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <StatCell value={completedItems} label={t('overview.completed')} color="success.main" />
            <StatCell value={inProgressItems} label={t('overview.inProgress')} color="info.main" />
            <StatCell value={pendingItems} label={t('overview.pending')} color="warning.main" />
          </Box>
        </Card>

        {overviewData.locationLat && overviewData.locationLng && (
          <Card sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.2)}, ${alpha(theme.palette.info.main, 0.08)})`,
                  color: theme.palette.info.main,
                  flexShrink: 0,
                }}
              >
                <MapIcon sx={{ fontSize: '1.3rem' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem', color: 'text.primary' }}>
                  {t('projectDetail.location')}
                </Typography>
                {overviewData.locationAddress && (
                  <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', mt: 0.25 }}>
                    {overviewData.locationAddress}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box
              component="a"
              href={`https://www.google.com/maps?q=${overviewData.locationLat},${overviewData.locationLng}`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'block', borderRadius: 2, overflow: 'hidden', mb: 1.5, border: '1px solid', borderColor: 'divider' }}
            >
              <Box
                component="img"
                src={`https://maps.googleapis.com/maps/api/staticmap?center=${overviewData.locationLat},${overviewData.locationLng}&zoom=15&size=600x200&scale=2&markers=color:red%7C${overviewData.locationLat},${overviewData.locationLng}&key=${import.meta.env.VITE_GOOGLE_MAPS_KEY || ''}`}
                alt={t('projectDetail.location')}
                sx={{ width: '100%', height: { xs: 150, sm: 180 }, objectFit: 'cover', display: 'block' }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none' }}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="secondary"
                size="small"
                icon={<NavigateNextIcon />}
                onClick={() => window.open(`https://waze.com/ul?ll=${overviewData.locationLat},${overviewData.locationLng}&navigate=yes`, '_blank')}
                sx={{ flex: 1 }}
              >
                {t('projectDetail.openInWaze')}
              </Button>
              <Button
                variant="secondary"
                size="small"
                icon={<LocationOnIcon />}
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${overviewData.locationLat},${overviewData.locationLng}`, '_blank')}
                sx={{ flex: 1 }}
              >
                {t('projectDetail.openInGoogleMaps')}
              </Button>
            </Box>
          </Card>
        )}

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

        <Box sx={{ mt: 2.5 }}>
          {activeTab === 'summary' && <SummaryTab progress={progress} stats={stats} t={t} />}
          {activeTab === 'timeline' && <TimelineTab timeline={timeline} dateLocale={dateLocale} t={t} />}
          {activeTab === 'team' && <TeamTab teamStats={teamStats} t={t} />}
          {activeTab === 'stats' && <StatsTab progress={progress} totalItems={totalItems} completedItems={completedItems} pendingItems={pendingItems} t={t} />}
        </Box>
      </Box>
    </Box>
  )
}

