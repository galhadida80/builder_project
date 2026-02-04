import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import AddIcon from '@mui/icons-material/Add'
import ViewListIcon from '@mui/icons-material/ViewList'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PeopleIcon from '@mui/icons-material/People'
import WorkIcon from '@mui/icons-material/Work'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { ConfirmModal } from '../components/ui/Modal'
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

type ViewMode = 'list' | 'calendar'

interface ConsultantType {
  id: string
  name: string
}

export default function ConsultantAssignmentsPage() {
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<ConsultantAssignment[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<ConsultantAssignment | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assignmentToDelete, setAssignmentToDelete] = useState<ConsultantAssignment | null>(null)
  const [saving, setSaving] = useState(false)

  // Data for form dropdowns
  const [consultants, setConsultants] = useState<User[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [consultantTypes, setConsultantTypes] = useState<ConsultantType[]>([])

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
      showError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      const data = await consultantAssignmentsApi.list()
      setAssignments(data)
    } catch (error) {
      throw error
    }
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
        consultant_id: data.consultantId,
        project_id: data.projectId,
        consultant_type_id: data.consultantTypeId || undefined,
        start_date: data.startDate,
        end_date: data.endDate,
        status: data.status,
        notes: data.notes || undefined,
      }

      if (editingAssignment) {
        await consultantAssignmentsApi.update(editingAssignment.id, payload)
        showSuccess('Assignment updated successfully!')
      } else {
        await consultantAssignmentsApi.create(payload)
        showSuccess('Assignment created successfully!')
      }

      handleCloseDialog()
      loadAssignments()
    } catch (error) {
      showError(`Failed to ${editingAssignment ? 'update' : 'create'} assignment. Please try again.`)
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

    try {
      await consultantAssignmentsApi.delete(assignmentToDelete.id)
      showSuccess('Assignment deleted successfully!')
      setDeleteDialogOpen(false)
      setAssignmentToDelete(null)
      loadAssignments()
    } catch (error) {
      showError('Failed to delete assignment. Please try again.')
    }
  }

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode)
    }
  }

  // Calculate KPIs
  const activeAssignments = assignments.filter(a => a.status === 'active').length
  const pendingAssignments = assignments.filter(a => a.status === 'pending').length
  const uniqueConsultants = new Set(assignments.map(a => a.consultantId)).size
  const uniqueProjects = new Set(assignments.map(a => a.projectId)).size

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={250} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={350} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
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
        title="Consultant Assignments"
        subtitle="Manage consultant assignments across projects"
        breadcrumbs={[{ label: 'Consultants' }, { label: 'Assignments' }]}
        actions={
          <Button variant="primary" icon={<AddIcon />} onClick={handleOpenCreate}>
            New Assignment
          </Button>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <KPICard
          title="Total Assignments"
          value={assignments.length}
          icon={<AssignmentIcon />}
          color="primary"
        />
        <KPICard
          title="Active"
          value={activeAssignments}
          icon={<WorkIcon />}
          color="success"
        />
        <KPICard
          title="Pending"
          value={pendingAssignments}
          icon={<PendingActionsIcon />}
          color="warning"
        />
        <KPICard
          title="Consultants"
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
                  <Typography variant="body2">List</Typography>
                </ToggleButton>
                <ToggleButton value="calendar" aria-label="calendar view">
                  <CalendarMonthIcon sx={{ mr: 0.5, fontSize: 20 }} />
                  <Typography variant="body2">Calendar</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <Chip label={`${assignments.length} assignments`} size="small" />
          </Box>

          <Box sx={{ mt: 2 }}>
            {viewMode === 'list' ? (
              <AssignmentList
                assignments={assignments}
                loading={loading}
                onEdit={handleOpenEdit}
                onDelete={handleDeleteClick}
                onRowClick={handleOpenEdit}
              />
            ) : (
              <AssignmentCalendar
                assignments={assignments}
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
        title="Delete Assignment"
        message={`Are you sure you want to delete this assignment? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </Box>
  )
}
