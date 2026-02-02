import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import PeopleIcon from '@mui/icons-material/People'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AssignmentIcon from '@mui/icons-material/Assignment'
import { Card, KPICard } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { TeamCard } from '../components/TeamCard'
import { WorkloadCalendar } from '../components/WorkloadCalendar'
import { workloadApi } from '../api/workload'
import type { TeamMember } from '../types'
import { useToast } from '../components/common/ToastProvider'
import dayjs, { Dayjs } from 'dayjs'

interface TeamGroup {
  teamName: string
  members: TeamMember[]
}

export default function TeamWorkloadView() {
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().startOf('week'))
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().endOf('week'))
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  useEffect(() => {
    loadTeamData()
  }, [startDate, endDate])

  const loadTeamData = async () => {
    try {
      setLoading(true)
      const data = await workloadApi.getTeamMembers()
      setTeamMembers(data)
    } catch (error) {
      console.error('Failed to load team workload data:', error)
      showError('Failed to load team workload data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = (newStartDate: Dayjs, newEndDate: Dayjs) => {
    setStartDate(newStartDate)
    setEndDate(newEndDate)
  }

  // Group team members by team
  const teamGroups = teamMembers.reduce<TeamGroup[]>((groups, member) => {
    const teamName = member.teamName || 'Unassigned'
    const existingGroup = groups.find(g => g.teamName === teamName)

    if (existingGroup) {
      existingGroup.members.push(member)
    } else {
      groups.push({ teamName, members: [member] })
    }

    return groups
  }, [])

  // Sort teams by name
  teamGroups.sort((a, b) => a.teamName.localeCompare(b.teamName))

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
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, mb: 3 }}>
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
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          Team Workload
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor team capacity and resource allocation
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
          title="Team Members"
          value={totalMembers}
          icon={<PeopleIcon />}
          color="primary"
        />
        <KPICard
          title="Avg. Workload"
          value={`${avgWorkload}%`}
          trend={avgWorkload > 90 ? -5 : avgWorkload < 60 ? 10 : 0}
          trendLabel="vs last week"
          icon={<TrendingUpIcon />}
          color={avgWorkload > 90 ? 'error' : avgWorkload < 60 ? 'success' : 'warning'}
        />
        <KPICard
          title="Capacity Used"
          value={`${capacityUtilization}%`}
          icon={<AssignmentIcon />}
          color="info"
        />
        <KPICard
          title="Over Capacity"
          value={overloadedMembers}
          icon={<AssignmentIcon />}
          color={overloadedMembers > 0 ? 'error' : 'success'}
        />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 350px' },
          gap: 3,
        }}
      >
        <Box>
          {teamMembers.length === 0 ? (
            <EmptyState
              icon={<PeopleIcon sx={{ fontSize: 64 }} />}
              title="No Team Members"
              description="No team members found for this project. Add team members to track workload."
            />
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={600}>
                    Team Overview
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`${underutilizedMembers} under-utilized`}
                      size="small"
                      color="success"
                      sx={{ fontWeight: 600 }}
                    />
                    <Chip
                      label={`${overloadedMembers} over capacity`}
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
                        Overall Team Capacity
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {totalAssignedHours}h / {totalAvailableHours}h
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

              <Grid container spacing={3}>
                {teamGroups.map((group) => (
                  <Grid item xs={12} md={6} key={group.teamName}>
                    <TeamCard
                      teamName={group.teamName}
                      members={group.members}
                      onClick={() => setSelectedTeam(selectedTeam === group.teamName ? null : group.teamName)}
                      showDetails={selectedTeam === group.teamName}
                    />
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Box>

        <Box>
          <WorkloadCalendar
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
          />

          {teamMembers.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <Box sx={{ p: 2.5 }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  Workload Distribution
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: 1,
                        bgcolor: 'success.main',
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      Under-utilized (0-60%)
                    </Typography>
                    <Chip
                      label={underutilizedMembers}
                      size="small"
                      sx={{ minWidth: 40 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: 1,
                        bgcolor: 'warning.main',
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      Optimal (61-90%)
                    </Typography>
                    <Chip
                      label={teamMembers.filter(m => m.workloadPercent > 60 && m.workloadPercent <= 90).length}
                      size="small"
                      sx={{ minWidth: 40 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: 1,
                        bgcolor: 'error.main',
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      High/Over (91%+)
                    </Typography>
                    <Chip
                      label={teamMembers.filter(m => m.workloadPercent > 90).length}
                      size="small"
                      sx={{ minWidth: 40 }}
                    />
                  </Box>
                </Box>
              </Box>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  )
}
