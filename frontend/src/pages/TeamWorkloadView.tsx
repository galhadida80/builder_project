import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { workloadApi } from '../api/workload'
import type { TeamMember } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { useProject } from '../contexts/ProjectContext'
import { getWorkloadColor } from '../utils/workloadCalculation'
import { PeopleIcon, TrendingUpIcon, AssignmentIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar } from '@/mui'

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

  // Sort members by workload descending
  const sortedMembers = [...teamMembers].sort((a, b) => b.workloadPercent - a.workloadPercent)

  // Calculate KPIs
  const totalMembers = teamMembers.length
  const avgWorkload = teamMembers.length > 0
    ? Math.round(teamMembers.reduce((sum, m) => sum + m.workloadPercent, 0) / teamMembers.length)
    : 0
  const overloadedMembers = teamMembers.filter(m => m.workloadPercent > 100).length
  const underutilizedMembers = teamMembers.filter(m => m.workloadPercent < 60).length
  const totalAssignedHours = teamMembers.reduce((sum, m) => sum + m.assignedHours, 0)
  const totalAvailableHours = teamMembers.reduce((sum, m) => sum + m.availableHours, 0)
  const capacityUtilization = totalAvailableHours > 0
    ? Math.round((totalAssignedHours / totalAvailableHours) * 100)
    : 0

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 350px' }, gap: 3 }}>
          <Box>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={200} sx={{ borderRadius: 3, mb: 3 }} />
            ))}
          </Box>
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3, display: { xs: 'none', lg: 'block' } }} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
          }}
        >
          {t('teamWorkload.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {t('teamWorkload.subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 3,
        }}
      >
        <KPICard
          title={t('teamWorkload.teamMembers')}
          value={totalMembers}
          icon={<PeopleIcon />}
          color="primary"
        />
        <KPICard
          title={t('teamWorkload.avgWorkload')}
          value={`${avgWorkload}%`}
          icon={<TrendingUpIcon />}
          color={avgWorkload > 90 ? 'error' : avgWorkload < 60 ? 'success' : 'warning'}
        />
        <KPICard
          title={t('teamWorkload.capacityUsed')}
          value={`${capacityUtilization}%`}
          icon={<AssignmentIcon />}
          color="info"
        />
        <KPICard
          title={t('teamWorkload.overCapacity')}
          value={overloadedMembers}
          icon={<AssignmentIcon />}
          color={overloadedMembers > 0 ? 'error' : 'success'}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
            {t('teamWorkload.teamOverview')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${underutilizedMembers} ${t('teamWorkload.underUtilized')}`}
              size="small"
              color="success"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              label={`${overloadedMembers} ${t('teamWorkload.overCapacity').toLowerCase()}`}
              size="small"
              color="error"
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>

        <Card>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('teamWorkload.overallCapacity')}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {totalAssignedHours}{t('common.hoursShort')} / {totalAvailableHours}{t('common.hoursShort')}
              </Typography>
            </Box>
            <Box
              sx={{
                height: 12,
                borderRadius: 2,
                bgcolor: 'action.hover',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${Math.min(100, capacityUtilization)}%`,
                  bgcolor: capacityUtilization > 90 ? 'error.main' : capacityUtilization > 60 ? 'warning.main' : 'success.main',
                  borderRadius: 2,
                  transition: 'width 300ms ease-out',
                }}
              />
            </Box>
          </Box>
        </Card>
      </Box>

      {teamMembers.length === 0 ? (
        <EmptyState
          icon={<PeopleIcon sx={{ fontSize: 64 }} />}
          title={t('teamWorkload.noMembers')}
          description={t('teamWorkload.noMembersDescription')}
        />
      ) : (
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>{t('teamWorkload.memberName')}</TableCell>
                  <TableCell>{t('teamWorkload.role')}</TableCell>
                  <TableCell>{t('teamWorkload.team')}</TableCell>
                  <TableCell align="center">{t('teamCard.assigned')}</TableCell>
                  <TableCell align="center">{t('teamCard.available')}</TableCell>
                  <TableCell align="center">{t('teamCard.utilization')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedMembers.map((member) => {
                  const name = member.user.fullName || member.user.email
                  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{name}</Typography>
                            <Typography variant="caption" color="text.secondary">{member.user.email}</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={t(`roles.${member.role}`, { defaultValue: member.role.replace('_', ' ') })}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {member.teamName || t('teamWorkload.unassigned')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={500}>
                          {member.assignedHours}{t('common.hoursShort')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={500}>
                          {member.availableHours}{t('common.hoursShort')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${Math.round(member.workloadPercent)}%`}
                          size="small"
                          color={getWorkloadColor(member.workloadPercent)}
                          sx={{ fontWeight: 600, minWidth: 55 }}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Box>
  )
}
