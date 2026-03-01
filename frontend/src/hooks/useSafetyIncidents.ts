import { useState, useEffect } from 'react'
import { safetyApi, SafetyIncidentCreateData, SafetyIncidentUpdateData } from '../api/safety'
import type { SafetyIncident, IncidentSeverity, IncidentStatus } from '../types/safety'
import { useToast } from '../components/common/ToastProvider'
import { useTranslation } from 'react-i18next'

interface UseSafetyIncidentsParams {
  projectId: string | undefined
  severity?: IncidentSeverity | 'all'
  status?: IncidentStatus | 'all'
  searchQuery?: string
}

export function useSafetyIncidents({ projectId, severity, status, searchQuery }: UseSafetyIncidentsParams) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [loading, setLoading] = useState(true)

  const loadIncidents = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const params: { severity?: IncidentSeverity; status?: IncidentStatus } = {}
      if (severity && severity !== 'all') params.severity = severity
      if (status && status !== 'all') params.status = status

      const result = await safetyApi.incidents.list(projectId, params)

      let filtered = result
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = result.filter(inc =>
          inc.title.toLowerCase().includes(query) ||
          inc.description.toLowerCase().includes(query) ||
          inc.location?.toLowerCase().includes(query) ||
          inc.reportedBy?.contactName?.toLowerCase().includes(query)
        )
      }

      setIncidents(filtered)
    } catch (error) {
      console.error('Failed to load incidents:', error)
      showError(t('incidents.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const createIncident = async (data: SafetyIncidentCreateData) => {
    if (!projectId) return false
    try {
      await safetyApi.incidents.create(projectId, data)
      showSuccess(t('incidents.createSuccess'))
      await loadIncidents()
      return true
    } catch (error) {
      console.error('Failed to create incident:', error)
      showError(t('incidents.createFailed'))
      return false
    }
  }

  const updateIncident = async (incidentId: string, data: SafetyIncidentUpdateData) => {
    if (!projectId) return false
    try {
      await safetyApi.incidents.update(projectId, incidentId, data)
      showSuccess(t('incidents.updateSuccess'))
      await loadIncidents()
      return true
    } catch (error) {
      console.error('Failed to update incident:', error)
      showError(t('incidents.updateFailed'))
      return false
    }
  }

  const deleteIncident = async (incidentId: string) => {
    if (!projectId) return false
    try {
      await safetyApi.incidents.delete(projectId, incidentId)
      showSuccess(t('incidents.deleteSuccess'))
      await loadIncidents()
      return true
    } catch (error) {
      console.error('Failed to delete incident:', error)
      showError(t('incidents.deleteFailed'))
      return false
    }
  }

  useEffect(() => {
    loadIncidents()
  }, [projectId, severity, status, searchQuery])

  return {
    incidents,
    loading,
    loadIncidents,
    createIncident,
    updateIncident,
    deleteIncident,
  }
}
