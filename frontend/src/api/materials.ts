import { apiClient } from './client'
import type { Material } from '../types'

interface MaterialCreate {
  name: string
  material_type?: string
  manufacturer?: string
  model_number?: string
  quantity?: number
  unit?: string
  specifications?: Record<string, unknown>
  expected_delivery?: string
  storage_location?: string
  notes?: string
}

interface MaterialUpdate {
  name?: string
  material_type?: string
  manufacturer?: string
  model_number?: string
  quantity?: number
  unit?: string
  specifications?: Record<string, unknown>
  expected_delivery?: string
  actual_delivery?: string
  storage_location?: string
  notes?: string
}

export const materialsApi = {
  list: async (projectId?: string): Promise<Material[]> => {
    const url = projectId ? `/projects/${projectId}/materials` : '/materials'
    const response = await apiClient.get(url)
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
