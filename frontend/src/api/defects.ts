import { apiClient } from './client'
import type { Defect, DefectSummary } from '../types'

export interface DefectCreateData {
  description: string
  category: string
  defect_type?: string
  area_id?: string
  severity: string
  is_repeated?: boolean
  due_date?: string
  reporter_id?: string
  assigned_contact_id?: string
  followup_contact_id?: string
  assignee_ids?: string[]
}

export interface DefectUpdateData {
  description?: string
  category?: string
  defect_type?: string
  area_id?: string
  status?: string
  severity?: string
  is_repeated?: boolean
  due_date?: string
  reporter_id?: string
  assigned_contact_id?: string
  followup_contact_id?: string
}

export const defectsApi = {
  list: async (projectId: string, filters?: { status?: string; category?: string; severity?: string }): Promise<Defect[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.category) params.set('category', filters.category)
    if (filters?.severity) params.set('severity', filters.severity)
    const qs = params.toString()
    const response = await apiClient.get(`/projects/${projectId}/defects${qs ? `?${qs}` : ''}`)
    return response.data
  },

  get: async (projectId: string, defectId: string): Promise<Defect> => {
    const response = await apiClient.get(`/projects/${projectId}/defects/${defectId}`)
    return response.data
  },

  create: async (projectId: string, data: DefectCreateData): Promise<Defect> => {
    const response = await apiClient.post(`/projects/${projectId}/defects`, data)
    return response.data
  },

  update: async (projectId: string, defectId: string, data: DefectUpdateData): Promise<Defect> => {
    const response = await apiClient.put(`/projects/${projectId}/defects/${defectId}`, data)
    return response.data
  },

  delete: async (projectId: string, defectId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/defects/${defectId}`)
  },

  getSummary: async (projectId: string): Promise<DefectSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/defects/summary`)
    return response.data
  },

  addAssignee: async (projectId: string, defectId: string, contactId: string): Promise<Defect> => {
    const response = await apiClient.post(`/projects/${projectId}/defects/${defectId}/assignees?contact_id=${contactId}`)
    return response.data
  },

  removeAssignee: async (projectId: string, defectId: string, contactId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/defects/${defectId}/assignees/${contactId}`)
  },
}
