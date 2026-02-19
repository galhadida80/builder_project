import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { ConfirmModal } from '../components/ui/Modal'
import { SearchField } from '../components/ui/TextField'
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
import { Box, Typography, Skeleton, Chip, IconButton, ToggleButton, ToggleButtonGroup, MenuItem, TextField as MuiTextField } from '@/mui'

type ViewMode = 'list' | 'calendar'

interface ConsultantType {
  id: string
  name: string
}

export default function ConsultantAssignmentsPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<ConsultantAssignment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<ConsultantAssignment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Data for form dropdowns
  const [consultants, setConsultants] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [consultantTypes, setConsultantTypes] = useState<ConsultantType[]>([])

  // Filter state
  const [search, setSearch] = useState('')
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [startDateFilter, setStartDateFilter] = useState<string>('')
  const [endDateFilter, setEndDateFilter] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadAssignments(),
        loadConsultants(),
        loadProjects(),
        loadConsultantTypes(),
      ])
    } catch (error) {
      showError(t('consultantAssignments.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    const data = await consultantAssignmentsApi.list()
    setAssignments(data)
  }

  const loadConsultants = async () => {
    try {
      const response = await apiClient.get('/users')
      setConsultants(response.data)
    } catch (error) {
      setConsultants([])
    }
  }

  const loadProjects = async () => {
    try {
      const data = await projectsApi.list()
      setProjects(data)
    } catch (error) {
      setProjects([])
    }
  }

  const loadConsultantTypes = async () => {
    try {
      const data = await inspectionsApi.getConsultantTypes()
      setConsultantTypes(data as ConsultantType[])
    } catch (error) {
      setConsultantTypes([])
    }
  }

  const handleOpenCreate = () => {
    setEditingAssignment(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (assignment: ConsultantAssignment) => {
    setEditingAssignment(assignment)
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setEditingAssignment(null)
  }

  const handleSaveAssignment = async (data: AssignmentFormData) => {
    setSaving(true)
    try {
      const payload = {
        consultantId: data.consultantId,
        projectId: data.projectId,
        consultantTypeId: data.consultantTypeId || undefined,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        notes: data.notes || undefined,
      }

      if (editingAssignment) {
        await withMinDuration(consultantAssignmentsApi.update(editingAssignment.id, payload))
        showSuccess(t('consultantAssignments.updateSuccess'))
      } else {
        await withMinDuration(consultantAssignmentsApi.create(payload))
        showSuccess(t('consultantAssignments.createSuccess'))
      }

      handleCloseDialog()
      loadAssignments()
    } catch (error) {
      showError(editingAssignment ? t('consultantAssignments.failedToUpdate') : t('consultantAssignments.failedToCreate'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (assignment: ConsultantAssignment) => {
    setAssignmentToDelete(assignment)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return

    setDeleting(true)
    try {
      await withMinDuration(consultantAssignmentsApi.delete(assignmentToDelete.id))
      showSuccess(t('consultantAssignments.deleteSuccess'))
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
      loadAssignments()
    } catch (error) {
      showError(t('consultantAssignments.failedToDelete'))
    } finally {
      setDeleting(false)
    }
  }

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode)
    }
  }

  // Filter assignments
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      search === '' ||
      assignment.consultant?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      assignment.consultant?.email?.toLowerCase().includes(search.toLowerCase()) ||
      assignment.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
      assignment.consultantType?.name?.toLowerCase().includes(search.toLowerCase())

    const matchesConsultant =
      selectedConsultant === 'all' ||
      assignment.consultantId === selectedConsultant

    const matchesProject =
      selectedProject === 'all' ||
      assignment.projectId === selectedProject

    const matchesStatus =
      selectedStatus === 'all' ||
      assignment.status === selectedStatus

    const matchesDateRange = (() => {
      if (!startDateFilter && !endDateFilter) return true

      const assignmentStart = new Date(assignment.startDate)
      const assignmentEnd = new Date(assignment.endDate)

      if (startDateFilter && endDateFilter) {
        const filterStart = new Date(startDateFilter)
        const filterEnd = new Date(endDateFilter)
        return assignmentStart <= filterEnd && assignmentEnd >= filterStart
      } else if (startDateFilter) {
        const filterStart = new Date(startDateFilter)
        return assignmentEnd >= filterStart
      } else if (endDateFilter) {
        const filterEnd = new Date(endDateFilter)
        return assignmentStart <= filterEnd
      }
      return true
    })()

    return matchesSearch && matchesConsultant && matchesProject && matchesStatus && matchesDateRange
  })

  // Calculate KPIs (based on filtered assignments)
  const activeAssignments = filteredAssignments.filter(a => a.status === 'active').length
  const pendingAssignments = filteredAssignments.filter(a => a.status === 'pending').length
  const uniqueConsultants = new Set(filteredAssignments.map(a => a.consultantId)).size
  const uniqueProjects = new Set(filteredAssignments.map(a => a.projectId)).size

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
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
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            {t('consultantAssignments.newAssignment')}
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
          overflow: 'hidden',
        }}
      >
        <KPICard
          title={t('consultantAssignments.totalAssignments')}
          value={assignments.length}
          icon={<AssignmentIcon />}
          color="primary"
        />
        <KPICard
          title={t('common.active')}
          value={activeAssignments}
          icon={<WorkIcon />}
          color="success"
        />
        <KPICard
          title={t('common.pending')}
          value={pendingAssignments}
          icon={<PendingActionsIcon />}
          color="warning"
        />
        <KPICard
          title={t('consultantAssignments.consultants')}
          value={uniqueConsultants}
          icon={<PeopleIcon />}
          color="info"
        />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={handleViewModeChange}
                size="small"
                aria-label="view mode"
              >
                <ToggleButton value="list" aria-label="list view">
                  <ViewListIcon sx={{ mr: 0.5, fontSize: 20 }} />
                  <Typography variant="body2">{t('consultantAssignments.listView')}</Typography>
                </ToggleButton>
                <ToggleButton value="calendar" aria-label="calendar view">
                  <CalendarMonthIcon sx={{ mr: 0.5, fontSize: 20 }} />
                  <Typography variant="body2">{t('consultantAssignments.calendarView')}</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
              <SearchField
                placeholder={t('consultantAssignments.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Box>
            <Chip label={`${filteredAssignments.length} ${t('consultantAssignments.assignments').toLowerCase()}`} size="small" />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <MuiTextField
              select
              size="small"
              label={t('consultantAssignments.consultant')}
              value={selectedConsultant}
              onChange={(e) => setSelectedConsultant(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">{t('consultantAssignments.allConsultants')}</MenuItem>
              {consultants.map((consultant) => (
                <MenuItem key={consultant.id} value={consultant.id}>
                  {consultant.fullName || consultant.email}
                </MenuItem>
              ))}
            </MuiTextField>

            <MuiTextField
              select
              size="small"
              label={t('consultantAssignments.project')}
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="all">{t('consultantAssignments.allProjects')}</MenuItem>
              {projects.map((project) => (
                <MenuItem key={project.id} value={project.id}>
                  {project.name}
                </MenuItem>
              ))}
            </MuiTextField>

            <MuiTextField
              select
              size="small"
              label={t('common.status')}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="all">{t('consultantAssignments.allStatuses')}</MenuItem>
              <MenuItem value="pending">{t('common.pending')}</MenuItem>
              <MenuItem value="active">{t('common.active')}</MenuItem>
              <MenuItem value="completed">{t('common.completed')}</MenuItem>
              <MenuItem value="cancelled">{t('consultantAssignments.cancelled')}</MenuItem>
            </MuiTextField>

            <MuiTextField
              type="date"
              size="small"
              label={t('consultantAssignments.startDateFrom')}
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            <MuiTextField
              type="date"
              size="small"
              label={t('consultantAssignments.endDateTo')}
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />

            {(search || selectedConsultant !== 'all' || selectedProject !== 'all' ||
              selectedStatus !== 'all' || startDateFilter || endDateFilter) && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  setSearch('')
                  setSelectedConsultant('all')
                  setSelectedProject('all')
                  setSelectedStatus('all')
                  setStartDateFilter('')
                  setEndDateFilter('')
                }}
              >
                {t('consultantAssignments.clearFilters')}
              </Button>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            {viewMode === 'list' ? (
              <AssignmentList
                assignments={filteredAssignments}
                loading={loading}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteClick}
                onRowClick={handleOpenEdit}
              />
            ) : (
              <AssignmentCalendar
                assignments={filteredAssignments}
                loading={loading}
                onAssignmentClick={handleOpenEdit}
              />
            )}
          </Box>
        </Box>
      </Card>

      <AssignmentForm
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSaveAssignment}
        assignment={editingAssignment}
        consultants={consultants}
        projects={projects}
        consultantTypes={consultantTypes}
        loading={saving}
      />

      <ConfirmModal
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title={t('consultantAssignments.deleteAssignment')}
        message={t('consultantAssignments.deleteConfirmation')}
        confirmLabel={t('common.delete')}
        variant="danger"
        loading={deleting}
      />
    </Box>
  )
}
