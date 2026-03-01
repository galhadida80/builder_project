import { useState, useEffect } from 'react'
import { safetyApi, NearMissCreateData, NearMissUpdateData } from '../api/safety'
import type { NearMiss, NearMissSeverity } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'

interface UseNearMissesParams {
  projectId: string | undefined
  severity?: NearMissSeverity | 'all'
  searchQuery?: string
}

export function useNearMisses({ projectId, severity, searchQuery }: UseNearMissesParams) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [nearMisses, setNearMisses] = useState<NearMiss[]>([])
  const [loading, setLoading] = useState(true)

  const loadNearMisses = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { severity?: NearMissSeverity } = {}
      if (severity && severity !== 'all') params.severity = severity

      const result = await safetyApi.nearMisses.list(projectId, params)

      let filtered = result
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = result.filter(nm =>
          nm.description.toLowerCase().includes(query) ||
          nm.location?.toLowerCase().includes(query) ||
          nm.reportedBy?.contactName?.toLowerCase().includes(query)
        )
      }

      setNearMisses(filtered)
    } catch (error) {
      console.error('Failed to load near-misses:', error)
      showError(t('nearMisses.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const createNearMiss = async (data: NearMissCreateData) => {
    if (!projectId) return false
    try {
      await safetyApi.nearMisses.create(projectId, data)
      showSuccess(t('nearMisses.createSuccess'))
      await loadNearMisses()
      return true
    } catch (error) {
      console.error('Failed to create near-miss:', error)
      showError(t('nearMisses.createFailed'))
      return false
    }
  }

  const updateNearMiss = async (nearMissId: string, data: NearMissUpdateData) => {
    if (!projectId) return false
    try {
      await safetyApi.nearMisses.update(projectId, nearMissId, data)
      showSuccess(t('nearMisses.updateSuccess'))
      await loadNearMisses()
      return true
    } catch (error) {
      console.error('Failed to update near-miss:', error)
      showError(t('nearMisses.updateFailed'))
      return false
    }
  }

  const deleteNearMiss = async (nearMissId: string) => {
    if (!projectId) return false
    try {
      await safetyApi.nearMisses.delete(projectId, nearMissId)
      showSuccess(t('nearMisses.deleteSuccess'))
      await loadNearMisses()
      return true
    } catch (error) {
      console.error('Failed to delete near-miss:', error)
      showError(t('nearMisses.deleteFailed'))
      return false
    }
  }

  useEffect(() => {
    loadNearMisses()
  }, [projectId, severity, searchQuery])

  return {
    nearMisses,
    loading,
    loadNearMisses,
    createNearMiss,
    updateNearMiss,
    deleteNearMiss,
  }
}
