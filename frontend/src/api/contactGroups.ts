import { apiClient } from './client'
import type { ContactGroup, ContactGroupListItem } from '../types'

interface ContactGroupCreate {
  name: string
  description?: string
  contact_ids: string[]
}

interface ContactGroupUpdate {
  name?: string
  description?: string
  contact_ids?: string[]
}

export const contactGroupsApi = {
  list: async (projectId: string): Promise<ContactGroupListItem[]> => {
    const response = await apiClient.get(`/projects/${projectId}/contact-groups`)
    return response.data
  },

  get: async (projectId: string, groupId: string): Promise<ContactGroup> => {
    const response = await apiClient.get(`/projects/${projectId}/contact-groups/${groupId}`)
    return response.data
  },

  create: async (projectId: string, data: ContactGroupCreate): Promise<ContactGroup> => {
    const response = await apiClient.post(`/projects/${projectId}/contact-groups`, data)
    return response.data
  },

  update: async (projectId: string, groupId: string, data: ContactGroupUpdate): Promise<ContactGroup> => {
    const response = await apiClient.put(`/projects/${projectId}/contact-groups/${groupId}`, data)
    return response.data
  },

  delete: async (projectId: string, groupId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/contact-groups/${groupId}`)
  },

  addMembers: async (projectId: string, groupId: string, contactIds: string[]): Promise<ContactGroup> => {
    const response = await apiClient.post(`/projects/${projectId}/contact-groups/${groupId}/members`, { contact_ids: contactIds })
    return response.data
  },

  removeMember: async (projectId: string, groupId: string, contactId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/contact-groups/${groupId}/members/${contactId}`)
  },
}
