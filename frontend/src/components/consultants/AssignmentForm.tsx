import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import MuiTextField from '@mui/material/TextField'
import { TextField } from '../ui/TextField'
import { FormModal } from '../ui/Modal'
import type { ConsultantAssignment, AssignmentStatus } from '../../types/consultantAssignment'
import type { User, Project } from '../../types'

interface ConsultantType {
  id: string
  name: string
}

interface AssignmentFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: AssignmentFormData) => void | Promise<void>
  assignment?: ConsultantAssignment | null
  consultants?: User[]
  projects?: Project[]
  consultantTypes?: ConsultantType[]
  loading?: boolean
}

export interface AssignmentFormData {
  consultantId: string
  projectId: string
  consultantTypeId?: string
  startDate: string
  endDate: string
  status: AssignmentStatus
  notes?: string
}

const statusOptions: { value: AssignmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function AssignmentForm({
  open,
  onClose,
  onSubmit,
  assignment,
  consultants = [],
  projects = [],
  consultantTypes = [],
  loading = false,
}: AssignmentFormProps) {
  const [formData, setFormData] = useState<AssignmentFormData>({
    consultantId: '',
    projectId: '',
    consultantTypeId: '',
    startDate: '',
    endDate: '',
    status: 'pending',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Populate form when editing
  useEffect(() => {
    if (assignment) {
      setFormData({
        consultantId: assignment.consultantId || '',
        projectId: assignment.projectId || '',
        consultantTypeId: assignment.consultantTypeId || '',
        startDate: assignment.startDate ? assignment.startDate.split('T')[0] : '',
        endDate: assignment.endDate ? assignment.endDate.split('T')[0] : '',
        status: assignment.status,
        notes: assignment.notes || '',
      })
      setErrors({})
    } else {
      // Reset form for create
      setFormData({
        consultantId: '',
        projectId: '',
        consultantTypeId: '',
        startDate: '',
        endDate: '',
        status: 'pending',
        notes: '',
      })
      setErrors({})
    }
  }, [assignment, open])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.consultantId) {
      newErrors.consultantId = 'Consultant is required'
    }

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required'
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required'
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required'
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end < start) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    // Prepare data for submission
    const submitData: AssignmentFormData = {
      ...formData,
      consultantTypeId: formData.consultantTypeId || undefined,
      notes: formData.notes || undefined,
    }

    await onSubmit(submitData)
  }

  const handleClose = () => {
    setFormData({
      consultantId: '',
      projectId: '',
      consultantTypeId: '',
      startDate: '',
      endDate: '',
      status: 'pending',
      notes: '',
    })
    setErrors({})
    onClose()
  }

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      onSubmit={handleSubmit}
      title={assignment ? 'Edit Assignment' : 'Create New Assignment'}
      submitLabel={assignment ? 'Save Changes' : 'Create Assignment'}
      loading={loading}
      submitDisabled={loading}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Consultant Selection */}
        <MuiTextField
          fullWidth
          select
          label="Consultant"
          required
          value={formData.consultantId}
          onChange={(e) => setFormData({ ...formData, consultantId: e.target.value })}
          error={!!errors.consultantId}
          helperText={errors.consultantId}
          disabled={loading}
        >
          <MenuItem value="">Select consultant...</MenuItem>
          {consultants.map((consultant) => (
            <MenuItem key={consultant.id} value={consultant.id}>
              {consultant.fullName || consultant.email}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Project Selection */}
        <MuiTextField
          fullWidth
          select
          label="Project"
          required
          value={formData.projectId}
          onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
          error={!!errors.projectId}
          helperText={errors.projectId}
          disabled={loading}
        >
          <MenuItem value="">Select project...</MenuItem>
          {projects.map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.name}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Consultant Type Selection (Optional) */}
        <MuiTextField
          fullWidth
          select
          label="Consultant Type"
          value={formData.consultantTypeId}
          onChange={(e) => setFormData({ ...formData, consultantTypeId: e.target.value })}
          disabled={loading}
        >
          <MenuItem value="">None</MenuItem>
          {consultantTypes.map((type) => (
            <MenuItem key={type.id} value={type.id}>
              {type.name}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Date Range */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <TextField
            fullWidth
            label="Start Date"
            type="date"
            required
            InputLabelProps={{ shrink: true }}
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            error={!!errors.startDate}
            helperText={errors.startDate}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="End Date"
            type="date"
            required
            InputLabelProps={{ shrink: true }}
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            error={!!errors.endDate}
            helperText={errors.endDate}
            disabled={loading}
          />
        </Box>

        {/* Status Selection */}
        <MuiTextField
          fullWidth
          select
          label="Status"
          required
          value={formData.status}
          onChange={(e) => setFormData({ ...formData, status: e.target.value as AssignmentStatus })}
          disabled={loading}
        >
          {statusOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Notes */}
        <TextField
          fullWidth
          label="Notes"
          multiline
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          error={!!errors.notes}
          helperText={errors.notes || `${formData.notes?.length || 0}/500`}
          inputProps={{ maxLength: 500 }}
          disabled={loading}
        />
      </Box>
    </FormModal>
  )
}
