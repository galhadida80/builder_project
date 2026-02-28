import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { scheduleRiskApi } from '../../api/scheduleRisk'
import type { CriticalPathResponse, CriticalPathTask } from '../../types/scheduleRisk'
import { useToast } from '../common/ToastProvider'
import { TimelineIcon, AccountTreeIcon, AccessTimeIcon, ArrowForwardIcon } from '@/icons'
import { Box, Typography, Skeleton, List, ListItem, alpha } from '@/mui'

interface CriticalPathViewProps {
  projectId?: string
}

const statCardStyle = {
  bgcolor: 'background.paper',
  borderRadius: 2,
  border: 1,
  borderColor: 'divider',
  p: { xs: 1.25, sm: 1.5, md: 2 },
}

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) => (
  <Box sx={statCardStyle}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
      {icon}
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
        {label}
      </Typography>
    </Box>
    <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main', lineHeight: 1.2, fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.625rem' } }}>
      {value}
    </Typography>
  </Box>
)

const TaskItem = ({ task, index, formatDate, formatDuration, t }: {
  task: CriticalPathTask
  index: number
  formatDate: (dateStr?: string) => string
  formatDuration: (days: number) => string
  t: (key: string, fallback?: string) => string
}) => (
  <ListItem
    sx={{
      borderRadius: 2,
      mb: 1,
      bgcolor: (theme) => alpha(theme.palette.background.default, 0.4),
      border: 1,
      borderColor: 'divider',
      p: { xs: 1.5, sm: 2 },
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 1,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 600, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {task.taskTitle}
        </Typography>
      </Box>
      <Box
        sx={{
          bgcolor: (theme) => alpha(theme.palette.warning.main, 0.15),
          color: 'warning.main',
          px: 1.5,
          py: 0.5,
          borderRadius: 1,
          fontSize: { xs: '0.7rem', sm: '0.75rem' },
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {formatDuration(task.durationDays)}
      </Box>
    </Box>

    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5, mt: 0.5 }}>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('scheduleRisk.criticalPath.taskStart', 'Start Date')}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          {formatDate(task.startDate)}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('scheduleRisk.criticalPath.taskEnd', 'End Date')}
        </Typography>
        <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          {formatDate(task.dueDate)}
        </Typography>
      </Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {t('scheduleRisk.criticalPath.slack', 'Slack')}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontSize: { xs: '0.75rem', sm: '0.875rem' },
            color: task.slackDays === 0 ? 'error.main' : 'success.main',
            fontWeight: task.slackDays === 0 ? 600 : 400,
          }}
        >
          {task.slackDays === 0 ? t('scheduleRisk.criticalPath.noSlack', 'No slack') : formatDuration(task.slackDays)}
        </Typography>
      </Box>
    </Box>
  </ListItem>
)

export function CriticalPathView({ projectId: propProjectId }: CriticalPathViewProps) {
  const { t } = useTranslation()
  const params = useParams()
  const { showError } = useToast()
  const projectId = propProjectId || params.projectId

  const [loading, setLoading] = useState(true)
  const [criticalPath, setCriticalPath] = useState<CriticalPathResponse | null>(null)

  useEffect(() => {
    if (projectId) loadCriticalPath()
  }, [projectId])

  const loadCriticalPath = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await scheduleRiskApi.getCriticalPath(projectId)
      setCriticalPath(data)
    } catch {
      showError(t('scheduleRisk.criticalPath.loadFailed', 'Failed to load critical path analysis'))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatDuration = (days: number) => {
    if (days === 1) return t('scheduleRisk.criticalPath.oneDay', '1 day')
    return t('scheduleRisk.criticalPath.daysCount', { count: days }, `${days} days`)
  }

  if (loading) {
    return (
      <Card sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton width={200} height={28} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
          <Skeleton variant="rounded" height={80} />
          <Skeleton variant="rounded" height={80} />
        </Box>
        <Skeleton variant="rounded" height={300} />
      </Card>
    )
  }

  if (!criticalPath || criticalPath.criticalPathTasks.length === 0) {
    return (
      <Card sx={{ p: 3 }}>
        <EmptyState
          icon={<AccountTreeIcon sx={{ fontSize: 48, color: 'text.disabled' }} />}
          title={t('scheduleRisk.criticalPath.noDataTitle', 'No Critical Path Available')}
          description={t('scheduleRisk.criticalPath.noDataDescription', 'Critical path analysis will appear here once tasks with dependencies are created')}
        />
      </Card>
    )
  }

  return (
    <Card sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <AccountTreeIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 } }} />
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          {t('scheduleRisk.criticalPath.title', 'Critical Path Analysis')}
        </Typography>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <StatCard
          icon={<AccessTimeIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: 'text.secondary' }} />}
          label={t('scheduleRisk.criticalPath.totalDuration', 'Total Duration')}
          value={formatDuration(criticalPath.totalDurationDays)}
        />
        <StatCard
          icon={<TimelineIcon sx={{ fontSize: { xs: 16, sm: 18 }, color: 'text.secondary' }} />}
          label={t('scheduleRisk.criticalPath.tasksCount', 'Critical Tasks')}
          value={criticalPath.criticalPathTasks.length}
        />
      </Box>

      {(criticalPath.projectStartDate || criticalPath.projectEndDate) && (
        <Box sx={{ mb: 3, p: 2, bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
            {t('scheduleRisk.criticalPath.projectTimeline', 'Project Timeline')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {t('scheduleRisk.criticalPath.startDate', 'Start')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatDate(criticalPath.projectStartDate)}
              </Typography>
            </Box>
            <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 16 }} />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {t('scheduleRisk.criticalPath.endDate', 'End')}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {formatDate(criticalPath.projectEndDate)}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {t('scheduleRisk.criticalPath.tasksInPath', 'Tasks in Critical Path')}
        </Typography>
        <List sx={{ p: 0 }}>
          {criticalPath.criticalPathTasks.map((task, index) => (
            <Box key={task.taskId}>
              <TaskItem task={task} index={index} formatDate={formatDate} formatDuration={formatDuration} t={t} />
              {index < criticalPath.criticalPathTasks.length - 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 0.5 }}>
                  <ArrowForwardIcon sx={{ color: 'primary.main', fontSize: { xs: 20, sm: 24 }, transform: 'rotate(90deg)' }} />
                </Box>
              )}
            </Box>
          ))}
        </List>
      </Box>

      <Box sx={{ mt: 3, p: 2, bgcolor: (theme) => alpha(theme.palette.info.main, 0.05), borderRadius: 2, border: 1, borderColor: 'divider' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.5 }}>
          {t('scheduleRisk.criticalPath.infoNote', 'Critical path tasks have zero slack time. Any delay in these tasks will directly impact the project completion date.')}
        </Typography>
      </Box>
    </Card>
  )
}
