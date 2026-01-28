import { apiClient } from './client'
import type { ConstructionArea } from '../types'

interface AreaCreate {
  name: string
  areaType?: string
  floorNumber?: number
  areaCode?: string
  totalUnits?: number
  parentId?: string
}

interface AreaUpdate {
  name?: string
  areaType?: string
  floorNumber?: number
  areaCode?: string
  totalUnits?: number
}

interface ProgressCreate {
  progressPercentage: number
  notes?: string
  photos?: string[]
}

interface AreaProgress {
  id: string
  areaId: string
  progressPercentage: number
  notes?: string
  photos?: string[]
  reportedAt: string
  reportedBy?: { id: string; fullName: string }
}

export const areasApi = {
  list: async (projectId: string): Promise<ConstructionArea[]> => {
    const response = await apiClient.get(`/projects/${projectId}/areas`)
    return response.data
  },

  get: async (projectId: string, id: string): Promise<ConstructionArea> => {
    const response = await apiClient.get(`/projects/${projectId}/areas/${id}`)
    return response.data
  },

  create: async (projectId: string, data: AreaCreate): Promise<ConstructionArea> => {
    const response = await apiClient.post(`/projects/${projectId}/areas`, data)
    return response.data
  },

  update: async (projectId: string, id: string, data: AreaUpdate): Promise<ConstructionArea> => {
    const response = await apiClient.put(`/projects/${projectId}/areas/${id}`, data)
    return response.data
  },

  delete: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/areas/${id}`)
  },

  addProgress: async (projectId: string, areaId: string, data: ProgressCreate): Promise<AreaProgress> => {
    const response = await apiClient.post(`/projects/${projectId}/areas/${areaId}/progress`, data)
    return response.data
  },

  listProgress: async (projectId: string, areaId: string): Promise<AreaProgress[]> => {
    const response = await apiClient.get(`/projects/${projectId}/areas/${areaId}/progress`)
    return response.data
  },
}
