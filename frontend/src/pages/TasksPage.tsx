import { useState, useEffect } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Tabs, SegmentedTabs } from '../components/ui/Tabs'
import { useAuth } from '../contexts/AuthContext'
import { FormModal, ConfirmModal } from '../components/ui/Modal'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField, SearchField } from '../components/ui/TextField'
import { tasksApi, TaskCreateData } from '../api/tasks'
import { approvalsApi } from '../api/approvals'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { projectsApi } from '../api/projects'
import { scheduleRiskApi } from '../api/scheduleRisk'
import type { Task, TaskSummary, ProjectMember, ApprovalRequest, Equipment, Material } from '../types'
import type { ScheduleRiskAnalysis, RiskLevel } from '../types/scheduleRisk'
import { useToast } from '../components/common/ToastProvider'
import { useSignatureStamp } from '../hooks/useSignatureStamp'
import {
  AddIcon, CheckCircleIcon, WarningIcon, EditIcon, DeleteIcon,
  AccessTimeIcon, BuildIcon, InventoryIcon, CancelIcon, DescriptionIcon,
  TaskAltIcon, ApprovalIcon, ArrowBackIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip, MenuItem, Avatar, Badge,
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

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string }> = {
  low: { bg: '#DCFCE7', text: '#22C55E' },
  medium: { bg: '#FEF3C7', text: '#F59E0B' },
  high: { bg: '#FFEDD5', text: '#F97316' },
  critical: { bg: '#FEE2E2', text: '#EF4444' },
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

export default function TasksPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const { user } = useAuth()
  const { stampUrl } = useSignatureStamp()

  const [section, setSection] = useState<'tasks' | 'approvals'>('tasks')
  const [loading, setLoading] = useState(true)

  // Task state
  const [tasks, setTasks] = useState<Task[]>([])
  const [summary, setSummary] = useState<TaskSummary | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
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
  const [taskRisks, setTaskRisks] = useState<Map<string, ScheduleRiskAnalysis>>(new Map())

  // Approval state
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [approvalTab, setApprovalTab] = useState('pending')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [commentTouched, setCommentTouched] = useState(false)
  const [approvalSubmitting, setApprovalSubmitting] = useState(false)

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [taskList, taskSummary, project, approvalsData, eqRes, matRes] = await Promise.all([
        tasksApi.list(projectId),
        tasksApi.getSummary(projectId),
        projectsApi.get(projectId).catch(() => null),
        approvalsApi.list(projectId).catch(() => []),
        equipmentApi.list(projectId).catch(() => ({ items: [] as never[] })),
        materialsApi.list(projectId).catch(() => ({ items: [] as never[] })),
      ])
      setTasks(taskList)
      setSummary(taskSummary)
      setMembers(project?.members || [])
      setApprovals(approvalsData)
      setEquipment(eqRes.items)
      setMaterials(matRes.items)

      // Load risk data for all tasks
      const riskMap = new Map<string, ScheduleRiskAnalysis>()
      await Promise.all(
        taskList.map(async (task) => {
          try {
            const risk = await scheduleRiskApi.getTaskRisk(projectId, task.id)
            riskMap.set(task.id, risk)
          } catch {
            // Ignore errors for individual task risks
          }
        })
      )
      setTaskRisks(riskMap)
    } catch {
      showError(t('tasks.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Handle openCreate from quick action nav
  useEffect(() => {
    if ((location.state as { openCreate?: boolean })?.openCreate) {
      setSection('tasks')
      setEditingTask(null)
      setForm(EMPTY_FORM)
      setDialogOpen(true)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state])

  // Task handlers
  const openCreateDialog = () => { setEditingTask(null); setForm(EMPTY_FORM); setTitleTouched(false); setDialogOpen(true) }
  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setForm({ title: task.title, description: task.description, priority: task.priority, assignee_id: task.assigneeId, start_date: task.startDate?.slice(0, 10), due_date: task.dueDate?.slice(0, 10), estimated_hours: task.estimatedHours })
    setDialogOpen(true)
  }
  const handleSubmit = async () => {
    if (!projectId || !form.title) return
    setSubmitting(true)
    try {
      if (editingTask) { await tasksApi.update(projectId, editingTask.id, form); showSuccess(t('tasks.updateSuccess')) }
      else { await tasksApi.create(projectId, form); showSuccess(t('tasks.createSuccess')) }
      setDialogOpen(false); setForm(EMPTY_FORM); setEditingTask(null); loadData()
    } catch { showError(editingTask ? t('tasks.updateFailed') : t('tasks.createFailed')) }
    finally { setSubmitting(false) }
  }
  const handleDelete = async () => {
    if (!projectId || !deleteTask) return
    setDeleting(true)
    try { await withMinDuration(tasksApi.delete(projectId, deleteTask.id)); showSuccess(t('tasks.deleteSuccess')); setDeleteTask(null); loadData() }
    catch { showError(t('tasks.deleteFailed')) }
    finally { setDeleting(false) }
  }

  // Approval handlers
  const pendingApprovals = approvals.filter(a => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected')
  const approvedApprovals = approvals.filter(a => a.currentStatus === 'approved')
  const rejectedApprovals = approvals.filter(a => a.currentStatus === 'rejected')
  const getEntityDetails = (approval: ApprovalRequest) => approval.entityType === 'equipment' ? equipment.find(e => e.id === approval.entityId) : materials.find(m => m.id === approval.entityId)
  const getDisplayedApprovals = () => {
    if (approvalTab === 'pending') return pendingApprovals
    if (approvalTab === 'approved') return approvedApprovals
    if (approvalTab === 'rejected') return rejectedApprovals
    return approvals
  }
  const handleApprovalAction = (approval: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedApproval(approval); setActionType(action); setComment(''); setCommentTouched(false); setApprovalDialogOpen(true)
  }
  const handleSubmitApprovalAction = async () => {
    if (!selectedApproval || !actionType) return
    setApprovalSubmitting(true)
    const prev = [...approvals]
    const saved = selectedApproval
    const savedAction = actionType
    setApprovals(a => a.map(x => x.id === saved.id ? { ...x, currentStatus: (savedAction === 'approve' ? 'approved' : 'rejected') as ApprovalRequest['currentStatus'] } : x))
    setApprovalDialogOpen(false); setSelectedApproval(null); setActionType(null); setComment('')
    try {
      if (savedAction === 'approve') await approvalsApi.approve(saved.id, comment || undefined)
      else await approvalsApi.reject(saved.id, comment)
      showSuccess(savedAction === 'approve' ? t('approvals.approvedSuccess') : t('approvals.rejectedSuccess'))
      loadData()
    } catch { setApprovals(prev); showError(t('approvals.failedToProcess')) }
    finally { setApprovalSubmitting(false) }
  }

  // Computed
  const todayCount = tasks.filter(tk => tk.dueDate && isToday(tk.dueDate) && tk.status !== 'completed' && tk.status !== 'cancelled').length
  const riskLevelCounts = {
    low: tasks.filter(tk => taskRisks.get(tk.id)?.riskLevel === 'low').length,
    medium: tasks.filter(tk => taskRisks.get(tk.id)?.riskLevel === 'medium').length,
    high: tasks.filter(tk => taskRisks.get(tk.id)?.riskLevel === 'high').length,
    critical: tasks.filter(tk => taskRisks.get(tk.id)?.riskLevel === 'critical').length,
  }
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'overdue' && !isOverdue(task)) return false
    else if (activeTab === 'myTasks' && task.assigneeId !== user?.id) return false
    else if (activeTab === 'today' && !(task.dueDate && isToday(task.dueDate))) return false
    else if (activeTab === 'riskLow' && taskRisks.get(task.id)?.riskLevel !== 'low') return false
    else if (activeTab === 'riskMedium' && taskRisks.get(task.id)?.riskLevel !== 'medium') return false
    else if (activeTab === 'riskHigh' && taskRisks.get(task.id)?.riskLevel !== 'high') return false
    else if (activeTab === 'riskCritical' && taskRisks.get(task.id)?.riskLevel !== 'critical') return false
    else if (activeTab !== 'all' && activeTab !== 'overdue' && activeTab !== 'myTasks' && activeTab !== 'today' && !activeTab.startsWith('risk') && task.status !== activeTab) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return task.title.toLowerCase().includes(q) || String(task.taskNumber).includes(q) || task.assignee?.fullName?.toLowerCase().includes(q)
    }
    return true
  })
  const grouped = groupTasksByDate(filteredTasks)

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
      {/* Sticky back button */}
      <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.default', pb: 1, display: { md: 'none' } }}>
        <IconButton onClick={() => navigate(-1)} size="small" sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>
      <PageHeader
        title={t('tasksAndApprovals.pageTitle')}
        subtitle={t('tasksAndApprovals.pageSubtitle')}
        actions={section === 'tasks' ? (
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Button variant="primary" icon={<AddIcon />} onClick={openCreateDialog}>{t('tasks.createTask')}</Button>
          </Box>
        ) : pendingApprovals.length > 0 ? (
          <Badge badgeContent={pendingApprovals.length} color="warning" sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', fontWeight: 700, minWidth: 24, height: 24, borderRadius: 12 } }}>
            <Chip label={t('approvals.pendingApprovals')} color="warning" variant="outlined" sx={{ fontWeight: 600, pr: 2 }} />
          </Badge>
        ) : undefined}
      />

      {/* Section Toggle */}
      <Box sx={{ mb: 2.5 }}>
        <SegmentedTabs
          items={[
            { label: t('tasksAndApprovals.tasks'), value: 'tasks', icon: <TaskAltIcon sx={{ fontSize: 18 }} /> },
            { label: `${t('tasksAndApprovals.approvals')}${pendingApprovals.length > 0 ? ` (${pendingApprovals.length})` : ''}`, value: 'approvals', icon: <ApprovalIcon sx={{ fontSize: 18 }} /> },
          ]}
          value={section}
          onChange={(v) => setSection(v as 'tasks' | 'approvals')}
        />
      </Box>

      {/* Combined KPI Row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
        <KpiBox label={t('tasks.total')} value={summary?.total ?? 0} />
        <KpiBox label={t('tasks.today')} value={todayCount} color="primary.main" />
        <KpiBox label={t('approvals.pending')} value={pendingApprovals.length} color="warning.main" />
        <KpiBox label={t('tasks.overdue')} value={summary?.overdueCount ?? 0} color="error.main" borderColor={summary?.overdueCount ? 'error.main' : undefined} />
      </Box>

      {section === 'tasks' ? (
        <>
          <Tabs
            items={[
              { label: t('common.all'), value: 'all', badge: tasks.length },
              { label: t('tasks.myTasks'), value: 'myTasks', badge: tasks.filter(tk => tk.assigneeId === user?.id).length },
              { label: t('tasks.today'), value: 'today', badge: todayCount },
              { label: t('tasks.overdue'), value: 'overdue', badge: tasks.filter(tk => isOverdue(tk)).length },
              { label: t('tasks.completed'), value: 'completed', badge: tasks.filter(tk => tk.status === 'completed').length },
              { label: t('scheduleRisk.riskLevels.critical'), value: 'riskCritical', badge: riskLevelCounts.critical },
              { label: t('scheduleRisk.riskLevels.high'), value: 'riskHigh', badge: riskLevelCounts.high },
              { label: t('scheduleRisk.riskLevels.medium'), value: 'riskMedium', badge: riskLevelCounts.medium },
              { label: t('scheduleRisk.riskLevels.low'), value: 'riskLow', badge: riskLevelCounts.low },
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
              <>
                {grouped.today.length > 0 && <TaskGroup label={t('tasks.today')} count={grouped.today.length} tasks={grouped.today} renderCard={(task) => <TaskCard key={task.id} task={task} t={t} onEdit={openEditDialog} onDelete={setDeleteTask} riskAnalysis={taskRisks.get(task.id)} />} />}
                {grouped.thisWeek.length > 0 && <TaskGroup label={t('tasks.thisWeek')} count={grouped.thisWeek.length} tasks={grouped.thisWeek} renderCard={(task) => <TaskCard key={task.id} task={task} t={t} onEdit={openEditDialog} onDelete={setDeleteTask} riskAnalysis={taskRisks.get(task.id)} />} />}
                {grouped.later.length > 0 && <TaskGroup label={t('tasks.later')} count={grouped.later.length} tasks={grouped.later} renderCard={(task) => <TaskCard key={task.id} task={task} t={t} onEdit={openEditDialog} onDelete={setDeleteTask} riskAnalysis={taskRisks.get(task.id)} />} />}
              </>
            )}
          </Box>
        </>
      ) : (
        <>
          <Tabs
            items={[
              { label: t('approvals.pending'), value: 'pending', badge: pendingApprovals.length },
              { label: t('approvals.approved'), value: 'approved', badge: approvedApprovals.length },
              { label: t('approvals.rejected'), value: 'rejected', badge: rejectedApprovals.length },
            ]}
            value={approvalTab}
            onChange={setApprovalTab}
            size="small"
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
            {getDisplayedApprovals().length === 0 ? (
              <EmptyState
                title={approvalTab === 'pending' ? t('approvals.noPending') : t('approvals.noApprovals')}
                description={approvalTab === 'pending' ? t('approvals.allProcessed') : t('approvals.tryAdjusting')}
                icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
              />
            ) : (
              getDisplayedApprovals().map((approval) => {
                const entity = getEntityDetails(approval)
                const isPending = approval.currentStatus !== 'approved' && approval.currentStatus !== 'rejected'
                const categoryColor = approval.entityType === 'equipment'
                  ? { bg: '#e3f2fd', text: '#1565c0', label: t('approvals.equipment') }
                  : { bg: '#e8f5e9', text: '#2e7d32', label: t('approvals.material') }
                const docCount = entity && 'documents' in entity ? ((entity as Equipment | Material).documents?.length || 0) : 0

                return (
                  <Card key={approval.id} sx={{ ...(isPending && { border: '1px solid', borderColor: 'warning.light' }) }}>
                    <Box sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Chip
                          icon={approval.entityType === 'equipment' ? <BuildIcon sx={{ fontSize: 14 }} /> : <InventoryIcon sx={{ fontSize: 14 }} />}
                          label={categoryColor.label}
                          size="small"
                          sx={{ height: 24, fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', bgcolor: categoryColor.bg, color: categoryColor.text, '& .MuiChip-icon': { color: categoryColor.text } }}
                        />
                        {isPending && (
                          <Chip label={t('approvals.pendingApproval')} size="small" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, bgcolor: 'warning.light', color: 'warning.dark' }} />
                        )}
                      </Box>
                      <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 1.5 }}>{entity?.name || t('approvals.unknown')}</Typography>
                      {approval.createdBy && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.main' }}>
                            {approval.createdBy.fullName?.charAt(0)?.toUpperCase() || approval.createdBy.email.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" color="text.secondary">{t('approvals.submittedBy')}: {approval.createdBy.fullName || approval.createdBy.email}</Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">{new Date(approval.createdAt).toLocaleDateString()}</Typography>
                        </Box>
                        <StatusBadge status={approval.currentStatus} size="small" />
                        {docCount > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <DescriptionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">{docCount} {t('approvals.documents')}</Typography>
                          </Box>
                        )}
                      </Box>
                      {/* Approval steps - who approved/rejected */}
                      {approval.steps?.filter(s => s.status === 'approved' || s.status === 'rejected').length > 0 && (
                        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {approval.steps.filter(s => s.status === 'approved' || s.status === 'rejected').map((step) => (
                            <Box key={step.id} sx={{ p: 1.5, borderRadius: 2, bgcolor: step.status === 'approved' ? 'success.light' : 'error.light', border: '1px solid', borderColor: step.status === 'approved' ? 'success.main' : 'error.main', opacity: 0.9 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {step.status === 'approved' ? <CheckCircleIcon sx={{ fontSize: 16, color: 'success.dark' }} /> : <CancelIcon sx={{ fontSize: 16, color: 'error.dark' }} />}
                                <Typography variant="caption" fontWeight={700} sx={{ color: step.status === 'approved' ? 'success.dark' : 'error.dark' }}>
                                  {step.status === 'approved' ? t('approvals.approved') : t('approvals.rejected')}
                                </Typography>
                                {step.approvedBy && (
                                  <Typography variant="caption" sx={{ color: step.status === 'approved' ? 'success.dark' : 'error.dark' }}>
                                    — {step.approvedBy.fullName || step.approvedBy.email}
                                  </Typography>
                                )}
                                {step.approvedAt && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                                    {new Date(step.approvedAt).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                  </Typography>
                                )}
                              </Box>
                              {step.comments && (
                                <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary', fontStyle: 'italic' }}>
                                  "{step.comments}"
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Box>
                      )}
                      {isPending && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                          <Button variant="success" size="small" icon={<CheckCircleIcon />} onClick={() => handleApprovalAction(approval, 'approve')} fullWidth>{t('approvals.approve')}</Button>
                          <Button variant="danger" size="small" icon={<CancelIcon />} onClick={() => handleApprovalAction(approval, 'reject')} fullWidth>{t('approvals.reject')}</Button>
                        </Box>
                      )}
                    </Box>
                  </Card>
                )
              })
            )}
          </Box>
        </>
      )}

      {/* Task Create/Edit Modal */}
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
            <Autocomplete options={members} getOptionLabel={(opt) => opt.user?.fullName || opt.user?.email || ''} value={members.find(m => m.userId === form.assignee_id) || null} onChange={(_, val) => setForm({ ...form, assignee_id: val?.userId })} renderInput={(params) => <MuiTextField {...params} label={t('tasks.assignee')} />} />
          )}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label={t('tasks.startDate')} type="date" InputLabelProps={{ shrink: true }} value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || undefined })} />
            <TextField fullWidth label={t('tasks.dueDate')} type="date" InputLabelProps={{ shrink: true }} value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || undefined })} />
          </Box>
          <TextField fullWidth label={t('tasks.estimatedHours')} type="number" value={form.estimated_hours ?? ''} onChange={(e) => setForm({ ...form, estimated_hours: e.target.value ? Number(e.target.value) : undefined })} />
        </Box>
      </FormModal>

      {/* Approval Action Modal */}
      <FormModal
        open={approvalDialogOpen}
        onClose={() => !approvalSubmitting && setApprovalDialogOpen(false)}
        onSubmit={handleSubmitApprovalAction}
        title={actionType === 'approve' ? t('approvals.approveRequest') : t('approvals.rejectRequest')}
        submitLabel={actionType === 'approve' ? t('approvals.confirmApproval') : t('approvals.confirmRejection')}
        loading={approvalSubmitting}
        submitDisabled={actionType === 'reject' && !comment.trim()}
      >
        <Box sx={{ pt: 1 }}>
          {selectedApproval && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">{t('approvals.aboutTo', { action: actionType })}</Typography>
              <Typography variant="subtitle1" fontWeight={600}>{getEntityDetails(selectedApproval)?.name || t('approvals.unknown')}</Typography>
            </Box>
          )}
          {/* Approver info */}
          <Box sx={{ mb: 2, p: 2, bgcolor: actionType === 'approve' ? 'success.light' : 'error.light', borderRadius: 2, border: '1px solid', borderColor: actionType === 'approve' ? 'success.main' : 'error.main' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>{user?.fullName || user?.email}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {actionType === 'approve' ? t('approvals.approvingAs') : t('approvals.rejectingAs')}
                </Typography>
              </Box>
            </Box>
            {actionType === 'approve' && stampUrl && (
              <Box sx={{ mt: 1.5, p: 1, bgcolor: 'background.paper', borderRadius: 1, textAlign: 'center' }}>
                <img src={stampUrl} alt="signature" style={{ maxWidth: 160, maxHeight: 60, objectFit: 'contain' }} />
                <Typography variant="caption" display="block" color="text.secondary">{t('approvals.signatureStamp')}</Typography>
              </Box>
            )}
          </Box>
          <TextField
            fullWidth multiline rows={4}
            label={actionType === 'approve' ? t('approvals.commentsOptional') : t('approvals.rejectionReason')}
            value={comment} onChange={(e) => setComment(e.target.value)} onBlur={() => setCommentTouched(true)}
            required={actionType === 'reject'}
            error={actionType === 'reject' && commentTouched && !comment.trim()}
            helperText={actionType === 'reject' && commentTouched && !comment.trim() ? t('approvals.rejectionReasonRequired') : undefined}
            placeholder={actionType === 'approve' ? t('approvals.commentsPlaceholder') : t('approvals.rejectionPlaceholder')}
          />
        </Box>
      </FormModal>

      <ConfirmModal open={!!deleteTask} onClose={() => setDeleteTask(null)} onConfirm={handleDelete} title={t('tasks.deleteConfirmTitle')} message={t('tasks.deleteConfirmMessage', { title: deleteTask?.title })} loading={deleting} />
    </Box>
  )
}

