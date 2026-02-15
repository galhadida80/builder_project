import { apiClient } from './client'
import type {
  InspectionConsultantType,
  InspectionStageTemplate,
  Inspection,
  Finding,
  InspectionSummary,
  InspectionHistoryEvent
} from '../types'

export const inspectionsApi = {
  getConsultantTypes: async (): Promise<InspectionConsultantType[]> => {
    const response = await apiClient.get('/consultant-types')
    return response.data
  },

  getConsultantType: async (id: string): Promise<InspectionConsultantType> => {
    const response = await apiClient.get(`/consultant-types/${id}`)
    return response.data
  },

  getStageTemplates: async (consultantTypeId: string): Promise<InspectionStageTemplate[]> => {
    const response = await apiClient.get(`/consultant-types/${consultantTypeId}/templates`)
    return response.data
  },

  getProjectInspections: async (projectId: string): Promise<Inspection[]> => {
    const response = await apiClient.get(`/projects/${projectId}/inspections`)
    return response.data
  },

  getInspectionSummary: async (projectId: string): Promise<InspectionSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/inspections/summary`)
    return response.data
  },

  createInspection: async (projectId: string, data: {
    consultantTypeId: string
    scheduledDate: string
    notes?: string
  }): Promise<Inspection> => {
    const response = await apiClient.post(`/projects/${projectId}/inspections`, {
      consultant_type_id: data.consultantTypeId,
      scheduled_date: data.scheduledDate,
      notes: data.notes || undefined,
    })
    return response.data
  },

  updateInspection: async (projectId: string, inspectionId: string, data: Partial<Inspection>): Promise<Inspection> => {
    const response = await apiClient.put(`/projects/${projectId}/inspections/${inspectionId}`, data)
    return response.data
  },

  completeInspection: async (projectId: string, inspectionId: string): Promise<Inspection> => {
    const response = await apiClient.post(`/projects/${projectId}/inspections/${inspectionId}/complete`)
    return response.data
  },

  addFinding: async (projectId: string, inspectionId: string, data: {
    title: string
    description?: string
    severity: string
    location?: string
  }): Promise<Finding> => {
    const response = await apiClient.post(`/projects/${projectId}/inspections/${inspectionId}/findings`, data)
    return response.data
  },

  updateFinding: async (findingId: string, data: Partial<Finding>): Promise<Finding> => {
    const response = await apiClient.put(`/inspections/findings/${findingId}`, data)
    return response.data
  },

  getInspectionHistory: async (projectId: string, inspectionId: string): Promise<InspectionHistoryEvent[]> => {
    const response = await apiClient.get(`/projects/${projectId}/inspections/${inspectionId}/history`)
    return response.data
  }
}
