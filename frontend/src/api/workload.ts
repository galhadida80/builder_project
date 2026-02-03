import { apiClient } from './client'
import type { TeamMember, Workload, WorkloadAssignment } from '../types'

interface WorkloadQueryParams {
  projectId?: string
  startDate?: string
  endDate?: string
  userId?: string
}

interface WorkloadCreate {
  teamMemberId: string
  periodStart: string
  periodEnd: string
  assignments: Array<{
    type: 'meeting' | 'inspection' | 'approval' | 'task'
    entityId: string
    title: string
    estimatedHours: number
    scheduledDate?: string
  }>
}

export const workloadApi = {
  list: async (params?: WorkloadQueryParams): Promise<Workload[]> => {
    const response = await apiClient.get('/workload', { params })
    return response.data
  },

  get: async (id: string): Promise<Workload> => {
    const response = await apiClient.get(`/workload/${id}`)
    return response.data
  },

  getTeamMembers: async (projectId?: string): Promise<TeamMember[]> => {
    const url = projectId ? `/projects/${projectId}/members` : '/team-members'
    const response = await apiClient.get(url)
    return response.data
  },

  getByDateRange: async (startDate: string, endDate: string, projectId?: string): Promise<Workload[]> => {
    const params: WorkloadQueryParams = {
      startDate,
      endDate,
      projectId,
    }
    const response = await apiClient.get('/workload', { params })
    return response.data
  },

  getByUserId: async (userId: string, startDate?: string, endDate?: string): Promise<Workload[]> => {
    const params: WorkloadQueryParams = {
      userId,
      startDate,
      endDate,
    }
    const response = await apiClient.get('/workload', { params })
    return response.data
  },

  create: async (data: WorkloadCreate): Promise<Workload> => {
    const response = await apiClient.post('/workload', data)
    return response.data
  },

  getAssignments: async (teamMemberId: string, startDate?: string, endDate?: string): Promise<WorkloadAssignment[]> => {
    const params = {
      startDate,
      endDate,
    }
    const response = await apiClient.get(`/team-members/${teamMemberId}/assignments`, { params })
    return response.data
  },
}
