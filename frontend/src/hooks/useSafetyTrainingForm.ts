import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { safetyApi, SafetyTrainingCreateData, SafetyTrainingUpdateData, SafetyTrainingSummary } from '../api/safety'
import { contactsApi } from '../api/contacts'
import type { SafetyTraining } from '../types/safety'
import type { Contact } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { validateRequired, type ValidationError, hasErrors } from '../utils/validation'

interface TrainingFormData {
  workerId: string
  trainingType: string
  trainingDate: string
  expiryDate: string
  certificateNumber: string
  instructor: string
  notes: string
}

export function useSafetyTrainingForm(projectId: string | undefined) {
  const { t } = useTranslation()
  const { showSuccess } = useToast()

  const [summary, setSummary] = useState<SafetyTrainingSummary | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTraining, setEditingTraining] = useState<SafetyTraining | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [form, setForm] = useState<TrainingFormData>({
    workerId: '',
    trainingType: '',
    trainingDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    certificateNumber: '',
    instructor: '',
    notes: '',
  })

  const loadReferenceData = async () => {
    if (!projectId) return
    try {
      const [trainingSummary, contactList] = await Promise.all([
        safetyApi.training.getSummary(projectId),
        contactsApi.list(projectId).catch(() => []),
      ])
      setSummary(trainingSummary)
      setContacts(contactList.filter((c) => c.contactType === 'worker' || c.contactType === 'subcontractor'))
    } catch (error) {
      console.error('Failed to load reference data:', error)
    }
  }

  const validateForm = (data: TrainingFormData): ValidationError => {
    const errors: ValidationError = {}
    errors.workerId = validateRequired(data.workerId, t('safetyTraining.worker'))
    errors.trainingType = validateRequired(data.trainingType, t('safetyTraining.trainingType'))
    errors.trainingDate = validateRequired(data.trainingDate, t('safetyTraining.trainingDate'))
    return errors
  }

  const validateField = (field: string) => {
    const allErrors = validateForm(form)
    setFormErrors((prev) => ({ ...prev, [field]: allErrors[field] || null }))
  }

  const resetForm = () => {
    setForm({
      workerId: '',
      trainingType: '',
      trainingDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      certificateNumber: '',
      instructor: '',
      notes: '',
    })
    setFormErrors({})
  }

  const handleCreate = async (onSuccess: () => void) => {
    if (!projectId) return

    const errors = validateForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const data: SafetyTrainingCreateData = {
        workerId: form.workerId,
        trainingType: form.trainingType,
        trainingDate: form.trainingDate,
        expiryDate: form.expiryDate || undefined,
        certificateNumber: form.certificateNumber || undefined,
        instructor: form.instructor || undefined,
        notes: form.notes || undefined,
      }

      await safetyApi.training.create(projectId, data)
      showSuccess(t('safetyTraining.createSuccess'))
      setDialogOpen(false)
      resetForm()
      onSuccess()
      loadReferenceData()
    } catch (error) {
      console.error('Failed to create training:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (onSuccess: () => void) => {
    if (!projectId || !editingTraining) return

    const errors = validateForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const data: SafetyTrainingUpdateData = {
        workerId: form.workerId,
        trainingType: form.trainingType,
        trainingDate: form.trainingDate,
        expiryDate: form.expiryDate || undefined,
        certificateNumber: form.certificateNumber || undefined,
        instructor: form.instructor || undefined,
        notes: form.notes || undefined,
      }

      await safetyApi.training.update(projectId, editingTraining.id, data)
      showSuccess(t('safetyTraining.updateSuccess'))
      setDialogOpen(false)
      setEditingTraining(null)
      resetForm()
      onSuccess()
      loadReferenceData()
    } catch (error) {
      console.error('Failed to update training:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const openCreateDialog = () => {
    setDialogOpen(true)
  }

  const openEditDialog = (training: SafetyTraining) => {
    setEditingTraining(training)
    setForm({
      workerId: training.workerId,
      trainingType: training.trainingType,
      trainingDate: training.trainingDate.split('T')[0],
      expiryDate: training.expiryDate ? training.expiryDate.split('T')[0] : '',
      certificateNumber: training.certificateNumber || '',
      instructor: training.instructor || '',
      notes: training.notes || '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingTraining(null)
    resetForm()
  }

  const updateFormField = (field: keyof TrainingFormData, value: string) => {
    setForm({ ...form, [field]: value })
  }

  useEffect(() => {
    if (projectId) loadReferenceData()
  }, [projectId])

  return {
    summary,
    contacts,
    dialogOpen,
    editingTraining,
    submitting,
    form,
    formErrors,
    handleCreate,
    handleUpdate,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    updateFormField,
    validateField,
  }
}
