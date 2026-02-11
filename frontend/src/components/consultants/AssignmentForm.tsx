import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TextField } from '../ui/TextField'
import { FormModal } from '../ui/Modal'
import type { ConsultantAssignment, AssignmentStatus } from '../../types/consultantAssignment'
import type { User, Project } from '../../types'
import { Box, MenuItem, TextField as MuiTextField } from '@/mui'

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
  const { t } = useTranslation()

  const statusOptions: { value: AssignmentStatus; label: string }[] = [
    { value: 'pending', label: t('common.pending') },
    { value: 'active', label: t('common.active') },
    { value: 'completed', label: t('common.completed') },
    { value: 'cancelled', label: t('consultantAssignments.cancelled') },
  ]

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
      newErrors.consultantId = t('consultantAssignments.consultantRequired')
    }

    if (!formData.projectId) {
      newErrors.projectId = t('consultantAssignments.projectRequired')
    }

    if (!formData.startDate) {
      newErrors.startDate = t('consultantAssignments.startDateRequired')
    }

    if (!formData.endDate) {
      newErrors.endDate = t('consultantAssignments.endDateRequired')
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate)
      const end = new Date(formData.endDate)
      if (end < start) {
        newErrors.endDate = t('consultantAssignments.endDateAfterStart')
      }
    }

    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = t('consultantAssignments.notesMaxLength')
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
      title={assignment ? t('consultantAssignments.editAssignment') : t('consultantAssignments.createNewAssignment')}
      submitLabel={assignment ? t('consultantAssignments.saveChanges') : t('consultantAssignments.createAssignment')}
      loading={loading}
      submitDisabled={loading}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Consultant Selection */}
        <MuiTextField
          fullWidth
          select
          label={t('consultantAssignments.consultant')}
          required
          value={formData.consultantId}
          onChange={(e) => setFormData({ ...formData, consultantId: e.target.value })}
          error={!!errors.consultantId}
          helperText={errors.consultantId}
          disabled={loading}
        >
          <MenuItem value="">{t('consultantAssignments.selectConsultant')}</MenuItem>
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
          label={t('consultantAssignments.project')}
          required
          value={formData.projectId}
          onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
          error={!!errors.projectId}
          helperText={errors.projectId}
          disabled={loading}
        >
          <MenuItem value="">{t('consultantAssignments.selectProject')}</MenuItem>
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
          label={t('consultantAssignments.consultantType')}
          value={formData.consultantTypeId}
          onChange={(e) => setFormData({ ...formData, consultantTypeId: e.target.value })}
          disabled={loading}
        >
          <MenuItem value="">{t('consultantAssignments.noneType')}</MenuItem>
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
            label={t('consultantAssignments.startDate')}
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
            label={t('consultantAssignments.endDate')}
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
          label={t('consultantAssignments.status')}
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
          label={t('consultantAssignments.notes')}
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
