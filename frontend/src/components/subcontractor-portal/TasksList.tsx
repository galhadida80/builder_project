import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '@/utils/dateLocale'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/TextField'
import { subcontractorsApi } from '@/api/subcontractors'
import type { Task } from '@/types'
import { useToast } from '@/components/common/ToastProvider'
import {
  CheckCircleIcon, WarningIcon, AccessTimeIcon, AssignmentIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip,
} from '@/mui'

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#F1F5F9', text: '#64748B' },
  medium: { bg: '#DBEAFE', text: '#2563EB' },
  high: { bg: '#FFEDD5', text: '#EA580C' },
  urgent: { bg: '#FEE2E2', text: '#DC2626' },
}

function isToday(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isThisWeek(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 7)
  return d >= startOfWeek && d < endOfWeek && !isToday(dateStr)
}

function isOverdue(task: Task) {
  return task.dueDate && task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date()
}

function groupTasksByDate(taskList: Task[]) {
  const today: Task[] = []
  const thisWeek: Task[] = []
  const later: Task[] = []
  for (const task of taskList) {
    if (task.dueDate && isToday(task.dueDate)) today.push(task)
    else if (task.dueDate && isThisWeek(task.dueDate)) thisWeek.push(task)
    else later.push(task)
  }
  return { today, thisWeek, later }
}

interface TasksListProps {
  onTaskClick?: (task: Task) => void
}

export function TasksList({ onTaskClick }: TasksListProps) {
  const { t } = useTranslation()
  const { showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const taskList = await subcontractorsApi.getMyTasks()
      setTasks(taskList)
    } catch {
      showError(t('tasks.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const todayCount = tasks.filter(tk => tk.dueDate && isToday(tk.dueDate) && tk.status !== 'completed' && tk.status !== 'cancelled').length
  const overdueCount = tasks.filter(tk => isOverdue(tk)).length

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'overdue' && !isOverdue(task)) return false
    else if (activeTab === 'today' && !(task.dueDate && isToday(task.dueDate))) return false
    else if (activeTab !== 'all' && activeTab !== 'overdue' && activeTab !== 'today' && task.status !== activeTab) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return task.title.toLowerCase().includes(q) || String(task.taskNumber).includes(q)
    }
    return true
  })

  const grouped = groupTasksByDate(filteredTasks)

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs
        items={[
          { label: t('common.all'), value: 'all', badge: tasks.length },
          { label: t('tasks.today'), value: 'today', badge: todayCount },
          { label: t('tasks.overdue'), value: 'overdue', badge: overdueCount },
          { label: t('tasks.statuses.in_progress'), value: 'in_progress', badge: tasks.filter(tk => tk.status === 'in_progress').length },
          { label: t('tasks.statuses.completed'), value: 'completed', badge: tasks.filter(tk => tk.status === 'completed').length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        size="small"
      />

      <SearchField
        placeholder={t('tasks.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filteredTasks.length === 0 ? (
          <EmptyState
            title={t('tasks.noTasks')}
            description={t('tasks.noTasksDescription')}
            icon={<AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
          />
        ) : (
          <>
            {grouped.today.length > 0 && (
              <TaskGroup
                label={t('tasks.today')}
                count={grouped.today.length}
                tasks={grouped.today}
                renderCard={(task) => <TaskCard key={task.id} task={task} t={t} onClick={onTaskClick} />}
              />
            )}
            {grouped.thisWeek.length > 0 && (
              <TaskGroup
                label={t('tasks.thisWeek')}
                count={grouped.thisWeek.length}
                tasks={grouped.thisWeek}
                renderCard={(task) => <TaskCard key={task.id} task={task} t={t} onClick={onTaskClick} />}
              />
            )}
            {grouped.later.length > 0 && (
              <TaskGroup
                label={t('tasks.later')}
                count={grouped.later.length}
                tasks={grouped.later}
                renderCard={(task) => <TaskCard key={task.id} task={task} t={t} onClick={onTaskClick} />}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

function TaskCard({ task, t, onClick }: { task: Task; t: (k: string, o?: Record<string, unknown>) => string; onClick?: (task: Task) => void }) {
  const c = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low
  const overdue = isOverdue(task)
  const isComplete = task.status === 'completed'
  const borderColor = overdue ? '#DC2626' : task.priority === 'urgent' ? '#DC2626' : task.priority === 'high' ? '#e07842' : task.priority === 'medium' ? '#2563EB' : '#64748B'
  const dueTime = task.dueDate ? new Date(task.dueDate).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <Card
      hoverable
      onClick={() => onClick?.(task)}
      sx={{
        borderInlineStart: '4px solid',
        borderInlineStartColor: borderColor,
        opacity: isComplete ? 0.6 : 1,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              flexShrink: 0,
              mt: 0.25,
              border: '2px solid',
              borderColor: isComplete ? 'success.main' : 'divider',
              bgcolor: isComplete ? 'success.main' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isComplete && <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                lineHeight: 1.3,
                mb: 0.75,
                ...(isComplete && { textDecoration: 'line-through', color: 'text.disabled' }),
              }}
            >
              {task.title}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1, fontSize: '0.65rem' }}>
              <Chip
                label={`#${task.taskNumber}`}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.text }} />
                <Typography variant="caption" sx={{ color: c.text, fontWeight: 700, fontSize: '0.65rem' }}>
                  {t(`tasks.priorities.${task.priority}`, { defaultValue: task.priority })}
                </Typography>
              </Box>
              {task.dueDate && (
                <Typography
                  variant="caption"
                  sx={{
                    color: overdue ? 'error.main' : 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                  }}
                >
                  {overdue && <WarningIcon sx={{ fontSize: 12 }} />}
                  <AccessTimeIcon sx={{ fontSize: 12 }} />
                  {isToday(task.dueDate) && dueTime ? `${t('tasks.today')} ${dueTime}` : new Date(task.dueDate).toLocaleDateString(getDateLocale())}
                </Typography>
              )}
            </Box>
            {task.description && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  display: 'block',
                  mb: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {task.description}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {task.assignee ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      bgcolor: 'action.hover',
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.55rem',
                      fontWeight: 700,
                    }}
                  >
                    {task.assignee.fullName?.charAt(0) || '?'}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {task.assignee.fullName}
                  </Typography>
                </Box>
              ) : <Box />}
              <Chip
                label={t(`tasks.statuses.${task.status}`, { defaultValue: task.status })}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: isComplete ? 'success.light' : 'action.hover',
                  color: isComplete ? 'success.dark' : 'text.secondary',
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Card>
  )
}

function TaskGroup({ label, count, tasks, renderCard }: { label: string; count: number; tasks: Task[]; renderCard: (task: Task) => React.ReactNode }) {
  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {label}
        </Typography>
        <Box
          sx={{
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
            borderRadius: '50%',
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
          }}
        >
          {count}
        </Box>
      </Box>
      {tasks.map(renderCard)}
    </>
  )
}
