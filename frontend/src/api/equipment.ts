import { apiClient } from './client'
import type { Equipment } from '../types'

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

export const equipmentApi = {
  list: async (projectId?: string, filters?: { status?: string; search?: string }): Promise<Equipment[]> => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.search) params.set('search', filters.search)
    const qs = params.toString()
    const url = projectId ? `/projects/${projectId}/equipment` : '/equipment'
    const response = await apiClient.get(`${url}${qs ? `?${qs}` : ''}`)
    const data = response.data
    return Array.isArray(data) ? data : data.items ?? []
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
