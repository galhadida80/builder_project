/**
 * Custom hook for managing defect form state and logic
 */

import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { DefectCreateData, DefectAnalysisItem } from '@/api/defects'
import { defectsApi } from '@/api/defects'
import { filesApi } from '@/api/files'
import { floorplansApi } from '@/api/floorplans'
import type { ValidationError } from '@/utils/validation'
import { hasErrors } from '@/utils/validation'
import { validateDefectForm } from '@/utils/defectFormValidation'
import { compressImage } from '@/utils/imageCompression'
import { useToast } from '@/components/common/ToastProvider'

const MAX_PHOTOS = 5

interface UseDefectFormProps {
  projectId: string | undefined
  floorplanId: string
  onSuccess?: () => void
}

export function useDefectForm({ projectId, floorplanId, onSuccess }: UseDefectFormProps) {
  const { t, i18n } = useTranslation()
  const { showError, showSuccess } = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [analysisResults, setAnalysisResults] = useState<DefectAnalysisItem[]>([])
  const [selectedDefects, setSelectedDefects] = useState<boolean[]>([])
  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [form, setForm] = useState<DefectCreateData>({
    description: '',
    category: 'other',
    severity: 'medium',
    assignee_ids: [],
  })

  const addPhotos = useCallback(
    async (files: File[]) => {
      const remaining = MAX_PHOTOS - pendingPhotos.length
      if (remaining <= 0) return
      const toAdd = files.slice(0, remaining)
      const compressed = await Promise.all(toAdd.map((f) => compressImage(f)))
      const previews = compressed.map((f) => URL.createObjectURL(f))
      setPendingPhotos((prev) => [...prev, ...compressed])
      setPhotoPreviews((prev) => [...prev, ...previews])
    },
    [pendingPhotos.length]
  )

  const removePhoto = useCallback((index: number) => {
    setPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setPendingPhotos((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearPhotos = useCallback(() => {
    photoPreviews.forEach((url) => URL.revokeObjectURL(url))
    setPendingPhotos([])
    setPhotoPreviews([])
  }, [photoPreviews])

  const handleAnalyze = async () => {
    if (!projectId || pendingPhotos.length === 0) return
    setAnalyzing(true)
    try {
      const lang = (i18n.language || 'en').slice(0, 2)
      const result = await defectsApi.analyzeImage(projectId, pendingPhotos[0], lang)
      const defectsResult = result.defects || []
      if (defectsResult.length <= 1) {
        const single = defectsResult[0] || { category: 'other', severity: 'medium', description: '' }
        setForm((prev) => ({
          ...prev,
          category: single.category,
          severity: single.severity,
          description: single.description,
        }))
        setAnalysisResults([])
        setSelectedDefects([])
        showSuccess(t('defects.analyzeSuccess'))
      } else {
        setAnalysisResults(defectsResult)
        setSelectedDefects(new Array(defectsResult.length).fill(false))
        showSuccess(t('defects.multiDefectDetected', { count: defectsResult.length }))
      }
    } catch (err) {
      showError(t('defects.analyzeFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  const validateDefectField = (field: string) => {
    const allErrors = validateDefectForm(form, t)
    setFormErrors((prev) => ({ ...prev, [field]: allErrors[field] || null }))
  }

  const resetForm = useCallback(() => {
    setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
    setFormErrors({})
    clearPhotos()
    setAnalysisResults([])
    setSelectedDefects([])
  }, [clearPhotos])

  const handleSubmit = async (clickPosition: { x: number; y: number }) => {
    if (!projectId) return

    const selectedCount = selectedDefects.filter(Boolean).length
    const isMultiDefect = analysisResults.length > 0 && selectedCount > 0

    if (isMultiDefect) {
      setSubmitting(true)
      try {
        const defectsToCreate = analysisResults.filter((_, idx) => selectedDefects[idx])
        const createdDefectIds: string[] = []

        for (const defectData of defectsToCreate) {
          const defect = await defectsApi.create(projectId, {
            description: defectData.description,
            category: defectData.category,
            severity: defectData.severity,
            assignee_ids: [],
          })
          createdDefectIds.push(defect.id)

          await floorplansApi.createPin(projectId, floorplanId, {
            entityType: 'defect',
            entityId: defect.id,
            xPosition: clickPosition.x,
            yPosition: clickPosition.y,
          })
        }

        if (pendingPhotos.length > 0) {
          for (const photo of pendingPhotos) {
            for (const defectId of createdDefectIds) {
              await filesApi.upload(projectId, 'defect', defectId, photo)
            }
          }
        }

        showSuccess(t('defects.createMultipleSuccess', { count: createdDefectIds.length }))
        onSuccess?.()
        return true
      } catch (err) {
        showError(t('defects.createFailed'))
        return false
      } finally {
        setSubmitting(false)
      }
    }

    const errors = validateDefectForm(form, t)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return false
    }

    setSubmitting(true)
    try {
      const defect = await defectsApi.create(projectId, form)

      if (pendingPhotos.length > 0) {
        setUploadProgress(0)
        for (let i = 0; i < pendingPhotos.length; i++) {
          await filesApi.upload(projectId, 'defect', defect.id, pendingPhotos[i])
          setUploadProgress(((i + 1) / pendingPhotos.length) * 100)
        }
      }

      await floorplansApi.createPin(projectId, floorplanId, {
        entityType: 'defect',
        entityId: defect.id,
        xPosition: clickPosition.x,
        yPosition: clickPosition.y,
      })

      showSuccess(t('defects.createSuccess'))
      onSuccess?.()
      return true
    } catch (err) {
      showError(t('defects.createFailed'))
      return false
    } finally {
      setSubmitting(false)
      setUploadProgress(0)
    }
  }

  return {
    form,
    setForm,
    formErrors,
    validateDefectField,
    submitting,
    uploadProgress,
    analyzing,
    pendingPhotos,
    photoPreviews,
    addPhotos,
    removePhoto,
    handleAnalyze,
    analysisResults,
    setAnalysisResults,
    selectedDefects,
    setSelectedDefects,
    handleSubmit,
    resetForm,
  }
}
