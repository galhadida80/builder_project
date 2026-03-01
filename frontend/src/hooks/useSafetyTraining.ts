import { useState, useEffect } from 'react'
import { safetyApi, SafetyTrainingCreateData, SafetyTrainingUpdateData } from '../api/safety'
import type { SafetyTraining, TrainingStatus } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'

interface UseSafetyTrainingParams {
  projectId: string | undefined
  status?: TrainingStatus | 'all'
  trainingType?: string
  searchQuery?: string
}

export function useSafetyTraining({ projectId, status, trainingType, searchQuery }: UseSafetyTrainingParams) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [trainings, setTrainings] = useState<SafetyTraining[]>([])
  const [loading, setLoading] = useState(true)

  const loadTrainings = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { status?: TrainingStatus; trainingType?: string } = {}
      if (status && status !== 'all') params.status = status
      if (trainingType) params.trainingType = trainingType

      const result = await safetyApi.training.list(projectId, params)

      let filtered = result
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = result.filter(t =>
          t.trainingType.toLowerCase().includes(query) ||
          t.worker?.contactName?.toLowerCase().includes(query) ||
          t.certificateNumber?.toLowerCase().includes(query)
        )
      }

      setTrainings(filtered)
    } catch (error) {
      console.error('Failed to load trainings:', error)
      showError(t('safetyTraining.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const createTraining = async (data: SafetyTrainingCreateData) => {
    if (!projectId) return false
    try {
      await safetyApi.training.create(projectId, data)
      showSuccess(t('safetyTraining.createSuccess'))
      await loadTrainings()
      return true
    } catch (error) {
      console.error('Failed to create training:', error)
      showError(t('safetyTraining.createFailed'))
      return false
    }
  }

  const updateTraining = async (trainingId: string, data: SafetyTrainingUpdateData) => {
    if (!projectId) return false
    try {
      await safetyApi.training.update(projectId, trainingId, data)
      showSuccess(t('safetyTraining.updateSuccess'))
      await loadTrainings()
      return true
    } catch (error) {
      console.error('Failed to update training:', error)
      showError(t('safetyTraining.updateFailed'))
      return false
    }
  }

  const deleteTraining = async (trainingId: string) => {
    if (!projectId) return false
    try {
      await safetyApi.training.delete(projectId, trainingId)
      showSuccess(t('safetyTraining.deleteSuccess'))
      await loadTrainings()
      return true
    } catch (error) {
      console.error('Failed to delete training:', error)
      showError(t('safetyTraining.deleteFailed'))
      return false
    }
  }

  useEffect(() => {
    loadTrainings()
  }, [projectId, status, trainingType, searchQuery])

  return {
    trainings,
    loading,
    loadTrainings,
    createTraining,
    updateTraining,
    deleteTraining,
  }
}
