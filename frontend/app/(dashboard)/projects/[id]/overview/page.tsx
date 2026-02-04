import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Grid from '@mui/material/Grid'
import { Card } from '../../../../../src/components/ui/Card'
import { EmptyState } from '../../../../../src/components/ui/EmptyState'
import { ProjectProgressRing } from '../../../../../components/ProjectProgressRing'
import { ProjectTimeline, TimelineEvent } from '../../../../../components/ProjectTimeline'
import { ProjectOverviewTabs } from '../../../../../components/ProjectOverviewTabs'
import { apiClient } from '../../../../../src/api/client'
import { useToast } from '../../../../../src/components/common/ToastProvider'

interface ProgressMetrics {
  completion_percentage: number
  total_items: number
  completed_items: number
  in_progress_items: number
  pending_items: number
}

interface TeamStats {
  total_members: number
  members_by_role: Record<string, number>
}

interface ProjectStats {
  days_remaining: number
  days_elapsed: number
  open_findings: number
  recent_activity_count: number
}

interface ProjectOverviewData {
  progress: ProgressMetrics
  timeline: TimelineEvent[]
  team_stats: TeamStats
  project_stats: ProjectStats
}

export default function ProjectOverviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [overviewData, setOverviewData] = useState<ProjectOverviewData | null>(null)
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    loadOverviewData()
  }, [projectId])

  const loadOverviewData = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const response = await apiClient.get(`/projects/${projectId}/overview`)
      setOverviewData(response.data)
    } catch (error) {
      showError('Failed to load project overview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
          title="Overview not available"
          description="Unable to load project overview data"
          action={{ label: 'Back to Project', onClick: () => navigate(`/projects/${projectId}`) }}
        />
      </Box>
    )
  }

  const { progress, timeline, team_stats, project_stats } = overviewData

  const summaryContent = (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Project Progress
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <ProjectProgressRing
                value={progress.completion_percentage}
                label="Overall Completion"
                size={160}
                color="primary"
                showPercentage
                subtitle={`${progress.completed_items} of ${progress.total_items} items completed`}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mt: 3 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="success.main">
                  {progress.completed_items}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Completed
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="info.main">
                  {progress.in_progress_items}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  In Progress
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h5" fontWeight={700} color="warning.main">
                  {progress.pending_items}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pending
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
              Project Stats
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Timeline
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h4" fontWeight={700}>
                    {project_stats.days_elapsed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    days elapsed
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main">
                    {project_stats.days_remaining}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    days remaining
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Activity & Findings
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h4" fontWeight={700}>
                    {project_stats.recent_activity_count}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    recent activities
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                  <Typography
                    variant="h4"
                    fontWeight={700}
                    color={project_stats.open_findings > 0 ? 'error.main' : 'success.main'}
                  >
                    {project_stats.open_findings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    open findings
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
          Recent Activity
        </Typography>
        <ProjectTimeline events={timeline} maxEvents={20} emptyMessage="No recent activity" />
      </Box>
    </Card>
  )

  const teamContent = (
    <Card>
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
          Team Overview
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="body1" color="text.secondary">
              Total Team Members
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {team_stats.total_members}
            </Typography>
          </Box>

          {Object.entries(team_stats.members_by_role).map(([role, count]) => (
            <Box
              key={role}
              sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}
            >
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                {role.replace('_', ' ')}
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
          Detailed Statistics
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Completion Rate
              </Typography>
              <Typography variant="h3" fontWeight={700} color="primary.main">
                {Math.round(progress.completion_percentage)}%
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Total Items
              </Typography>
              <Typography variant="h3" fontWeight={700}>
                {progress.total_items}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Items Completed
              </Typography>
              <Typography variant="h3" fontWeight={700} color="success.main">
                {progress.completed_items}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Items Pending
              </Typography>
              <Typography variant="h3" fontWeight={700} color="warning.main">
                {progress.pending_items}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Card>
  )

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          Project Overview
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your project progress, timeline, and team activity
        </Typography>
      </Box>

      <ProjectOverviewTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        summaryContent={summaryContent}
        timelineContent={timelineContent}
        teamContent={teamContent}
        statsContent={statsContent}
      />
    </Box>
  )
}
