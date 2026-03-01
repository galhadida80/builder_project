import { apiClient } from './client'
import type {
  SafetyIncident,
  NearMiss,
  SafetyTraining,
  ToolboxTalk,
  TalkAttendee,
  SafetyKPI,
  IncidentSeverity,
  IncidentStatus,
  NearMissSeverity,
  NearMissStatus,
  TrainingStatus,
  ToolboxTalkStatus,
  KeyPoint,
  TalkActionItem
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

// Near Miss
export interface NearMissCreateData {
  title: string
  description: string
  severity: NearMissSeverity
  potentialConsequence?: string
  occurredAt: string
  location?: string
  areaId?: string
  photos?: string[]
  isAnonymous: boolean
  reportedById?: string
  preventiveActions?: string
}

export interface NearMissUpdateData {
  title?: string
  description?: string
  severity?: NearMissSeverity
  status?: NearMissStatus
  potentialConsequence?: string
  occurredAt?: string
  location?: string
  areaId?: string
  photos?: string[]
  reportedById?: string
  preventiveActions?: string
}

export interface NearMissListParams {
  status?: NearMissStatus
  severity?: NearMissSeverity
  search?: string
  isAnonymous?: boolean
}

export interface NearMissSummary {
  total: number
  openCount: number
  inProgressCount: number
  resolvedCount: number
  closedCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  anonymousCount: number
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

  // Near Misses
  nearMisses: {
    list: async (projectId: string, params?: NearMissListParams): Promise<NearMiss[]> => {
      const qs = new URLSearchParams()
      if (params?.status) qs.set('status', params.status)
      if (params?.severity) qs.set('severity', params.severity)
      if (params?.search) qs.set('search', params.search)
      if (params?.isAnonymous !== undefined) qs.set('is_anonymous', String(params.isAnonymous))
      const query = qs.toString()
      const response = await apiClient.get(`/projects/${projectId}/near-misses${query ? `?${query}` : ''}`)
      return response.data
    },

    get: async (projectId: string, nearMissId: string): Promise<NearMiss> => {
      const response = await apiClient.get(`/projects/${projectId}/near-misses/${nearMissId}`)
      return response.data
    },

    create: async (projectId: string, data: NearMissCreateData): Promise<NearMiss> => {
      const response = await apiClient.post(`/projects/${projectId}/near-misses`, {
        title: data.title,
        description: data.description,
        severity: data.severity,
        potential_consequence: data.potentialConsequence,
        occurred_at: data.occurredAt,
        location: data.location,
        area_id: data.areaId,
        photos: data.photos || [],
        is_anonymous: data.isAnonymous,
        reported_by_id: data.isAnonymous ? undefined : data.reportedById,
        preventive_actions: data.preventiveActions,
      })
      return response.data
    },

    update: async (projectId: string, nearMissId: string, data: NearMissUpdateData): Promise<NearMiss> => {
      const payload: Record<string, unknown> = {}
      if (data.title !== undefined) payload.title = data.title
      if (data.description !== undefined) payload.description = data.description
      if (data.severity !== undefined) payload.severity = data.severity
      if (data.status !== undefined) payload.status = data.status
      if (data.potentialConsequence !== undefined) payload.potential_consequence = data.potentialConsequence
      if (data.occurredAt !== undefined) payload.occurred_at = data.occurredAt
      if (data.location !== undefined) payload.location = data.location
      if (data.areaId !== undefined) payload.area_id = data.areaId
      if (data.photos !== undefined) payload.photos = data.photos
      if (data.reportedById !== undefined) payload.reported_by_id = data.reportedById
      if (data.preventiveActions !== undefined) payload.preventive_actions = data.preventiveActions

      const response = await apiClient.patch(`/projects/${projectId}/near-misses/${nearMissId}`, payload)
      return response.data
    },

    delete: async (projectId: string, nearMissId: string): Promise<void> => {
      await apiClient.delete(`/projects/${projectId}/near-misses/${nearMissId}`)
    },

    getSummary: async (projectId: string): Promise<NearMissSummary> => {
      const response = await apiClient.get(`/projects/${projectId}/near-misses-summary`)
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

  // Toolbox Talks
  toolboxTalks: {
    list: async (projectId: string, params?: { status?: ToolboxTalkStatus }): Promise<ToolboxTalk[]> => {
      const qs = new URLSearchParams({ project_id: projectId })
      if (params?.status) qs.set('status', params.status)
      const response = await apiClient.get(`/toolbox-talks?${qs.toString()}`)
      return response.data
    },

    get: async (talkId: string): Promise<ToolboxTalk> => {
      const response = await apiClient.get(`/toolbox-talks/${talkId}`)
      return response.data
    },

    create: async (projectId: string, data: {
      title: string
      topic: string
      description?: string
      scheduledDate: string
      location?: string
      presenter?: string
      keyPoints?: KeyPoint[]
      actionItems?: TalkActionItem[]
      durationMinutes?: number
      attendeeIds?: string[]
    }): Promise<ToolboxTalk> => {
      const response = await apiClient.post(`/projects/${projectId}/toolbox-talks`, {
        title: data.title,
        topic: data.topic,
        description: data.description,
        scheduled_date: data.scheduledDate,
        location: data.location,
        presenter: data.presenter,
        key_points: data.keyPoints,
        action_items: data.actionItems,
        duration_minutes: data.durationMinutes,
        attendee_ids: data.attendeeIds,
      })
      return response.data
    },

    update: async (talkId: string, data: {
      title?: string
      topic?: string
      description?: string
      scheduledDate?: string
      location?: string
      presenter?: string
      keyPoints?: KeyPoint[]
      actionItems?: TalkActionItem[]
      durationMinutes?: number
      status?: ToolboxTalkStatus
      attendeeIds?: string[]
    }): Promise<ToolboxTalk> => {
      const payload: Record<string, unknown> = {}
      if (data.title !== undefined) payload.title = data.title
      if (data.topic !== undefined) payload.topic = data.topic
      if (data.description !== undefined) payload.description = data.description
      if (data.scheduledDate !== undefined) payload.scheduled_date = data.scheduledDate
      if (data.location !== undefined) payload.location = data.location
      if (data.presenter !== undefined) payload.presenter = data.presenter
      if (data.keyPoints !== undefined) payload.key_points = data.keyPoints
      if (data.actionItems !== undefined) payload.action_items = data.actionItems
      if (data.durationMinutes !== undefined) payload.duration_minutes = data.durationMinutes
      if (data.status !== undefined) payload.status = data.status
      if (data.attendeeIds !== undefined) payload.attendee_ids = data.attendeeIds

      const response = await apiClient.put(`/toolbox-talks/${talkId}`, payload)
      return response.data
    },

    delete: async (talkId: string): Promise<void> => {
      await apiClient.delete(`/toolbox-talks/${talkId}`)
    },

    addAttendee: async (talkId: string, data: {
      workerId?: string
      workerName?: string
      attended: boolean
    }): Promise<TalkAttendee> => {
      const response = await apiClient.post(`/toolbox-talks/${talkId}/attendees`, {
        worker_id: data.workerId,
        worker_name: data.workerName,
        attended: data.attended,
      })
      return response.data
    },

    updateAttendance: async (talkId: string, attendeeId: string, attended: boolean, signature?: string): Promise<TalkAttendee> => {
      const qs = new URLSearchParams({ attended: String(attended) })
      if (signature) qs.set('signature', signature)
      const response = await apiClient.put(`/toolbox-talks/${talkId}/attendance/${attendeeId}?${qs.toString()}`, {})
      return response.data
    },

    getSummary: async (talkId: string): Promise<{
      talkId: string
      totalAttendees: number
      totalAttended: number
      totalSigned: number
      attendanceRate: number
      signatureRate: number
    }> => {
      const response = await apiClient.get(`/toolbox-talks/${talkId}/summary`)
      return response.data
    },
  },

  // Safety KPI
  getKPI: async (projectId: string): Promise<SafetyKPI> => {
    const response = await apiClient.get(`/projects/${projectId}/safety/kpi`)
    return response.data
  },
}
