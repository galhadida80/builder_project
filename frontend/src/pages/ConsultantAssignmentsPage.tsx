import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { ConfirmModal } from '../components/ui/Modal'
import { SearchField } from '../components/ui/TextField'
import AssignmentFilters from '../components/consultantAssignments/AssignmentFilters'
import { AssignmentList } from '../components/consultants/AssignmentList'
import { AssignmentCalendar } from '../components/consultants/AssignmentCalendar'
import { AssignmentForm, AssignmentFormData } from '../components/consultants/AssignmentForm'
import { consultantAssignmentsApi } from '../api/consultantAssignments'
import { projectsApi } from '../api/projects'
import { inspectionsApi } from '../api/inspections'
import { apiClient } from '../api/client'
import type { ConsultantAssignment } from '../types/consultantAssignment'
import type { User, Project } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { withMinDuration } from '../utils/async'
import { AddIcon, ViewListIcon, CalendarMonthIcon, AssignmentIcon, PeopleIcon, WorkIcon, PendingActionsIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, ToggleButton, ToggleButtonGroup, Fab, useTheme, useMediaQuery } from '@/mui'

type ViewMode = 'list' | 'calendar'
interface ConsultantType { id: string; name: string }

export default function ConsultantAssignmentsPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<ConsultantAssignment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<ConsultantAssignment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [consultants, setConsultants] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [consultantTypes, setConsultantTypes] = useState<ConsultantType[]>([])
  const [search, setSearch] = useState('')
  const [selectedConsultant, setSelectedConsultant] = useState('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')

  const hasActiveFilters = search !== '' || selectedConsultant !== 'all' || selectedProject !== 'all' ||
    selectedStatus !== 'all' || startDateFilter !== '' || endDateFilter !== ''

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [assignData, , projData, ctData] = await Promise.all([
        consultantAssignmentsApi.list(),
        apiClient.get('/users').then(r => { setConsultants(r.data) }).catch(() => setConsultants([])),
        projectsApi.list().catch(() => [] as Project[]),
        inspectionsApi.getConsultantTypes().catch(() => [] as ConsultantType[]),
      ])
      setAssignments(assignData)
      setProjects(projData as Project[])
      setConsultantTypes(ctData as ConsultantType[])
    } catch {
      showError(t('consultantAssignments.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenCreate = () => { setEditingAssignment(null); setDialogOpen(true) }
  const handleOpenEdit = (a: ConsultantAssignment) => { setEditingAssignment(a); setDialogOpen(true) }
  const handleCloseDialog = () => { setDialogOpen(false); setEditingAssignment(null) }

  const handleSaveAssignment = async (data: AssignmentFormData) => {
    setSaving(true)
    try {
      const payload = {
        consultantId: data.consultantId, projectId: data.projectId,
        consultantTypeId: data.consultantTypeId || undefined,
        startDate: data.startDate, endDate: data.endDate,
        status: data.status, notes: data.notes || undefined,
      }
      if (editingAssignment) {
        await withMinDuration(consultantAssignmentsApi.update(editingAssignment.id, payload))
        showSuccess(t('consultantAssignments.updateSuccess'))
      } else {
        await withMinDuration(consultantAssignmentsApi.create(payload))
        showSuccess(t('consultantAssignments.createSuccess'))
      }
      handleCloseDialog()
      consultantAssignmentsApi.list().then(setAssignments)
    } catch {
      showError(editingAssignment ? t('consultantAssignments.failedToUpdate') : t('consultantAssignments.failedToCreate'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (a: ConsultantAssignment) => { setAssignmentToDelete(a); setDeleteDialogOpen(true) }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return
    setDeleting(true)
    try {
      await withMinDuration(consultantAssignmentsApi.delete(assignmentToDelete.id))
      showSuccess(t('consultantAssignments.deleteSuccess'))
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
      consultantAssignmentsApi.list().then(setAssignments)
    } catch {
      showError(t('consultantAssignments.failedToDelete'))
    } finally {
      setDeleting(false)
    }
  }

  const handleClearFilters = () => {
    setSearch(''); setSelectedConsultant('all'); setSelectedProject('all')
    setSelectedStatus('all'); setStartDateFilter(''); setEndDateFilter('')
  }

  const filteredAssignments = assignments.filter((a) => {
    const q = search.toLowerCase()
    const matchesSearch = !search ||
      a.consultant?.fullName?.toLowerCase().includes(q) ||
      a.consultant?.email?.toLowerCase().includes(q) ||
      a.project?.name?.toLowerCase().includes(q) ||
      a.consultantType?.name?.toLowerCase().includes(q)
    if (!matchesSearch) return false
    if (selectedConsultant !== 'all' && a.consultantId !== selectedConsultant) return false
    if (selectedProject !== 'all' && a.projectId !== selectedProject) return false
    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false
    if (startDateFilter || endDateFilter) {
      const aStart = new Date(a.startDate), aEnd = new Date(a.endDate)
      if (startDateFilter && endDateFilter)
        return aStart <= new Date(endDateFilter) && aEnd >= new Date(startDateFilter)
      if (startDateFilter) return aEnd >= new Date(startDateFilter)
      if (endDateFilter) return aStart <= new Date(endDateFilter)
    }
    return true
  })

  const activeCount = filteredAssignments.filter(a => a.status === 'active').length
  const pendingCount = filteredAssignments.filter(a => a.status === 'pending').length
  const consultantCount = new Set(filteredAssignments.map(a => a.consultantId)).size

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />)}
        </Box>
        <Skeleton variant="rounded" height={500} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title={t('consultantAssignments.title')}
        subtitle={t('consultantAssignments.subtitle')}
        breadcrumbs={[{ label: t('consultantAssignments.consultants') }, { label: t('consultantAssignments.assignments') }]}
        actions={
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
              {t('consultantAssignments.newAssignment')}
            </Button>
          </Box>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4, overflow: 'hidden' }}>
        <KPICard title={t('consultantAssignments.totalAssignments')} value={assignments.length} icon={<AssignmentIcon />} color="primary" />
        <KPICard title={t('common.active')} value={activeCount} icon={<WorkIcon />} color="success" />
        <KPICard title={t('common.pending')} value={pendingCount} icon={<PendingActionsIcon />} color="warning" />
        <KPICard title={t('consultantAssignments.consultants')} value={consultantCount} icon={<PeopleIcon />} color="info" />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small">
                <ToggleButton value="list" aria-label="list view">
                  <ViewListIcon sx={{ mr: 0.5, fontSize: 20 }} />
                  <Typography variant="body2">{t('consultantAssignments.listView')}</Typography>
                </ToggleButton>
                <ToggleButton value="calendar" aria-label="calendar view">
                  <CalendarMonthIcon sx={{ mr: 0.5, fontSize: 20 }} />
                  <Typography variant="body2">{t('consultantAssignments.calendarView')}</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
              <SearchField placeholder={t('consultantAssignments.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </Box>
            <Chip label={`${filteredAssignments.length} ${t('consultantAssignments.assignments').toLowerCase()}`} size="small" />
          </Box>

          <AssignmentFilters
            selectedConsultant={selectedConsultant} onConsultantChange={setSelectedConsultant} consultants={consultants}
            selectedProject={selectedProject} onProjectChange={setSelectedProject} projects={projects}
            selectedStatus={selectedStatus} onStatusChange={setSelectedStatus}
            startDateFilter={startDateFilter} onStartDateChange={setStartDateFilter}
            endDateFilter={endDateFilter} onEndDateChange={setEndDateFilter}
            onClearFilters={handleClearFilters} hasActiveFilters={hasActiveFilters}
          />

          <Box sx={{ mt: 2 }}>
            {viewMode === 'list' ? (
              <AssignmentList assignments={filteredAssignments} loading={loading} onEdit={handleOpenEdit} onDelete={handleDeleteClick} onRowClick={handleOpenEdit} />
            ) : (
              <AssignmentCalendar assignments={filteredAssignments} loading={loading} onAssignmentClick={handleOpenEdit} />
            )}
          </Box>
        </Box>
      </Card>

      {isMobile && (
        <Fab color="primary" onClick={handleOpenCreate} sx={{ position: 'fixed', bottom: 80, insetInlineEnd: 16, zIndex: 10 }}>
          <AddIcon />
        </Fab>
      )}

      <AssignmentForm
        open={dialogOpen} onClose={handleCloseDialog} onSubmit={handleSaveAssignment}
        assignment={editingAssignment} consultants={consultants} projects={projects}
        consultantTypes={consultantTypes} loading={saving}
      />

      <ConfirmModal
        open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleConfirmDelete}
        title={t('consultantAssignments.deleteAssignment')} message={t('consultantAssignments.deleteConfirmation')}
        confirmLabel={t('common.delete')} variant="danger" loading={deleting}
      />
    </Box>
  )
}
