import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { GanttChart } from '../components/ui/GanttChart'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { meetingsApi } from '../api/meetings'
import { useToast } from '../components/common/ToastProvider'
import type { GanttTask, GanttLink, GanttScale } from '../types/timeline'
import type { Meeting } from '../types'
import { ZoomInIcon, ZoomOutIcon, TimelineIcon } from '@/icons'
import { Box, Typography, IconButton, Skeleton } from '@/mui'

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const convertMeetingsToTasks = (meetings: Meeting[]): { tasks: GanttTask[], links: GanttLink[] } => {
  const tasks: GanttTask[] = meetings.map(meeting => {
    const startDate = meeting.scheduledDate?.split('T')[0] || new Date().toISOString().split('T')[0]
    const isMilestone = (meeting.meetingType as string) === 'milestone'
    return {
      id: meeting.id,
      text: meeting.title,
      start: startDate,
      end: isMilestone ? startDate : addDays(startDate, 1),
      type: isMilestone ? 'milestone' : 'task',
      progress: meeting.status === 'completed' ? 100 : (meeting.status as string) === 'in_progress' ? 50 : 0,
    }
  })

  return { tasks, links: [] }
}

const zoomLevels: Array<{ labelKey: string; scales: GanttScale[] }> = [
  {
    labelKey: 'gantt.zoomYearMonth',
    scales: [
      { unit: 'year', format: 'YYYY' },
      { unit: 'month', format: 'MMM' },
    ],
  },
  {
    labelKey: 'gantt.zoomMonthWeek',
    scales: [
      { unit: 'month', format: 'MMM YYYY' },
      { unit: 'week', format: 'w' },
    ],
  },
  {
    labelKey: 'gantt.zoomMonthDay',
    scales: [
      { unit: 'month', format: 'MMM YYYY' },
      { unit: 'day', format: 'D' },
    ],
  },
  {
    labelKey: 'gantt.zoomWeekDay',
    scales: [
      { unit: 'week', format: 'MMM D' },
      { unit: 'day', format: 'ddd D' },
    ],
  },
]

export default function GanttTimelinePage() {
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const { showError } = useToast()
  const [zoomLevel, setZoomLevel] = useState(2)
  const [filterValue, setFilterValue] = useState('all')
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<GanttTask[]>([])
  const [links, setLinks] = useState<GanttLink[]>([])

  useEffect(() => {
    if (projectId) {
      loadTimelineData()
    } else {
      setLoading(false)
    }
  }, [projectId])

  const loadTimelineData = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const meetings = await meetingsApi.list(projectId)
      const { tasks: meetingTasks, links: meetingLinks } = convertMeetingsToTasks(meetings)
      setTasks(meetingTasks)
      setLinks(meetingLinks)
    } catch (error) {
      console.error('Failed to load timeline data:', error)
      showError(t('gantt.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  if (!projectId) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <EmptyState
          variant="not-found"
          title={t('gantt.projectNotFound')}
          description={t('gantt.selectProject')}
        />
      </Box>
    )
  }

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 1, zoomLevels.length - 1))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 1, 0))

  const currentScales = zoomLevels[zoomLevel].scales

  const filteredTasks = filterValue === 'all' ? tasks : tasks.filter(task => {
    if (filterValue === 'in-progress') return (task.progress ?? 0) > 0 && (task.progress ?? 0) < 100
    if (filterValue === 'completed') return (task.progress ?? 0) === 100
    if (filterValue === 'milestones') return task.type === 'milestone'
    return true
  })

  const completedCount = tasks.filter(tk => (tk.progress ?? 0) === 100).length
  const inProgressCount = tasks.filter(tk => (tk.progress ?? 0) > 0 && (tk.progress ?? 0) < 100).length
  const overallProgress = tasks.length > 0 ? Math.round(tasks.reduce((sum, tk) => sum + (tk.progress ?? 0), 0) / tasks.length) : 0

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rounded" height={400} sx={{ borderRadius: 2 }} />
    </Box>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('gantt.title')}
        subtitle={t('gantt.subtitle')}
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={handleZoomOut}
              disabled={zoomLevel === 0}
              sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
            >
              <ZoomOutIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleZoomIn}
              disabled={zoomLevel === zoomLevels.length - 1}
              sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
            >
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      />

      <Tabs
        items={[
          { label: t('gantt.allTasks'), value: 'all', badge: tasks.length },
          { label: t('gantt.inProgress'), value: 'in-progress', badge: inProgressCount },
          { label: t('common.completed'), value: 'completed', badge: completedCount },
          { label: t('gantt.milestonesOnly'), value: 'milestones' },
        ]}
        value={filterValue}
        onChange={setFilterValue}
        size="small"
      />

      <Card sx={{ mt: 1.5 }}>
        <Box sx={{ p: 0, minHeight: 350, height: { xs: 'calc(100dvh - 360px)', md: 'calc(100dvh - 320px)' } }}>
          {filteredTasks.length > 0 ? (
            <GanttChart tasks={filteredTasks} links={links} scales={currentScales} />
          ) : (
            <Box sx={{ p: 4 }}>
              <EmptyState
                icon={<TimelineIcon sx={{ fontSize: 48 }} />}
                title={t('gantt.noData')}
                description={t('gantt.noDataDescription')}
              />
            </Box>
          )}
        </Box>
      </Card>

      {tasks.length > 0 && (
        <Card sx={{ mt: 1.5, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {tasks.length} {t('gantt.task')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'success.main' }} />
                <Typography variant="caption" color="text.secondary">{completedCount} {t('common.completed')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary">{inProgressCount} {t('gantt.inProgress')}</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ height: 6, bgcolor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ height: '100%', bgcolor: 'primary.main', borderRadius: 3, width: `${overallProgress}%`, transition: 'width 300ms' }} />
          </Box>
        </Card>
      )}
    </Box>
  )
}
