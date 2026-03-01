import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/ui/EmptyState'
import { subcontractorsApi } from '@/api/subcontractors'
import type { Task } from '@/types'
import { useToast } from '@/components/common/ToastProvider'
import { AssignmentIcon } from '@/icons'
import { Box, Skeleton } from '@/mui'
import { TaskCard } from './TaskCard'
import { TaskFilters } from './TaskFilters'
import { TaskDateSection } from './TaskDateSection'

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
      <TaskFilters
        tasks={tasks}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        todayCount={todayCount}
        overdueCount={overdueCount}
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
              <TaskDateSection
                label={t('tasks.today')}
                count={grouped.today.length}
                tasks={grouped.today}
                renderCard={(task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />}
              />
            )}
            {grouped.thisWeek.length > 0 && (
              <TaskDateSection
                label={t('tasks.thisWeek')}
                count={grouped.thisWeek.length}
                tasks={grouped.thisWeek}
                renderCard={(task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />}
              />
            )}
            {grouped.later.length > 0 && (
              <TaskDateSection
                label={t('tasks.later')}
                count={grouped.later.length}
                tasks={grouped.later}
                renderCard={(task) => <TaskCard key={task.id} task={task} onClick={onTaskClick} />}
              />
            )}
          </>
        )}
      </Box>
    </Box>
  )
}
