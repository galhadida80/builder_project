import { useState, useEffect, useCallback } from 'react'
import { safetyApi, NearMissCreateData, NearMissUpdateData } from '../api/safety'
import type { NearMiss, NearMissSeverity, NearMissSummary } from '../types/safety'
import type { Contact, ConstructionArea } from '../types'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'
import { contactsApi } from '../api/contacts'
import { areasApi } from '../api/areas'
import { validateRequired, type ValidationError, hasErrors } from '../utils/validation'
import { filesToPreviews, filesToBase64 } from '../utils/safetyHelpers'

export function useNearMissesPage(projectId: string | undefined) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

  // State
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([])
  const [summary, setSummary] = useState<NearMissSummary | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNearMiss, setEditingNearMiss] = useState<NearMiss | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [form, setForm] = useState<NearMissCreateData>({
    title: '',
    description: '',
    severity: 'medium',
    occurredAt: new Date().toISOString().slice(0, 16),
    isAnonymous: false,
  })

  // Load reference data
  useEffect(() => {
    if (projectId) loadReferenceData()
  }, [projectId])

  // Load near misses
  useEffect(() => {
    if (projectId) loadNearMisses()
  }, [projectId, activeTab, severityFilter, searchQuery])

  const loadReferenceData = async () => {
    if (!projectId) return
    try {
      const [summaryData, contactList, areaList] = await Promise.all([
        safetyApi.nearMisses.getSummary(projectId),
        contactsApi.list(projectId).catch(() => []),
        areasApi.list(projectId).catch(() => []),
      ])
      setSummary(summaryData)
      setContacts(contactList)
      setAreas(areaList)
    } catch (error) {
      console.error('Failed to load reference data:', error)
    }
  }

  const loadNearMisses = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { severity?: NearMissSeverity } = {}
      if (activeTab !== 'all') params.severity = activeTab as NearMissSeverity
      if (severityFilter) params.severity = severityFilter as NearMissSeverity

      const result = await safetyApi.nearMisses.list(projectId, params)

      let filtered = result
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = result.filter(nm =>
          nm.description.toLowerCase().includes(query) ||
          nm.location?.toLowerCase().includes(query)
        )
      }

      setNearMisses(filtered)
    } catch (error) {
      console.error('Failed to load near misses:', error)
      showError(t('nearMisses.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  // Photo handling
  const addPhotos = useCallback(async (files: File[]) => {
    const newPhotos = files.slice(0, 5 - pendingPhotos.length)
    if (newPhotos.length === 0) return

    setPendingPhotos(prev => [...prev, ...newPhotos])
    const newPreviews = await filesToPreviews(newPhotos)
    setPhotoPreviews(prev => [...prev, ...newPreviews])
  }, [pendingPhotos])

  const removePhoto = useCallback((index: number) => {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Form handling
  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      severity: 'medium',
      occurredAt: new Date().toISOString().slice(0, 16),
      isAnonymous: false,
    })
    setPendingPhotos([])
    setPhotoPreviews([])
    setFormErrors({})
    setEditingNearMiss(null)
  }

  const validateNearMissForm = (data: NearMissCreateData): ValidationError => {
    const errors: ValidationError = {}
    errors.title = validateRequired(data.title, t('nearMisses.title'))
    errors.description = validateRequired(data.description, t('nearMisses.description'))
    errors.severity = validateRequired(data.severity, t('nearMisses.severity'))
    errors.occurredAt = validateRequired(data.occurredAt, t('nearMisses.occurredDate'))
    return errors
  }

  const validateField = (field: string) => {
    const allErrors = validateNearMissForm(form)
    setFormErrors(prev => ({ ...prev, [field]: allErrors[field] || null }))
  }

  const handleCreate = async () => {
    if (!projectId) return

    const errors = validateNearMissForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    setUploadProgress(10)

    try {
      const photos = pendingPhotos.length > 0 ? await filesToBase64(pendingPhotos) : undefined
      setUploadProgress(50)

      await safetyApi.nearMisses.create(projectId, { ...form, photos })
      setUploadProgress(100)

      showSuccess(t('nearMisses.createSuccess'))
      setDialogOpen(false)
      resetForm()
      loadNearMisses()
      loadReferenceData()
    } catch (error) {
      console.error('Failed to create near miss:', error)
      showError(t('nearMisses.createFailed'))
    } finally {
      setSubmitting(false)
      setUploadProgress(0)
    }
  }

  return {
    nearMisses,
    summary,
    contacts,
    areas,
    loading,
    dialogOpen,
    setDialogOpen,
    editingNearMiss,
    setEditingNearMiss,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    severityFilter,
    setSeverityFilter,
    submitting,
    formErrors,
    validateField,
    pendingPhotos,
    photoPreviews,
    addPhotos,
    removePhoto,
    uploadProgress,
    form,
    setForm,
    handleCreate,
    resetForm,
    loadNearMisses,
  }
}
