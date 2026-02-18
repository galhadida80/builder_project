import { apiClient } from './client'
import type { Material } from '../types'
import type { PaginatedResponse } from './types'

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

export interface MaterialListParams {
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

export const materialsApi = {
  list: async (projectId?: string, params?: MaterialListParams): Promise<PaginatedResponse<Material>> => {
    const url = projectId ? `/projects/${projectId}/materials` : '/materials'
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('page_size', String(params.pageSize))
    const query = qs.toString()
    const response = await apiClient.get(`${url}${query ? `?${query}` : ''}`)
    const data = response.data
    if (Array.isArray(data)) {
      return { items: data, total: data.length, page: 1, page_size: data.length, total_pages: 1 }
    }
    return data
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

  submit: async (projectId: string, id: string, body?: { consultant_contact_id?: string; inspector_contact_id?: string }): Promise<Material> => {
    const response = await apiClient.post(`/projects/${projectId}/materials/${id}/submit`, body || {})
    return response.data
  },
}
