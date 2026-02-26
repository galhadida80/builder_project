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
import { ConstructionIcon, GroupIcon, CheckCircleIcon, ScheduleIcon, PendingIcon } from '@/icons'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Box, Typography, Skeleton, Paper } from '@/mui'

interface TimelineEvent {
  id: string
  eventType: string
  title: string
  description?: string
  date: string
  userName?: string
}

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
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontSize: { xs: '1.25rem', sm: '1.5rem' }, mb: 0.5 }}>
          {t('overview.title')}
        </Typography>
        <StatusBadge status={overviewData.projectStatus} />
      </Box>

      <Paper sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 }, mb: 3 }}>
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
      </Paper>

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
  )
}

function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={700} sx={{ color }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  )
}

function SummaryTab({ progress, stats, t }: { progress: ProgressMetrics; stats: ProjectStats; t: (key: string, opts?: Record<string, unknown>) => string }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        <SummaryCard label={t('nav.inspections')} value={`${progress.inspectionsCompleted}/${progress.inspectionsTotal}`} />
        <SummaryCard label={t('nav.equipment')} value={`${progress.equipmentSubmitted}/${progress.equipmentTotal}`} />
        <SummaryCard label={t('nav.materials')} value={`${progress.materialsSubmitted}/${progress.materialsTotal}`} />
        <SummaryCard label={t('equipment.checklist')} value={`${progress.checklistsCompleted}/${progress.checklistsTotal}`} />
      </Box>
      <Paper sx={{ p: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{t('overview.daysElapsed')}</Typography>
          <Typography variant="body1" fontWeight={700}>{stats.daysElapsed || 0}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{t('overview.openFindings')}</Typography>
          <Typography variant="body1" fontWeight={700} color={stats.openFindings > 0 ? 'error.main' : 'success.main'}>{stats.openFindings}</Typography>
        </Box>
      </Paper>
    </Box>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
    </Paper>
  )
}

function TimelineTab({ timeline, dateLocale, t }: { timeline: TimelineEvent[]; dateLocale: string; t: (key: string) => string }) {
  if (timeline.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>{t('overview.noRecentActivity')}</Typography>
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {timeline.slice(0, 20).map((event) => (
        <Paper key={event.id} sx={{ display: 'flex', gap: 1.5, p: 1.5, borderRadius: 2, alignItems: 'center' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: event.eventType === 'completion' ? 'success.main' : event.eventType === 'start' ? 'primary.main' : 'action.selected', color: event.eventType === 'completion' ? 'white' : event.eventType === 'start' ? 'white' : 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {event.eventType === 'completion' ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : event.eventType === 'start' ? <ConstructionIcon sx={{ fontSize: 18 }} /> : <ScheduleIcon sx={{ fontSize: 18 }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600}>{event.title}</Typography>
            {event.description && <Typography variant="caption" color="text.secondary">{event.description}</Typography>}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date(event.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
          </Typography>
        </Paper>
      ))}
    </Box>
  )
}

function TeamTab({ teamStats, t }: { teamStats: TeamStats; t: (key: string, opts?: Record<string, unknown>) => string }) {
  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GroupIcon sx={{ color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={500}>{t('overview.totalTeamMembers')}</Typography>
        </Box>
        <Typography variant="h6" fontWeight={700}>{teamStats.totalMembers}</Typography>
      </Box>
      {Object.entries(teamStats.roles || {}).map(([role, count]) => (
        <Box key={role} sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            {t(`roles.${role}`, { defaultValue: role.replace('_', ' ') })}
          </Typography>
          <Typography variant="body2" fontWeight={600}>{count}</Typography>
        </Box>
      ))}
    </Paper>
  )
}

function StatsTab({ progress, totalItems, completedItems, pendingItems, t }: { progress: ProgressMetrics; totalItems: number; completedItems: number; pendingItems: number; t: (key: string) => string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
      <StatBox label={t('overview.completionRate')} value={`${Math.round(progress.overallPercentage)}%`} color="primary.main" />
      <StatBox label={t('overview.totalItems')} value={String(totalItems)} />
      <StatBox label={t('overview.itemsCompletedLabel')} value={String(completedItems)} color="success.main" />
      <StatBox label={t('overview.itemsPending')} value={String(pendingItems)} color="warning.main" />
      <StatBox label={t('nav.inspections')} value={`${progress.inspectionsCompleted}/${progress.inspectionsTotal}`} />
      <StatBox label={t('nav.equipment')} value={`${progress.equipmentSubmitted}/${progress.equipmentTotal}`} />
      <StatBox label={t('nav.materials')} value={`${progress.materialsSubmitted}/${progress.materialsTotal}`} />
      <StatBox label={t('equipment.checklist')} value={`${progress.checklistsCompleted}/${progress.checklistsTotal}`} />
    </Box>
  )
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Paper sx={{ p: 2, borderRadius: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ color: color || 'text.primary' }}>{value}</Typography>
    </Paper>
  )
}
