import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GanttChart } from '../components/ui/GanttChart'
import { SegmentedTabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { meetingsApi } from '../api/meetings'
import { useToast } from '../components/common/ToastProvider'
import type { GanttTask, GanttLink, GanttScale } from '../types/timeline'
import type { Meeting } from '../types'
import { ZoomInIcon, ZoomOutIcon, TimelineIcon, ArrowBackIcon, CalendarTodayIcon } from '@/icons'
import { Box, Typography, IconButton, Skeleton, Chip, alpha } from '@/mui'

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
  const navigate = useNavigate()
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

  const scaleLabels = [
    t('gantt.zoomYearMonth', 'Year'),
    t('gantt.zoomMonthWeek', 'Month'),
    t('gantt.zoomMonthDay', 'Week'),
    t('gantt.zoomWeekDay', 'Day'),
  ]

  if (loading) return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rounded" height={40} sx={{ borderRadius: 2, mb: 2 }} />
      <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
    </Box>
  )

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden', pb: 10 }}>
      {/* Sticky header */}
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: 2, py: 1.5,
        borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700} letterSpacing="-0.02em">
            {t('gantt.title')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip
            icon={<CalendarTodayIcon sx={{ fontSize: 14 }} />}
            label={t('gantt.today', 'Today')}
            size="small"
            color="primary"
            sx={{ fontWeight: 700, fontSize: '0.65rem', height: 26 }}
          />
          <IconButton
            size="small"
            onClick={handleZoomOut}
            disabled={zoomLevel === 0}
            sx={{ bgcolor: 'action.hover' }}
          >
            <ZoomOutIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleZoomIn}
            disabled={zoomLevel === zoomLevels.length - 1}
            sx={{ bgcolor: 'action.hover' }}
          >
            <ZoomInIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Scale segmented tabs */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
        <SegmentedTabs
          items={scaleLabels.map((label, idx) => ({ label, value: String(idx) }))}
          value={String(zoomLevel)}
          onChange={(val) => setZoomLevel(Number(val))}
        />
      </Box>

      {/* Filter chips */}
      <Box sx={{ display: 'flex', gap: 0.75, px: 2, pb: 1.5, overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' } }}>
        {[
          { label: `${t('gantt.allTasks')} (${tasks.length})`, value: 'all' },
          { label: `${t('gantt.inProgress')} (${inProgressCount})`, value: 'in-progress' },
          { label: `${t('common.completed')} (${completedCount})`, value: 'completed' },
          { label: t('gantt.milestonesOnly'), value: 'milestones' },
        ].map(f => (
          <Chip
            key={f.value}
            label={f.label}
            size="small"
            onClick={() => setFilterValue(f.value)}
            sx={{
              fontWeight: 600, fontSize: '0.65rem', flexShrink: 0,
              bgcolor: filterValue === f.value ? 'primary.main' : 'action.hover',
              color: filterValue === f.value ? 'primary.contrastText' : 'text.primary',
              '&:hover': { bgcolor: filterValue === f.value ? 'primary.dark' : 'action.selected' },
            }}
          />
        ))}
      </Box>

      {/* Gantt chart */}
      <Box sx={{
        mx: 2, borderRadius: 3, overflow: 'hidden',
        border: 1, borderColor: 'divider', bgcolor: 'background.paper',
      }}>
        <Box sx={{ minHeight: 350, height: { xs: 'calc(100dvh - 340px)', md: 'calc(100dvh - 300px)' } }}>
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
      </Box>

      {/* Bottom progress summary */}
      {tasks.length > 0 && (
        <Box sx={{
          mx: 2, mt: 2, p: 2, borderRadius: 3,
          border: 1, borderColor: 'divider', bgcolor: 'background.paper',
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {tasks.length} {t('gantt.task')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{completedCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{inProgressCount}</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={500}>{tasks.length - completedCount - inProgressCount}</Typography>
              </Box>
            </Box>
          </Box>
          <Box sx={{ height: 6, bgcolor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{
              height: '100%', borderRadius: 3, width: `${overallProgress}%`,
              bgcolor: 'primary.main', transition: 'width 300ms',
            }} />
          </Box>
        </Box>
      )}
    </Box>
  )
}
