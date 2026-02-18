import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { DataTable, Column } from '../components/ui/DataTable'
import { StatusBadge } from '../components/ui/StatusBadge'
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
  AddIcon, TaskAltIcon, CheckCircleIcon, HourglassEmptyIcon,
  WarningIcon, EditIcon, DeleteIcon,
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
      await tasksApi.delete(projectId, deleteTask.id)
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
    if (activeTab !== 'all' && task.status !== activeTab) return false
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

  const columns: Column<Task>[] = [
    { id: 'taskNumber', label: '#', minWidth: 60, sortable: true,
      render: (row) => <Typography variant="body2" fontWeight={600}>#{row.taskNumber}</Typography> },
    { id: 'title', label: t('tasks.title'), minWidth: 200,
      render: (row) => <Typography variant="body2" noWrap sx={{ maxWidth: 280 }}>{row.title}</Typography> },
    { id: 'status', label: t('common.status'), minWidth: 120,
      render: (row) => <StatusBadge status={row.status} /> },
    { id: 'priority', label: t('tasks.priority'), minWidth: 100, hideOnMobile: true,
      render: (row) => {
        const c = PRIORITY_COLORS[row.priority] || PRIORITY_COLORS.low
        return <Chip size="small" label={t(`tasks.priorities.${row.priority}`, { defaultValue: row.priority })} sx={{ bgcolor: c.bg, color: c.text, fontWeight: 600, fontSize: '0.7rem' }} />
      } },
    { id: 'assignee', label: t('tasks.assignee'), minWidth: 140, hideOnMobile: true,
      render: (row) => <Typography variant="body2" color={row.assignee ? 'text.primary' : 'text.secondary'}>{row.assignee?.fullName || '-'}</Typography> },
    { id: 'dueDate', label: t('tasks.dueDate'), minWidth: 110, sortable: true, hideOnMobile: true,
      render: (row) => <Typography variant="body2" color={isOverdue(row) ? 'error.main' : 'text.primary'} fontWeight={isOverdue(row) ? 600 : 400}>{row.dueDate ? new Date(row.dueDate).toLocaleDateString(getDateLocale()) : '-'}</Typography> },
    { id: 'actions', label: '', minWidth: 90, align: 'right', hideOnMobile: true,
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          <IconButton size="small" aria-label={t('tasks.editTask')} onClick={(e) => { e.stopPropagation(); openEditDialog(row) }}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" aria-label={t('common.delete')} onClick={(e) => { e.stopPropagation(); setDeleteTask(row) }}><DeleteIcon fontSize="small" color="error" /></IconButton>
        </Box>
      ) },
  ]

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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 3 }}>
          <KPICard title={t('tasks.total')} value={summary.total} icon={<TaskAltIcon />} color="primary" />
          <KPICard title={t('tasks.inProgress')} value={summary.inProgressCount} icon={<HourglassEmptyIcon />} color="info" />
          <KPICard title={t('tasks.completed')} value={summary.completedCount} icon={<CheckCircleIcon />} color="success" />
          <KPICard title={t('tasks.overdue')} value={summary.overdueCount} icon={<WarningIcon />} color="error" />
        </Box>
      )}

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1, mb: 2 }}>
            <Typography variant="h6" fontWeight={600}>{t('tasks.list')}</Typography>
            <SearchField placeholder={t('tasks.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </Box>

          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: tasks.length },
              { label: t('tasks.notStarted'), value: 'not_started', badge: tasks.filter(t => t.status === 'not_started').length },
              { label: t('tasks.inProgress'), value: 'in_progress', badge: tasks.filter(t => t.status === 'in_progress').length },
              { label: t('tasks.completed'), value: 'completed', badge: tasks.filter(t => t.status === 'completed').length },
              { label: t('tasks.onHold'), value: 'on_hold', badge: tasks.filter(t => t.status === 'on_hold').length },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            size="small"
          />

          <Box sx={{ mt: 2 }}>
            {filteredTasks.length === 0 ? (
              <EmptyState title={t('tasks.noTasks')} description={t('tasks.noTasksDescription')} />
            ) : (
              <DataTable
                columns={columns}
                rows={filteredTasks}
                getRowId={(row) => row.id}
                renderMobileCard={(row) => {
                  const c = PRIORITY_COLORS[row.priority] || PRIORITY_COLORS.low
                  const overdue = isOverdue(row)
                  return (
                    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={700}>#{row.taskNumber}</Typography>
                        <StatusBadge status={row.status} />
                      </Box>
                      <Typography variant="body2" noWrap sx={{ mb: 1, fontWeight: 500 }}>{row.title}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip size="small" label={t(`tasks.priorities.${row.priority}`, { defaultValue: row.priority })} sx={{ bgcolor: c.bg, color: c.text, fontWeight: 600, fontSize: '0.7rem', height: 22 }} />
                        {row.assignee && <Chip label={row.assignee.fullName} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />}
                        {row.dueDate && (
                          <Chip
                            label={new Date(row.dueDate).toLocaleDateString(getDateLocale())}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 22, ...(overdue && { borderColor: 'error.main', color: 'error.main' }) }}
                          />
                        )}
                      </Box>
                    </Box>
                  )
                }}
              />
            )}
          </Box>
        </Box>
      </Card>

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
            <MuiTextField select fullWidth label={t('common.status')} value={(form as any).status || editingTask.status} onChange={(e) => setForm({ ...form, status: e.target.value } as any)}>
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
