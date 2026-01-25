import { apiClient } from './client'
import type { Material } from '../types'

interface MaterialCreate {
  name: string
  materialType?: string
  manufacturer?: string
  modelNumber?: string
  quantity?: number
  unit?: string
  specifications?: Record<string, unknown>
  expectedDelivery?: string
  storageLocation?: string
  notes?: string
}

interface MaterialUpdate {
  name?: string
  materialType?: string
  manufacturer?: string
  modelNumber?: string
  quantity?: number
  unit?: string
  specifications?: Record<string, unknown>
  expectedDelivery?: string
  actualDelivery?: string
  storageLocation?: string
  notes?: string
}

export const materialsApi = {
  list: async (projectId: string): Promise<Material[]> => {
    const response = await apiClient.get(`/projects/${projectId}/materials`)
    return response.data
  },

  get: async (projectId: string, id: string): Promise<Material> => {
    const response = await apiClient.get(`/projects/${projectId}/materials/${id}`)
    return response.data
  },

  create: async (projectId: string, data: MaterialCreate): Promise<Material> => {
    const response = await apiClient.post(`/projects/${projectId}/materials`, data)
    return response.data
  },

  update: async (projectId: string, id: string, data: MaterialUpdate): Promise<Material> => {
    const response = await apiClient.put(`/projects/${projectId}/materials/${id}`, data)
    return response.data
  },

  delete: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/materials/${id}`)
  },

  submit: async (projectId: string, id: string): Promise<Material> => {
    const response = await apiClient.post(`/projects/${projectId}/materials/${id}/submit`)
    return response.data
  },
}
