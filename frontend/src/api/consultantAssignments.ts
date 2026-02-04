import { apiClient } from './client'
import type {
  ConsultantAssignment,
  ConsultantAssignmentCreate,
  ConsultantAssignmentUpdate,
} from '../types/consultantAssignment'

export const consultantAssignmentsApi = {
  list: async (projectId?: string): Promise<ConsultantAssignment[]> => {
    const url = projectId
      ? `/projects/${projectId}/consultant-assignments`
      : '/consultant-assignments'
    const response = await apiClient.get(url)
    return response.data
  },

  get: async (id: string): Promise<ConsultantAssignment> => {
    const response = await apiClient.get(`/consultant-assignments/${id}`)
    return response.data
  },

  create: async (data: ConsultantAssignmentCreate): Promise<ConsultantAssignment> => {
    const response = await apiClient.post('/consultant-assignments', data)
    return response.data
  },

  update: async (id: string, data: ConsultantAssignmentUpdate): Promise<ConsultantAssignment> => {
    const response = await apiClient.put(`/consultant-assignments/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/consultant-assignments/${id}`)
  },
}
