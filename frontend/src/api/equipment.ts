import { apiClient } from './client'
import type { Equipment } from '../types'
import type { PaginatedResponse } from './types'

interface EquipmentCreate {
  name: string
  equipment_type?: string
  manufacturer?: string
  model_number?: string
  serial_number?: string
  specifications?: Record<string, unknown>
  installation_date?: string
  warranty_expiry?: string
  notes?: string
}

interface EquipmentUpdate {
  name?: string
  equipment_type?: string
  manufacturer?: string
  model_number?: string
  serial_number?: string
  specifications?: Record<string, unknown>
  installation_date?: string
  warranty_expiry?: string
  notes?: string
}

interface ChecklistCreate {
  checklist_name: string
  items: Array<{ id: string; label: string; is_completed: boolean }>
}

export interface EquipmentListParams {
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

export const equipmentApi = {
  list: async (projectId?: string, params?: EquipmentListParams): Promise<PaginatedResponse<Equipment>> => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.search) qs.set('search', params.search)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('page_size', String(params.pageSize))
    const query = qs.toString()
    const url = projectId ? `/projects/${projectId}/equipment` : '/equipment'
    const response = await apiClient.get(`${url}${query ? `?${query}` : ''}`)
    const data = response.data
    if (Array.isArray(data)) {
      return { items: data, total: data.length, page: 1, page_size: data.length, total_pages: 1 }
    }
    return data
  },

  get: async (projectId: string, id: string): Promise<Equipment> => {
    const response = await apiClient.get(`/projects/${projectId}/equipment/${id}`)
    return response.data
  },

  create: async (projectId: string, data: EquipmentCreate): Promise<Equipment> => {
    const response = await apiClient.post(`/projects/${projectId}/equipment`, data)
    return response.data
  },

  update: async (projectId: string, id: string, data: EquipmentUpdate): Promise<Equipment> => {
    const response = await apiClient.put(`/projects/${projectId}/equipment/${id}`, data)
    return response.data
  },

  delete: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/equipment/${id}`)
  },

  submit: async (projectId: string, id: string, body?: { consultant_contact_id?: string; inspector_contact_id?: string }): Promise<Equipment> => {
    const response = await apiClient.post(`/projects/${projectId}/equipment/${id}/submit`, body || {})
    return response.data
  },

  addChecklist: async (projectId: string, equipmentId: string, data: ChecklistCreate) => {
    const response = await apiClient.post(`/projects/${projectId}/equipment/${equipmentId}/checklists`, data)
    return response.data
  },
}
