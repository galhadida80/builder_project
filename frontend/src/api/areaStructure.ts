import { apiClient } from './client'
import type {
  AreaChecklistAssignment,
  BulkAreaCreate,
  BulkAreaCreateResponse,
  AreaChecklistSummary,
} from '../types'

interface AssignmentCreate {
  area_type: string
  template_id: string
  auto_create?: boolean
}

export const areaStructureApi = {
  bulkCreateAreas: async (projectId: string, data: BulkAreaCreate): Promise<BulkAreaCreateResponse> => {
    const response = await apiClient.post(`/projects/${projectId}/areas/bulk`, data)
    return response.data
  },

  getChecklistAssignments: async (projectId: string): Promise<AreaChecklistAssignment[]> => {
    const response = await apiClient.get(`/projects/${projectId}/area-checklist-assignments`)
    return response.data
  },

  createChecklistAssignment: async (projectId: string, data: AssignmentCreate): Promise<AreaChecklistAssignment> => {
    const response = await apiClient.post(`/projects/${projectId}/area-checklist-assignments`, data)
    return response.data
  },

  deleteChecklistAssignment: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/area-checklist-assignments/${id}`)
  },

  createAreaChecklists: async (projectId: string, areaId: string): Promise<{ checklists_created: number }> => {
    const response = await apiClient.post(`/projects/${projectId}/areas/${areaId}/create-checklists`)
    return response.data
  },

  getAreaChecklistSummary: async (projectId: string, areaId: string): Promise<AreaChecklistSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/areas/${areaId}/checklist-summary`)
    return response.data
  },
}
