import { apiClient } from './client'
import type {
  SafetyIncident,
  SafetyTraining,
  SafetyKPI,
  IncidentSeverity,
  IncidentStatus,
  TrainingStatus
} from '../types/safety'

// Safety Incidents
export interface SafetyIncidentCreateData {
  title: string
  description: string
  severity: IncidentSeverity
  occurredAt: string
  location?: string
  areaId?: string
  photos?: string[]
  witnesses?: string[]
  rootCause?: string
  correctiveActions?: string
  reportedById?: string
}

export interface SafetyIncidentUpdateData {
  title?: string
  description?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  occurredAt?: string
  location?: string
  areaId?: string
  photos?: string[]
  witnesses?: string[]
  rootCause?: string
  correctiveActions?: string
  reportedById?: string
}

export interface SafetyIncidentListParams {
  status?: IncidentStatus
  severity?: IncidentSeverity
  search?: string
}

export interface SafetyIncidentSummary {
  total: number
  openCount: number
  investigatingCount: number
  resolvedCount: number
  closedCount: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
}

// Safety Training
export interface SafetyTrainingCreateData {
  workerId: string
  trainingType: string
  trainingDate: string
  expiryDate?: string
  certificateNumber?: string
  instructor?: string
  notes?: string
}

export interface SafetyTrainingUpdateData {
  workerId?: string
  trainingType?: string
  trainingDate?: string
  expiryDate?: string
  status?: TrainingStatus
  certificateNumber?: string
  instructor?: string
  notes?: string
}

export interface SafetyTrainingListParams {
  workerId?: string
  trainingType?: string
  status?: TrainingStatus
  expiringSoon?: boolean
}

export interface SafetyTrainingSummary {
  total: number
  validCount: number
  expiredCount: number
  expiringSoonCount: number
  byType: Record<string, number>
  uniqueWorkers: number
}

export const safetyApi = {
  // Safety Incidents
  incidents: {
    list: async (projectId: string, params?: SafetyIncidentListParams): Promise<SafetyIncident[]> => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.severity) qs.set('severity', params.severity)
      if (params?.search) qs.set('search', params.search)
      const query = qs.toString()
      const response = await apiClient.get(`/projects/${projectId}/safety-incidents${query ? `?${query}` : ''}`)
      return response.data
    },

    get: async (projectId: string, incidentId: string): Promise<SafetyIncident> => {
      const response = await apiClient.get(`/projects/${projectId}/safety-incidents/${incidentId}`)
      return response.data
    },

    create: async (projectId: string, data: SafetyIncidentCreateData): Promise<SafetyIncident> => {
      const response = await apiClient.post(`/projects/${projectId}/safety-incidents`, {
        title: data.title,
        description: data.description,
        severity: data.severity,
        occurred_at: data.occurredAt,
        location: data.location,
        area_id: data.areaId,
        photos: data.photos || [],
        witnesses: data.witnesses || [],
        root_cause: data.rootCause,
        corrective_actions: data.correctiveActions,
        reported_by_id: data.reportedById,
      })
      return response.data
    },

    update: async (projectId: string, incidentId: string, data: SafetyIncidentUpdateData): Promise<SafetyIncident> => {
      const payload: Record<string, unknown> = {}
      if (data.title !== undefined) payload.title = data.title
      if (data.description !== undefined) payload.description = data.description
      if (data.severity !== undefined) payload.severity = data.severity
      if (data.status !== undefined) payload.status = data.status
      if (data.occurredAt !== undefined) payload.occurred_at = data.occurredAt
      if (data.location !== undefined) payload.location = data.location
      if (data.areaId !== undefined) payload.area_id = data.areaId
      if (data.photos !== undefined) payload.photos = data.photos
      if (data.witnesses !== undefined) payload.witnesses = data.witnesses
      if (data.rootCause !== undefined) payload.root_cause = data.rootCause
      if (data.correctiveActions !== undefined) payload.corrective_actions = data.correctiveActions
      if (data.reportedById !== undefined) payload.reported_by_id = data.reportedById

      const response = await apiClient.patch(`/projects/${projectId}/safety-incidents/${incidentId}`, payload)
      return response.data
    },

    delete: async (projectId: string, incidentId: string): Promise<void> => {
      await apiClient.delete(`/projects/${projectId}/safety-incidents/${incidentId}`)
    },

    getSummary: async (projectId: string): Promise<SafetyIncidentSummary> => {
      const response = await apiClient.get(`/projects/${projectId}/safety-incidents-summary`)
      return response.data
    },
  },

  // Safety Training
  training: {
    list: async (projectId: string, params?: SafetyTrainingListParams): Promise<SafetyTraining[]> => {
      const qs = new URLSearchParams()
      if (params?.workerId) qs.set('worker_id', params.workerId)
      if (params?.trainingType) qs.set('training_type', params.trainingType)
      if (params?.status) qs.set('status', params.status)
      if (params?.expiringSoon !== undefined) qs.set('expiring_soon', String(params.expiringSoon))
      const query = qs.toString()
      const response = await apiClient.get(`/projects/${projectId}/safety-training${query ? `?${query}` : ''}`)
      return response.data
    },

    get: async (projectId: string, trainingId: string): Promise<SafetyTraining> => {
      const response = await apiClient.get(`/projects/${projectId}/safety-training/${trainingId}`)
      return response.data
    },

    create: async (projectId: string, data: SafetyTrainingCreateData): Promise<SafetyTraining> => {
      const response = await apiClient.post(`/projects/${projectId}/safety-training`, {
        worker_id: data.workerId,
        training_type: data.trainingType,
        training_date: data.trainingDate,
        expiry_date: data.expiryDate,
        certificate_number: data.certificateNumber,
        instructor: data.instructor,
        notes: data.notes,
      })
      return response.data
    },

    update: async (projectId: string, trainingId: string, data: SafetyTrainingUpdateData): Promise<SafetyTraining> => {
      const payload: Record<string, unknown> = {}
      if (data.workerId !== undefined) payload.worker_id = data.workerId
      if (data.trainingType !== undefined) payload.training_type = data.trainingType
      if (data.trainingDate !== undefined) payload.training_date = data.trainingDate
      if (data.expiryDate !== undefined) payload.expiry_date = data.expiryDate
      if (data.status !== undefined) payload.status = data.status
      if (data.certificateNumber !== undefined) payload.certificate_number = data.certificateNumber
      if (data.instructor !== undefined) payload.instructor = data.instructor
      if (data.notes !== undefined) payload.notes = data.notes

      const response = await apiClient.put(`/projects/${projectId}/safety-training/${trainingId}`, payload)
      return response.data
    },

    delete: async (projectId: string, trainingId: string): Promise<void> => {
      await apiClient.delete(`/projects/${projectId}/safety-training/${trainingId}`)
    },

    getExpiringAlerts: async (projectId: string, days: number = 30): Promise<SafetyTraining[]> => {
      const response = await apiClient.get(`/projects/${projectId}/safety-training/expiring/alerts?days=${days}`)
      return response.data
    },

    getSummary: async (projectId: string): Promise<SafetyTrainingSummary> => {
      const response = await apiClient.get(`/projects/${projectId}/safety-training/summary/statistics`)
      return response.data
    },
  },

  // Safety KPI
  getKPI: async (projectId: string): Promise<SafetyKPI> => {
    const response = await apiClient.get(`/projects/${projectId}/safety/kpi`)
    return response.data
  },
}