function KpiBox({ label, value, color, borderColor }: { label: string; value: number; color?: string; borderColor?: string }) {
  return (
    <Box sx={{ bgcolor: 'background.paper', border: borderColor ? '2px solid' : '1px solid', borderColor: borderColor || 'divider', borderRadius: 2, p: 1.5, textAlign: 'center' }}>
      <Typography variant="caption" sx={{ color: color || 'text.secondary', fontSize: '0.65rem' }}>{label}</Typography>
      <Typography variant="h6" fontWeight={700} sx={{ color: color || 'text.primary' }}>{value}</Typography>
    </Box>
  )
}

function TaskCard({ task, t, onEdit, onDelete, riskAnalysis }: { task: Task; t: (k: string, o?: Record<string, unknown>) => string; onEdit: (t: Task) => void; onDelete: (t: Task) => void; riskAnalysis?: ScheduleRiskAnalysis }) {
  const c = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.low
  const r = riskAnalysis ? RISK_COLORS[riskAnalysis.riskLevel] : null
  const overdue = isOverdue(task)
  const isComplete = task.status === 'completed'
  const borderColor = overdue ? '#DC2626' : task.priority === 'urgent' ? '#DC2626' : task.priority === 'high' ? '#e07842' : task.priority === 'medium' ? '#2563EB' : '#64748B'
  const dueTime = task.dueDate ? new Date(task.dueDate).toLocaleTimeString(getDateLocale(), { hour: '2-digit', minute: '2-digit' }) : null

  return (
    <Card hoverable onClick={() => onEdit(task)} sx={{ borderInlineStart: '4px solid', borderInlineStartColor: borderColor, opacity: isComplete ? 0.6 : 1 }}>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Box sx={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, mt: 0.25, border: '2px solid', borderColor: isComplete ? 'success.main' : 'divider', bgcolor: isComplete ? 'success.main' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isComplete && <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} sx={{ lineHeight: 1.3, mb: 0.75, ...(isComplete && { textDecoration: 'line-through', color: 'text.disabled' }) }}>{task.title}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1, fontSize: '0.65rem' }}>
              <Chip label={`#${task.taskNumber}`} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: c.text }} />
                <Typography variant="caption" sx={{ color: c.text, fontWeight: 700, fontSize: '0.65rem' }}>{t(`tasks.priorities.${task.priority}`, { defaultValue: task.priority })}</Typography>
              </Box>
              {riskAnalysis && (
                <Chip
                  label={t(`scheduleRisk.riskLevels.${riskAnalysis.riskLevel}`)}
                  size="small"
                  icon={<WarningIcon sx={{ fontSize: 12 }} />}
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: r?.bg,
                    color: r?.text,
                    '& .MuiChip-icon': { color: r?.text },
                  }}
                />
              )}
              {task.dueDate && (
                <Typography variant="caption" sx={{ color: overdue ? 'error.main' : 'text.secondary', fontWeight: 500, fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  {overdue && <WarningIcon sx={{ fontSize: 12 }} />}
                  <AccessTimeIcon sx={{ fontSize: 12 }} />
                  {isToday(task.dueDate) && dueTime ? `${t('tasks.today')} ${dueTime}` : new Date(task.dueDate).toLocaleDateString(getDateLocale())}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {task.assignee ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.55rem', fontWeight: 700 }}>{task.assignee.fullName?.charAt(0) || '?'}</Box>
                  <Typography variant="caption" color="text.secondary">{task.assignee.fullName}</Typography>
                </Box>
              ) : <Box />}
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton aria-label={t('common.edit')} size="small" onClick={(e) => { e.stopPropagation(); onEdit(task) }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                <IconButton aria-label={t('common.delete')} size="small" onClick={(e) => { e.stopPropagation(); onDelete(task) }}><DeleteIcon sx={{ fontSize: 16 }} color="error" /></IconButton>
              </Box>
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
        <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
        <Box sx={{ bgcolor: 'primary.dark', color: 'primary.contrastText', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{count}</Box>
      </Box>
      {tasks.map(renderCard)}
    </>
  )
}
