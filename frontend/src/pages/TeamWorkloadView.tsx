import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../components/ui/EmptyState'
import { KPICard } from '../components/ui/Card'
import { workloadApi } from '../api/workload'
import type { TeamMember } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { useProject } from '../contexts/ProjectContext'
import { PeopleIcon, WarningIcon, CheckCircleIcon, TrendingUpIcon, AssignmentIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Avatar, LinearProgress, alpha } from '@/mui'

export default function TeamWorkloadView() {
  const { t } = useTranslation()
  const { showError } = useToast()
  const { selectedProjectId } = useProject()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    loadTeamData()
  }, [selectedProjectId])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      const data = await workloadApi.getTeamMembers(selectedProjectId)
      setTeamMembers(data)
    } catch (error) {
      console.error('Failed to load team workload data:', error)
      showError(t('teamWorkload.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const sortedMembers = [...teamMembers].sort((a, b) => b.workloadPercent - a.workloadPercent)

  const totalMembers = teamMembers.length
  const avgWorkload = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((sum, m) => sum + m.workloadPercent, 0) / teamMembers.length)
    : 0
  const totalAssignedHours = teamMembers.reduce((sum, m) => sum + m.assignedHours, 0)
  const overCapacityCount = teamMembers.filter(m => m.workloadPercent > 100).length

  const getWorkloadLabel = (pct: number) => {
    if (pct > 90) return { label: t('teamWorkload.overloaded', 'Overloaded'), color: 'error' as const }
    if (pct > 75) return { label: t('teamWorkload.slightlyHigh', 'Slightly high'), color: 'warning' as const }
    if (pct >= 40) return { label: t('teamWorkload.balanced', 'Balanced'), color: 'success' as const }
    return { label: t('teamWorkload.available', 'Available'), color: 'success' as const }
  }

  const getBarColor = (pct: number) => {
    if (pct > 90) return 'error.main'
    if (pct > 75) return 'primary.main'
    return 'success.main'
  }

  if (loading) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 2, sm: 3 }, pb: 10 }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ flex: 1, borderRadius: 3 }} />
          ))}
        </Box>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3, mb: 2 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', pb: 10 }}>
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: { xs: 2, sm: 3 }, py: 2,
        borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PeopleIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={700} letterSpacing='-0.02em'>
            {t('teamWorkload.title')}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 2, py: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {t('teamWorkload.subtitle')}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, px: 2, mb: 3 }}>
        <KPICard title={t('teamWorkload.teamMembers')} value={totalMembers} icon={<PeopleIcon />} color="primary" />
        <KPICard title={t('teamWorkload.activeTasks', 'Active tasks')} value={totalAssignedHours} icon={<TrendingUpIcon />} color="warning" />
        <KPICard title={t('teamWorkload.avgWorkload')} value={`${avgWorkload}%`} icon={<CheckCircleIcon />} color="success" />
        <KPICard title={t('teamWorkload.overCapacity')} value={overCapacityCount} icon={<WarningIcon />} color="error" />
      </Box>

      {teamMembers.length === 0 ? (
        <Box sx={{ px: 2 }}>
          <EmptyState
            icon={<PeopleIcon sx={{ fontSize: 64 }} />}
            title={t('teamWorkload.noMembers')}
            description={t('teamWorkload.noMembersDescription')}
          />
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" fontWeight={700} sx={{ mb: 1 }}>
              {t('teamWorkload.overallCapacity')}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, avgWorkload)}
              sx={{
                height: 10, borderRadius: 5,
                bgcolor: 'action.hover',
                '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: getBarColor(avgWorkload) },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {avgWorkload}% {t('teamWorkload.avgWorkload')}
            </Typography>
          </Box>

          <Typography variant="body1" fontWeight={700} sx={{ mb: 1.5 }}>
            {t('teamWorkload.teamOverview')}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
            {sortedMembers.map((member) => {
              const name = member.user.fullName || member.user.email
              const pct = Math.round(member.workloadPercent)
              const status = getWorkloadLabel(pct)
              const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              return (
                <Box
                  key={member.id}
                  sx={{
                    bgcolor: 'background.paper', borderRadius: 3, p: 2,
                    border: 1, borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: '0.9rem', fontWeight: 600 }}>
                        {initials}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t(`roles.${member.role}`, { defaultValue: member.role.replace('_', ' ') })}
                          {member.teamName && ` · ${member.teamName}`}
                        </Typography>
                      </Box>
                    </Box>
                    <Chip
                      label={status.label}
                      size="small"
                      color={status.color}
                      sx={{ fontWeight: 700, fontSize: '0.6rem', height: 22 }}
                    />
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={500}>
                        {t('teamCard.utilization')}
                      </Typography>
                      <Typography variant="caption" fontWeight={700}>{pct}%</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, pct)}
                      sx={{
                        height: 8, borderRadius: 4,
                        bgcolor: (theme) => alpha(theme.palette.divider, 0.3),
                        '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: getBarColor(pct) },
                      }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1.5, pt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <AssignmentIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">
                        {member.assignedHours}{t('common.hoursShort')} {t('teamCard.assigned')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">
                        {member.availableHours}{t('common.hoursShort')} {t('teamCard.available')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Box>
  )
}
