import { apiClient } from './client'
import type { Project, ProjectMember } from '../types'

interface ProjectCreate {
  name: string
  description?: string
  address?: string
  start_date?: string
  estimated_end_date?: string
  location_lat?: number
  location_lng?: number
  location_address?: string
}

interface ProjectUpdate {
  name?: string
  description?: string
  address?: string
  status?: string
  start_date?: string
  estimated_end_date?: string
  location_lat?: number | null
  location_lng?: number | null
  location_address?: string | null
  notification_digest_interval_hours?: number
  image_url?: string | null
}

interface MemberCreate {
  user_id: string
  role: string
}

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const response = await apiClient.get('/projects')
    return response.data
  },

  get: async (id: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${id}`)
    return response.data
  },

  create: async (data: ProjectCreate): Promise<Project> => {
    const response = await apiClient.post('/projects', data)
    return response.data
  },

  update: async (id: string, data: ProjectUpdate): Promise<Project> => {
    const response = await apiClient.put(`/projects/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/projects/${id}`)
  },

  addMember: async (projectId: string, data: MemberCreate): Promise<ProjectMember> => {
    const response = await apiClient.post(`/projects/${projectId}/members`, data)
    return response.data
  },

  removeMember: async (projectId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/members/${userId}`)
  },

  uploadImage: async (projectId: string, imageData: string): Promise<Project> => {
    const response = await apiClient.put(`/projects/${projectId}/image`, { image_data: imageData })
    return response.data
  },

  deleteImage: async (projectId: string): Promise<Project> => {
    const response = await apiClient.delete(`/projects/${projectId}/image`)
    return response.data
  },

  getImageUrl: (projectId: string): string => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    return `${baseUrl}/projects/${projectId}/image`
  },
}
