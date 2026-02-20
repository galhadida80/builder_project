import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import { tasksApi, TaskCreateData } from '../api/tasks'
import { projectsApi } from '../api/projects'
import type { Task, TaskSummary, ProjectMember } from '../types'
import { useToast } from '../components/common/ToastProvider'
import {
  AddIcon, CheckCircleIcon, WarningIcon, EditIcon, DeleteIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip, MenuItem,
  TextField as MuiTextField, Autocomplete, IconButton,
} from '@/mui'

const STATUS_OPTIONS = ['not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'] as const
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'] as const

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#F1F5F9', text: '#64748B' },
  medium: { bg: '#DBEAFE', text: '#2563EB' },
  high: { bg: '#FFEDD5', text: '#EA580C' },
  urgent: { bg: '#FEE2E2', text: '#DC2626' },
}

export default function TasksPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()

  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deleteTask, setDeleteTask] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const EMPTY_FORM: TaskCreateData = { title: '', priority: 'medium' }
  const [form, setForm] = useState<TaskCreateData>(EMPTY_FORM)
  const [titleTouched, setTitleTouched] = useState(false)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [taskList, taskSummary, project] = await Promise.all([
        tasksApi.list(projectId),
        tasksApi.getSummary(projectId),
        projectsApi.get(projectId).catch(() => null),
      ])
      setTasks(taskList)
      setSummary(taskSummary)
      setMembers(project?.members || [])
    } catch {
      showError(t('tasks.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingTask(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee_id: task.assigneeId,
      start_date: task.startDate?.slice(0, 10),
      due_date: task.dueDate?.slice(0, 10),
      estimated_hours: task.estimatedHours,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!projectId || !form.title) return
    setSubmitting(true)
    try {
      if (editingTask) {
        await tasksApi.update(projectId, editingTask.id, form)
        showSuccess(t('tasks.updateSuccess'))
      } else {
        await tasksApi.create(projectId, form)
        showSuccess(t('tasks.createSuccess'))
      }
      setDialogOpen(false)
      setForm(EMPTY_FORM)
      setEditingTask(null)
      loadData()
    } catch {
      showError(editingTask ? t('tasks.updateFailed') : t('tasks.createFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!projectId || !deleteTask) return
    setDeleting(true)
    try {
      await withMinDuration(tasksApi.delete(projectId, deleteTask.id))
      showSuccess(t('tasks.deleteSuccess'))
      setDeleteTask(null)
      loadData()
    } catch {
      showError(t('tasks.deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'overdue' && !isOverdue(task)) return false
    else if (activeTab !== 'all' && activeTab !== 'overdue' && task.status !== activeTab) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        task.title.toLowerCase().includes(q) ||
        String(task.taskNumber).includes(q) ||
        task.assignee?.fullName?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const isOverdue = (task: Task) =>
    task.dueDate && task.status !== 'completed' && task.status !== 'cancelled' && new Date(task.dueDate) < new Date()

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={250} height={24} sx={{ mb: 4 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
      </Box>
      <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
    </Box>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('tasks.pageTitle')}
        subtitle={t('tasks.pageSubtitle')}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={openCreateDialog}>
            {t('tasks.createTask')}
          </Button>
        }
      />

      {summary && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, overflowX: 'auto', pb: 0.5 }}>
          <Box sx={{ flex: 1, minWidth: 100, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography variant="caption" color="text.secondary">{t('tasks.total')}</Typography>
            <Typography variant="h5" fontWeight={700}>{summary.total}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
            <Typography variant="caption" color="primary.main">{t('tasks.inProgress')}</Typography>
            <Typography variant="h5" fontWeight={700} color="primary.main">{summary.inProgressCount}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 100, bgcolor: 'error.light', border: '1px solid', borderColor: 'error.main', borderRadius: 2, p: 2, opacity: 0.9 }}>
            <Typography variant="caption" color="error.main">{t('tasks.overdue')}</Typography>
            <Typography variant="h5" fontWeight={700} color="error.main">{summary.overdueCount}</Typography>
          </Box>
        </Box>
      )}

      <Tabs
        items={[
          { label: t('common.all'), value: 'all', badge: tasks.length },
          { label: t('tasks.inProgress'), value: 'in_progress', badge: tasks.filter(tk => tk.status === 'in_progress').length },
          { label: t('tasks.overdue'), value: 'overdue', badge: tasks.filter(tk => isOverdue(tk)).length },
          { label: t('tasks.completed'), value: 'completed', badge: tasks.filter(tk => tk.status === 'completed').length },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        size="small"
      />

      <Box sx={{ mt: 1.5, mb: 2 }}>
        <SearchField placeholder={t('tasks.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filteredTasks.length === 0 ? (
          <EmptyState title={t('tasks.noTasks')} description={t('tasks.noTasksDescription')} />
        ) : (
          filteredTasks.map((task) => {
            const c = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low
            const overdue = isOverdue(task)
            const isComplete = task.status === 'completed'
            const borderColor = task.priority === 'urgent' ? '#DC2626' : task.priority === 'high' ? '#f28c26' : task.priority === 'medium' ? '#2563EB' : '#64748B'

            return (
              <Card key={task.id} hoverable onClick={() => openEditDialog(task)}
                sx={{ borderInlineStart: '4px solid', borderInlineStartColor: borderColor, opacity: isComplete ? 0.6 : 1 }}
              >
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 24, height: 24, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                        border: '2px solid',
                        borderColor: isComplete ? 'success.main' : 'divider',
                        bgcolor: isComplete ? 'success.main' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {isComplete && <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.75, ...(isComplete && { textDecoration: 'line-through', color: 'text.disabled' }) }}>
                        {task.title}
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1, fontSize: '0.65rem' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.text }} />
                          <Typography variant="caption" sx={{ color: c.text, fontWeight: 700, fontSize: '0.65rem' }}>
                            {t(`tasks.priorities.${task.priority}`, { defaultValue: task.priority })}
                          </Typography>
                        </Box>
                        {task.dueDate && (
                          <Typography variant="caption" sx={{ color: overdue ? 'error.main' : 'primary.main', fontWeight: 500, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                            <WarningIcon sx={{ fontSize: 12, display: overdue ? 'inline' : 'none' }} />
                            {new Date(task.dueDate).toLocaleDateString(getDateLocale())}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {task.assignee ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700 }}>
                              {task.assignee.fullName?.charAt(0) || '?'}
                            </Box>
                            <Typography variant="caption" color="text.secondary">{task.assignee.fullName}</Typography>
                          </Box>
                        ) : <Box />}
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEditDialog(task) }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteTask(task) }}><DeleteIcon sx={{ fontSize: 16 }} color="error" /></IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Card>
            )
          })
        )}
      </Box>

      <FormModal
        open={dialogOpen}
        onClose={() => { if (!submitting) { setDialogOpen(false); setForm(EMPTY_FORM); setEditingTask(null); setTitleTouched(false) } }}
        onSubmit={handleSubmit}
        title={editingTask ? t('tasks.editTask') : t('tasks.createTask')}
        submitLabel={editingTask ? t('common.save') : t('tasks.create')}
        submitDisabled={!form.title}
        loading={submitting}
        maxWidth="sm"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField fullWidth label={t('tasks.title')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} onBlur={() => setTitleTouched(true)} required error={titleTouched && !form.title.trim()} helperText={titleTouched && !form.title.trim() ? t('validation.fieldRequired') : undefined} />
          <TextField fullWidth label={t('tasks.description')} multiline rows={3} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value || undefined })} />
          <MuiTextField select fullWidth label={t('tasks.priority')} value={form.priority || 'medium'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            {PRIORITY_OPTIONS.map((p) => <MenuItem key={p} value={p}>{t(`tasks.priorities.${p}`, { defaultValue: p })}</MenuItem>)}
          </MuiTextField>
          {editingTask && (
            <MuiTextField select fullWidth label={t('common.status')} value={(form as TaskCreateData & { status?: string }).status || editingTask.status} onChange={(e) => setForm({ ...form, status: e.target.value } as TaskCreateData & { status?: string })}>
              {STATUS_OPTIONS.map((s) => <MenuItem key={s} value={s}>{t(`tasks.statuses.${s}`, { defaultValue: s })}</MenuItem>)}
            </MuiTextField>
          )}
          {members.length > 0 && (
            <Autocomplete
              options={members}
              getOptionLabel={(opt) => opt.user?.fullName || opt.user?.email || ''}
              value={members.find(m => m.userId === form.assignee_id) || null}
              onChange={(_, val) => setForm({ ...form, assignee_id: val?.userId })}
              renderInput={(params) => <MuiTextField {...params} label={t('tasks.assignee')} />}
            />
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label={t('tasks.startDate')} type="date" InputLabelProps={{ shrink: true }} value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || undefined })} />
            <TextField fullWidth label={t('tasks.dueDate')} type="date" InputLabelProps={{ shrink: true }} value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || undefined })} />
          </Box>
          <TextField fullWidth label={t('tasks.estimatedHours')} type="number" value={form.estimated_hours ?? ''} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value ? Number(e.target.value) : undefined })} />
        </Box>
      </FormModal>

      <ConfirmModal
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={handleDelete}
        title={t('tasks.deleteConfirmTitle')}
        message={t('tasks.deleteConfirmMessage', { title: deleteTask?.title })}
        loading={deleting}
      />
    </Box>
  )
}
