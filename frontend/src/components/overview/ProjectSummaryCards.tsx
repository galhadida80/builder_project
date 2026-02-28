import { Card } from '../ui/Card'
import { ConstructionIcon, GroupIcon, CheckCircleIcon, ScheduleIcon } from '@/icons'
import { Box, Typography } from '@/mui'

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

export interface TimelineEvent {
  id: string
  eventType: string
  title: string
  description?: string
  date: string
  userName?: string
}

export interface TeamStats {
  totalMembers: number
  activeMembers: number
  roles: Record<string, number>
}

interface SummaryTabProps {
  progress: ProgressMetrics
  stats: ProjectStats
  t: (key: string, opts?: Record<string, unknown>) => string
}

interface StatsTabProps {
  progress: ProgressMetrics
  totalItems: number
  completedItems: number
  pendingItems: number
  t: (key: string) => string
}

export function SummaryTab({ progress, stats, t }: SummaryTabProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
        <SummaryCard label={t('nav.inspections')} value={`${progress.inspectionsCompleted}/${progress.inspectionsTotal}`} />
        <SummaryCard label={t('nav.equipment')} value={`${progress.equipmentSubmitted}/${progress.equipmentTotal}`} />
        <SummaryCard label={t('nav.materials')} value={`${progress.materialsSubmitted}/${progress.materialsTotal}`} />
        <SummaryCard label={t('equipment.checklist')} value={`${progress.checklistsCompleted}/${progress.checklistsTotal}`} />
      </Box>
      <Card sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{t('overview.daysElapsed')}</Typography>
          <Typography variant="body1" fontWeight={700}>{stats.daysElapsed || 0}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{t('overview.openFindings')}</Typography>
          <Typography variant="body1" fontWeight={700} color={stats.openFindings > 0 ? 'error.main' : 'success.main'}>{stats.openFindings}</Typography>
        </Box>
      </Card>
    </Box>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card sx={{ p: 2, textAlign: 'center' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
    </Card>
  )
}

export function StatsTab({ progress, totalItems, completedItems, pendingItems, t }: StatsTabProps) {
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
    <Card sx={{ p: 2 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{label}</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ color: color || 'text.primary' }}>{value}</Typography>
    </Card>
  )
}

export function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="h6" fontWeight={700} sx={{ color }}>{value}</Typography>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
    </Box>
  )
}

export function TimelineTab({ timeline, dateLocale, t }: { timeline: TimelineEvent[]; dateLocale: string; t: (key: string) => string }) {
  if (timeline.length === 0) {
    return <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>{t('overview.noRecentActivity')}</Typography>
  }
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {timeline.slice(0, 20).map((event) => (
        <Card key={event.id} sx={{ display: 'flex', gap: 1.5, p: 1.5, alignItems: 'center' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: event.eventType === 'completion' ? 'success.main' : event.eventType === 'start' ? 'primary.main' : 'action.selected', color: event.eventType === 'completion' ? 'success.contrastText' : event.eventType === 'start' ? 'primary.contrastText' : 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {event.eventType === 'completion' ? <CheckCircleIcon sx={{ fontSize: 18 }} /> : event.eventType === 'start' ? <ConstructionIcon sx={{ fontSize: 18 }} /> : <ScheduleIcon sx={{ fontSize: 18 }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600}>{event.title}</Typography>
            {event.description && <Typography variant="caption" color="text.secondary">{event.description}</Typography>}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {new Date(event.date).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })}
          </Typography>
        </Card>
      ))}
    </Box>
  )
}

export function TeamTab({ teamStats, t }: { teamStats: TeamStats; t: (key: string, opts?: Record<string, unknown>) => string }) {
  return (
    <Card>
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
    </Card>
  )
}
