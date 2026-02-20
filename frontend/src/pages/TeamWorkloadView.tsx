import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../components/ui/EmptyState'
import { workloadApi } from '../api/workload'
import type { TeamMember } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { useProject } from '../contexts/ProjectContext'
import { getWorkloadColor } from '../utils/workloadCalculation'
import { PeopleIcon, WarningIcon, CheckCircleIcon, TrendingUpIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Avatar, LinearProgress } from '@/mui'

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

      <Box sx={{ display: 'flex', gap: 1.5, px: 2, mb: 3, overflowX: 'auto' }}>
        <Box sx={{
          flex: 1, minWidth: 110, bgcolor: 'background.paper', p: 1.5, borderRadius: 3,
          border: 1, borderColor: 'divider',
        }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
            {t('teamWorkload.teamMembers')}
          </Typography>
          <Typography variant="h6" fontWeight={700}>{totalMembers}</Typography>
        </Box>
        <Box sx={{
          flex: 1, minWidth: 110, bgcolor: 'background.paper', p: 1.5, borderRadius: 3,
          border: 1, borderColor: 'divider',
        }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
            {t('teamWorkload.activeTasks', 'Active tasks')}
          </Typography>
          <Typography variant="h6" fontWeight={700}>{totalAssignedHours}</Typography>
        </Box>
        <Box sx={{
          flex: 1, minWidth: 110, bgcolor: 'background.paper', p: 1.5, borderRadius: 3,
          border: 1, borderColor: 'divider',
        }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
            {t('teamWorkload.avgWorkload')}
          </Typography>
          <Typography variant="h6" fontWeight={700} color="primary.main">{avgWorkload}%</Typography>
        </Box>
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
        <Box sx={{ px: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sortedMembers.map((member) => {
            const name = member.user.fullName || member.user.email
            const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            const pct = Math.round(member.workloadPercent)
            const status = getWorkloadLabel(pct)

            return (
              <Box
                key={member.id}
                sx={{
                  bgcolor: 'background.paper', border: 1, borderColor: 'divider',
                  borderRadius: 3, p: 2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Avatar sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                      {initials}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" fontWeight={700}>{name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(`roles.${member.role}`, { defaultValue: member.role.replace('_', ' ') })}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={pct > 90 ? <WarningIcon sx={{ fontSize: '14px !important' }} /> :
                      pct >= 40 ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> :
                      <TrendingUpIcon sx={{ fontSize: '14px !important' }} />}
                    label={status.label}
                    size="small"
                    color={status.color}
                    sx={{ fontWeight: 700, fontSize: '0.65rem', height: 24 }}
                  />
                </Box>

                <Box sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" fontWeight={500}>
                      {t('teamWorkload.workload', 'Workload')}
                    </Typography>
                    <Typography variant="caption" fontWeight={700} color={getBarColor(pct)}>
                      {pct}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, pct)}
                    sx={{
                      height: 8, borderRadius: 4,
                      bgcolor: 'action.hover',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 4,
                        bgcolor: getBarColor(pct),
                      },
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {member.assignedHours}{t('common.hoursShort')} {t('teamCard.assigned', 'assigned')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {member.availableHours}{t('common.hoursShort')} {t('teamCard.available', 'available')}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
