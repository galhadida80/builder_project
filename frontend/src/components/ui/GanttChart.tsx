import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GanttTask, GanttLink, GanttScale } from '../../types/timeline'
import { Box, Typography, Tooltip, styled } from '@/mui'

interface GanttChartProps {
  tasks: GanttTask[]
  links?: GanttLink[]
  scales?: GanttScale[]
  className?: string
  onTaskClick?: (task: GanttTask) => void
  onTaskDoubleClick?: (task: GanttTask) => void
}

const GanttContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  minHeight: 400,
  borderRadius: 8,
  overflow: 'auto',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}))

const ROW_HEIGHT = 36
const LABEL_WIDTH = 200
const DAY_WIDTH = 32

function parseDate(s: string): Date {
  return new Date(s + 'T00:00:00')
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getTaskColor(task: GanttTask): string {
  if (task.type === 'milestone') return '#F57C00'
  if (task.type === 'project') return '#1565C0'
  const progress = task.progress ?? 0
  if (progress >= 100) return '#2E7D32'
  if (progress > 0) return '#1976D2'
  return '#90A4AE'
}

export function GanttChart({
  tasks,
  links = [],
  scales,
  className,
  onTaskClick,
  onTaskDoubleClick,
}: GanttChartProps) {
  const { t } = useTranslation()
  void links
  void scales

  const { timelineStart, totalDays, months } = useMemo(() => {
    if (tasks.length === 0) return { timelineStart: new Date(), totalDays: 0, months: [] as { label: string; days: number }[] }

    let minDate = Infinity
    let maxDate = -Infinity
    for (const task of tasks) {
      const start = parseDate(task.start).getTime()
      if (start < minDate) minDate = start
      const endStr = task.end || task.start
      const end = parseDate(endStr).getTime()
      if (end > maxDate) maxDate = end
      if (task.duration && !task.end) {
        const durEnd = start + task.duration * 86400000
        if (durEnd > maxDate) maxDate = durEnd
      }
    }

    const pad = 3 * 86400000
    const tStart = new Date(minDate - pad)
    tStart.setHours(0, 0, 0, 0)
    const tEnd = new Date(maxDate + pad)
    const days = daysBetween(tStart, tEnd)

    const monthList: { label: string; days: number }[] = []
    const cursor = new Date(tStart)
    while (cursor < tEnd) {
      const monthLabel = cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      const monthStart = new Date(cursor)
      cursor.setMonth(cursor.getMonth() + 1)
      cursor.setDate(1)
      const monthEnd = cursor < tEnd ? cursor : tEnd
      const daysInMonth = daysBetween(monthStart, monthEnd)
      if (daysInMonth > 0) monthList.push({ label: monthLabel, days: daysInMonth })
    }

    return { timelineStart: tStart, totalDays: days, months: monthList }
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <GanttContainer className={className} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center', p: 3 }}>
          <Typography variant="h6" color="text.secondary">
            {t('gantt.noTasksAvailable')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('gantt.noTasksDescription')}
          </Typography>
        </Box>
      </GanttContainer>
    )
  }

  const chartWidth = totalDays * DAY_WIDTH

  return (
    <GanttContainer className={className}>
      {/* Month header */}
      <Box sx={{ display: 'flex', position: 'sticky', top: 0, zIndex: 2, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ minWidth: LABEL_WIDTH, maxWidth: LABEL_WIDTH, px: 1, py: 0.5, borderInlineEnd: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={600}>{t('gantt.task')}</Typography>
        </Box>
        <Box sx={{ display: 'flex' }}>
          {months.map((m, i) => (
            <Box key={i} sx={{ width: m.days * DAY_WIDTH, borderInlineEnd: '1px solid', borderColor: 'divider', px: 0.5, py: 0.5 }}>
              <Typography variant="caption" fontWeight={600} noWrap>{m.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Rows */}
      {tasks.map((task) => {
        const taskStart = parseDate(task.start)
        const taskEnd = task.end ? parseDate(task.end) : (task.duration ? new Date(taskStart.getTime() + task.duration * 86400000) : new Date(taskStart.getTime() + 86400000))
        const offsetDays = daysBetween(timelineStart, taskStart)
        const durationDays = Math.max(daysBetween(taskStart, taskEnd), 1)
        const left = offsetDays * DAY_WIDTH
        const width = durationDays * DAY_WIDTH
        const progress = task.progress ?? 0
        const isMilestone = task.type === 'milestone'
        const isProject = task.type === 'project'
        const color = getTaskColor(task)

        return (
          <Box
            key={task.id}
            sx={{
              display: 'flex',
              height: ROW_HEIGHT,
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            {/* Label column */}
            <Box sx={{
              minWidth: LABEL_WIDTH,
              maxWidth: LABEL_WIDTH,
              display: 'flex',
              alignItems: 'center',
              px: 1,
              borderInlineEnd: '1px solid',
              borderColor: 'divider',
              cursor: onTaskClick ? 'pointer' : 'default',
            }}
              onClick={() => onTaskClick?.(task)}
              onDoubleClick={() => onTaskDoubleClick?.(task)}
            >
              <Typography variant="caption" noWrap sx={{ fontWeight: isProject ? 700 : 400 }}>
                {task.text}
              </Typography>
            </Box>

            {/* Bar area */}
            <Box sx={{ position: 'relative', minWidth: chartWidth, height: '100%' }}>
              <Tooltip title={`${task.text} | ${formatDate(taskStart)} - ${formatDate(taskEnd)} | ${t('gantt.progressLabel')} ${progress}%`} arrow>
                {isMilestone ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: left + width / 2 - 6,
                      width: 12,
                      height: 12,
                      transform: 'translateY(-50%) rotate(45deg)',
                      bgcolor: color,
                      cursor: onTaskClick ? 'pointer' : 'default',
                    }}
                    onClick={() => onTaskClick?.(task)}
                    onDoubleClick={() => onTaskDoubleClick?.(task)}
                  />
                ) : (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: isProject ? 6 : 8,
                      left,
                      width: Math.max(width, 4),
                      height: isProject ? ROW_HEIGHT - 12 : ROW_HEIGHT - 16,
                      borderRadius: isProject ? 0.5 : 1,
                      bgcolor: `${color}33`,
                      border: `1px solid ${color}`,
                      overflow: 'hidden',
                      cursor: onTaskClick ? 'pointer' : 'default',
                    }}
                    onClick={() => onTaskClick?.(task)}
                    onDoubleClick={() => onTaskDoubleClick?.(task)}
                  >
                    {progress > 0 && (
                      <Box sx={{ height: '100%', width: `${Math.min(progress, 100)}%`, bgcolor: color, opacity: 0.7 }} />
                    )}
                  </Box>
                )}
              </Tooltip>
            </Box>
          </Box>
        )
      })}
    </GanttContainer>
  )
}
