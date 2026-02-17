import { apiClient } from './client'
import type { Organization, OrganizationMember } from '../types'

export interface OrgCreateData {
  name: string
  code: string
  description?: string
  logo_url?: string
}

export interface OrgUpdateData {
  name?: string
  code?: string
  description?: string
  logo_url?: string
}

export interface OrgMemberCreateData {
  user_id: string
  role?: string
}

export const organizationsApi = {
  list: async (): Promise<Organization[]> => {
    const response = await apiClient.get('/organizations')
    return response.data
  },
  create: async (data: OrgCreateData): Promise<Organization> => {
    const response = await apiClient.post('/organizations', data)
    return response.data
  },
  get: async (orgId: string): Promise<Organization> => {
    const response = await apiClient.get(`/organizations/${orgId}`)
    return response.data
  },
  update: async (orgId: string, data: OrgUpdateData): Promise<Organization> => {
    const response = await apiClient.put(`/organizations/${orgId}`, data)
    return response.data
  },
  listMembers: async (orgId: string): Promise<OrganizationMember[]> => {
    const response = await apiClient.get(`/organizations/${orgId}/members`)
    return response.data
  },
  addMember: async (orgId: string, data: OrgMemberCreateData): Promise<OrganizationMember> => {
    const response = await apiClient.post(`/organizations/${orgId}/members`, data)
    return response.data
  },
  updateMember: async (orgId: string, memberId: string, role: string): Promise<OrganizationMember> => {
    const response = await apiClient.put(`/organizations/${orgId}/members/${memberId}`, { role })
    return response.data
  },
  removeMember: async (orgId: string, memberId: string): Promise<void> => {
    await apiClient.delete(`/organizations/${orgId}/members/${memberId}`)
  },
  listProjects: async (orgId: string): Promise<any[]> => {
    const response = await apiClient.get(`/organizations/${orgId}/projects`)
    return response.data
  },
  getAnalytics: async (orgId: string): Promise<any> => {
    const response = await apiClient.get(`/organizations/${orgId}/analytics`)
    return response.data
  },
}
