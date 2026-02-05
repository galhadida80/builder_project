import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import ChartBarIcon from '@mui/icons-material/BarChart'
import GroupIcon from '@mui/icons-material/Group'
import AssignmentIcon from '@mui/icons-material/Assignment'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { projectsApi } from '../api/projects'
import { workloadApi } from '../api/workload'
import type { Project, TeamMember as TeamMemberType } from '../types'
import { useToast } from '../components/common/ToastProvider'

interface ProjectMetrics {
  id: string
  name: string
  code: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  progress: number
  budget: { spent: number; total: number }
  team: { assigned: number; total: number }
  startDate: string
  endDate: string
  tasksCompleted: number
  tasksPending: number
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  assignedProjects: number
  workload: 'low' | 'moderate' | 'high' | 'overload'
}

export default function ProjectManagerDashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showError } = useToast()
  const [projects, setProjects] = useState<ProjectMetrics[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<ProjectMetrics | null>(null)

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true)
        const [projectsData, teamData] = await Promise.all([
          projectsApi.list(),
          workloadApi.getTeamMembers()
        ])

        const mappedProjects: ProjectMetrics[] = projectsData.map((p: Project) => ({
          id: p.id,
          name: p.name,
          code: p.code || p.id.substring(0, 8),
          status: (p.status as ProjectMetrics['status']) || 'active',
          progress: p.completionPercentage || 0,
          budget: { spent: 0, total: 0 },
          team: { assigned: 0, total: 0 },
          startDate: p.startDate || '',
          endDate: p.estimatedEndDate || '',
          tasksCompleted: 0,
          tasksPending: 0,
        }))

        const mappedTeam: TeamMember[] = teamData.map((t: TeamMemberType) => ({
          id: t.id,
          name: t.user?.fullName || t.user?.email || 'Unknown',
          email: t.user?.email || '',
          role: t.role || 'Team Member',
          assignedProjects: 1,
          workload: t.workloadPercent > 90 ? 'overload' : t.workloadPercent > 70 ? 'high' : t.workloadPercent > 40 ? 'moderate' : 'low',
        }))

        setProjects(mappedProjects)
        setTeam(mappedTeam)
      } catch (error) {
        console.error('Failed to load dashboard data:', error)
        showError('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const getWorkloadColor = (workload: TeamMember['workload']) => {
    switch (workload) {
      case 'low': return 'success'
      case 'moderate': return 'info'
      case 'high': return 'warning'
      case 'overload': return 'error'
      default: return 'default'
    }
  }

  const activeProjects = projects.filter(p => p.status === 'active')
  const totalBudgetSpent = projects.reduce((sum, p) => sum + p.budget.spent, 0)
  const totalBudget = projects.reduce((sum, p) => sum + p.budget.total, 0)
  const avgProgress = projects.length > 0 ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length) : 0

  return (
    <Box sx={{ pb: 4 }}>
      <PageHeader title="Project Manager Dashboard" breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Projects' }]} />

      <Box sx={{ mt: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Overview
        </Typography>

        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Skeleton variant="rounded" height={140} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Active Projects"
                value={activeProjects.length}
                icon={<AssignmentIcon />}
                color="primary"
                onClick={() => navigate('/projects')}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Team Members"
                value={team.length}
                icon={<GroupIcon />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Avg Progress"
                value={`${avgProgress}%`}
                icon={<ChartBarIcon />}
                color="success"
                trend={5}
                trendLabel="vs last month"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KPICard
                title="Budget Used"
                value={`${Math.round((totalBudgetSpent / totalBudget) * 100)}%`}
                icon={<WarningIcon />}
                color="warning"
              />
            </Grid>
          </Grid>
        )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            All Projects
          </Typography>
          <Button variant="primary" size="small" onClick={() => navigate('/projects')}>
            View All
          </Button>
        </Box>

        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3, 4].map((i) => (
              <Grid item xs={12} key={i}>
                <Skeleton variant="rounded" height={120} />
              </Grid>
            ))}
          </Grid>
        ) : projects.length > 0 ? (
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Grid item xs={12} key={project.id}>
                <Card
                  hoverable
                  onClick={() => {
                    setSelectedProject(project)
                    navigate(`/projects/${project.id}`)
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {project.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {project.code}
                        </Typography>
                      </Box>
                      <StatusBadge status={project.status} />
                    </Box>

                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Progress
                        </Typography>
                        <ProgressBar value={project.progress} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Budget
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            ${(project.budget.spent / 1000000).toFixed(1)}M / ${(project.budget.total / 1000000).toFixed(1)}M
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <GroupIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">
                          {project.team.assigned}/{project.team.total} team members
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                        <Typography variant="body2" color="text.secondary">
                          {project.tasksCompleted}/{project.tasksCompleted + project.tasksPending} tasks
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <EmptyState
            variant="no-data"
            icon={<AssignmentIcon />}
            title="No projects yet"
            description="Start by creating a new project"
          />
        )}
      </Box>

      <Box>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Team Workload
        </Typography>

        {loading ? (
          <Grid container spacing={2}>
            {[1, 2, 3].map((i) => (
              <Grid item xs={12} key={i}>
                <Skeleton variant="rounded" height={80} />
              </Grid>
            ))}
          </Grid>
        ) : team.length > 0 ? (
          <Grid container spacing={2}>
            {team.map((member) => (
              <Grid item xs={12} sm={6} md={4} key={member.id}>
                <Card>
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {member.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.role}
                        </Typography>
                      </Box>
                      <StatusBadge
                        status={member.workload === 'low' ? 'completed' : member.workload === 'moderate' ? 'active' : member.workload === 'high' ? 'on_hold' : 'archived'}
                      />
                    </Box>

                    <Box sx={{ mb: 1.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Assigned Projects: {member.assignedProjects}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Box
                        sx={{
                          flex: 1,
                          height: 6,
                          borderRadius: 3,
                          bgcolor: 'action.hover',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${member.assignedProjects * 20}%`,
                            height: '100%',
                            borderRadius: 3,
                            bgcolor: `${getWorkloadColor(member.workload)}.main`,
                            transition: 'width 300ms ease-out',
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <EmptyState
            variant="no-data"
            icon={<GroupIcon />}
            title="No team members"
            description="Add team members to view workload"
          />
        )}
      </Box>
    </Box>
  )
}
