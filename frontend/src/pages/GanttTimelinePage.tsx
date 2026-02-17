import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { GanttChart } from '../components/ui/GanttChart'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { meetingsApi } from '../api/meetings'
import { useToast } from '../components/common/ToastProvider'
import type { GanttTask, GanttLink, GanttScale } from '../types/timeline'
import type { Meeting } from '../types'
import { ZoomInIcon, ZoomOutIcon, FilterListIcon, TimelineIcon } from '@/icons'
import { Box, Typography, IconButton, MenuItem, Select, FormControl, Skeleton } from '@/mui'

const convertMeetingsToTasks = (meetings: Meeting[]): { tasks: GanttTask[], links: GanttLink[] } => {
  const tasks: GanttTask[] = meetings.map(meeting => ({
    id: meeting.id,
    text: meeting.title,
    start: meeting.scheduledDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    end: meeting.scheduledDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    type: (meeting.meetingType as string) === 'milestone' ? 'milestone' : 'task',
    progress: meeting.status === 'completed' ? 100 : (meeting.status as string) === 'in_progress' ? 50 : 0,
  }))

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
      <Box sx={{ p: 3 }}>
        <EmptyState
          variant="not-found"
          title={t('gantt.projectNotFound')}
          description={t('gantt.selectProject')}
        />
      </Box>
    )
  }

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 1, zoomLevels.length - 1))
  }

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 1, 0))
  }

  const currentScales = zoomLevels[zoomLevel].scales

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={600} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t('gantt.title')}
        subtitle={t('gantt.subtitle')}
      />

      <Card sx={{ mt: 3 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight={600}>
              {t('gantt.constructionSchedule')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                  {t('gantt.zoom')}:
                </Typography>
                <IconButton
                  size="small"
                  aria-label={t('gantt.zoomOut')}
                  onClick={handleZoomOut}
                  disabled={zoomLevel === 0}
                  title={t('gantt.zoomOut')}
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    '&:disabled': { opacity: 0.5 },
                  }}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  aria-label={t('gantt.zoomIn')}
                  onClick={handleZoomIn}
                  disabled={zoomLevel === zoomLevels.length - 1}
                  title={t('gantt.zoomIn')}
                  sx={{
                    bgcolor: 'action.hover',
                    '&:hover': { bgcolor: 'action.selected' },
                    '&:disabled': { opacity: 0.5 },
                  }}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Box>

              <FormControl size="small" sx={{ minWidth: 150 }}>
                <Select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  startAdornment={<FilterListIcon sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />}
                  sx={{ fontSize: '0.875rem' }}
                >
                  <MenuItem value="all">{t('gantt.allTasks')}</MenuItem>
                  <MenuItem value="in-progress">{t('gantt.inProgress')}</MenuItem>
                  <MenuItem value="completed">{t('common.completed')}</MenuItem>
                  <MenuItem value="milestones">{t('gantt.milestonesOnly')}</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>

        <Box sx={{ p: 0, minHeight: 400, height: 'calc(100dvh - 320px)' }}>
          {tasks.length > 0 ? (
            <GanttChart tasks={tasks} links={links} scales={currentScales} />
          ) : (
            <Box sx={{ p: 4 }}>
              <EmptyState
                icon={<TimelineIcon sx={{ fontSize: 64 }} />}
                title={t('gantt.noData')}
                description={t('gantt.noDataDescription')}
              />
            </Box>
          )}
        </Box>
      </Card>

      {tasks.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 3, px: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 12,
                bgcolor: 'primary.main',
                borderRadius: 0.5,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {t('gantt.task')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                bgcolor: 'warning.main',
                transform: 'rotate(45deg)',
                border: '2px solid',
                borderColor: 'warning.dark',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {t('gantt.milestone')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 20,
                height: 12,
                bgcolor: 'success.main',
                borderRadius: 0.5,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {t('common.completed')}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}
