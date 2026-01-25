import { apiClient } from './client'
import type { Equipment } from '../types'

interface EquipmentCreate {
  name: string
  equipmentType?: string
  manufacturer?: string
  modelNumber?: string
  serialNumber?: string
  specifications?: Record<string, unknown>
  installationDate?: string
  warrantyExpiry?: string
  notes?: string
}

interface EquipmentUpdate {
  name?: string
  equipmentType?: string
  manufacturer?: string
  modelNumber?: string
  serialNumber?: string
  specifications?: Record<string, unknown>
  installationDate?: string
  warrantyExpiry?: string
  notes?: string
}

interface ChecklistCreate {
  checklistName: string
  items: Array<{ name: string; completed: boolean }>
}

export const equipmentApi = {
  list: async (projectId: string): Promise<Equipment[]> => {
    const response = await apiClient.get(`/projects/${projectId}/equipment`)
    return response.data
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

  submit: async (projectId: string, id: string): Promise<Equipment> => {
    const response = await apiClient.post(`/projects/${projectId}/equipment/${id}/submit`)
    return response.data
  },

  addChecklist: async (projectId: string, equipmentId: string, data: ChecklistCreate) => {
    const response = await apiClient.post(`/projects/${projectId}/equipment/${equipmentId}/checklists`, data)
    return response.data
  },
}
