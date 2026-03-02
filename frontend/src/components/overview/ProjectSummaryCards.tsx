import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { ConstructionIcon, GroupIcon, CheckCircleIcon, ScheduleIcon, ExpandMoreIcon, ExpandLessIcon, PersonAddIcon, AdminPanelSettingsIcon, EngineeringIcon, AssignmentIndIcon, SecurityIcon, SearchIcon } from '@/icons'
import { Box, Typography, Avatar, Chip, Collapse, alpha, useTheme } from '@/mui'
import type { ProjectMember } from '../../types'

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

const ROLE_CONFIG: Record<string, { color: 'primary' | 'info' | 'warning' | 'success' | 'error'; icon: React.ReactNode }> = {
  project_admin: { color: 'primary', icon: <AdminPanelSettingsIcon sx={{ fontSize: 18 }} /> },
  contractor: { color: 'info', icon: <ConstructionIcon sx={{ fontSize: 18 }} /> },
  consultant: { color: 'warning', icon: <AssignmentIndIcon sx={{ fontSize: 18 }} /> },
  supervisor: { color: 'success', icon: <EngineeringIcon sx={{ fontSize: 18 }} /> },
  inspector: { color: 'error', icon: <SecurityIcon sx={{ fontSize: 18 }} /> },
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].substring(0, 2).toUpperCase()
}

interface TeamTabProps {
  members: ProjectMember[]
  teamStats?: TeamStats
  t: (key: string, opts?: Record<string, unknown>) => string
  onInvite?: () => void
}

export function TeamTab({ members, teamStats, t, onInvite }: TeamTabProps) {
  const theme = useTheme()
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({})

  const toggleRole = (role: string) => {
    setExpandedRoles(prev => ({ ...prev, [role]: !prev[role] }))
  }

  const grouped = members.reduce<Record<string, ProjectMember[]>>((acc, member) => {
    const role = member.role || 'other'
    if (!acc[role]) acc[role] = []
    acc[role].push(member)
    return acc
  }, {})

  if (members.length === 0 && !teamStats) {
    return (
      <Card sx={{ p: 4, textAlign: 'center' }}>
        <GroupIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{t('teamCard.noMembers')}</Typography>
        {onInvite && <Button variant="primary" icon={<PersonAddIcon />} onClick={onInvite}>{t('overview.team.inviteMember')}</Button>}
      </Card>
    )
  }

  if (members.length === 0 && teamStats) {
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography variant="body2" fontWeight={600}>
            {t('overview.totalTeamMembers')} ({members.length})
          </Typography>
        </Box>
        {onInvite && <Button variant="secondary" size="small" icon={<PersonAddIcon />} onClick={onInvite}>{t('overview.team.inviteMember')}</Button>}
      </Box>

      {Object.entries(grouped).map(([role, roleMembers]) => {
        const config = ROLE_CONFIG[role] || { color: 'primary' as const, icon: <SearchIcon sx={{ fontSize: 18 }} /> }
        const isExpanded = expandedRoles[role] !== false

        return (
          <Card key={role} sx={{ overflow: 'hidden' }}>
            <Box
              onClick={() => toggleRole(role)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, cursor: 'pointer',
                bgcolor: alpha(theme.palette[config.color].main, 0.08),
                borderInlineStart: `3px solid`,
                borderColor: `${config.color}.main`,
                '&:hover': { bgcolor: alpha(theme.palette[config.color].main, 0.14) },
              }}
            >
              <Box sx={{ color: `${config.color}.main`, display: 'flex' }}>{config.icon}</Box>
              <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                {t(`roles.${role}`, { defaultValue: role.replace('_', ' ') })}
              </Typography>
              <Chip label={roleMembers.length} size="small" color={config.color} sx={{ height: 22, fontSize: '0.75rem', fontWeight: 700 }} />
              {isExpanded ? <ExpandLessIcon sx={{ fontSize: 18, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />}
            </Box>

            <Collapse in={isExpanded}>
              {roleMembers.map((member, idx) => (
                <Box
                  key={member.id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                    borderBottom: idx < roleMembers.length - 1 ? 1 : 0, borderColor: 'divider',
                  }}
                >
                  <Avatar
                    src={member.user.avatarUrl}
                    sx={{ width: 36, height: 36, bgcolor: `${config.color}.main`, fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    {getInitials(member.user.fullName)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap>{member.user.fullName || member.user.email}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>{member.user.email}</Typography>
                  </Box>
                  {member.department && (
                    <Chip label={member.department} size="small" variant="outlined" sx={{ height: 22, fontSize: '0.7rem', flexShrink: 0 }} />
                  )}
                </Box>
              ))}
            </Collapse>
          </Card>
        )
      })}
    </Box>
  )
}
