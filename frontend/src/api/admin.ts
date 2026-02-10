import { apiClient } from './client'
import type { User, Project } from '../types'

export const adminApi = {
  listUsers: async (): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/admin/users')
    return response.data
  },

  updateUser: async (userId: string, data: { is_active?: boolean; is_super_admin?: boolean }): Promise<User> => {
    const response = await apiClient.patch<User>(`/admin/users/${userId}`, data)
    return response.data
  },

  listProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/admin/projects')
    return response.data
  },
}
