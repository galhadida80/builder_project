import { apiClient } from './client'
import type { Contact } from '../types'

interface ContactCreate {
  name: string
  company?: string
  role?: string
  email?: string
  phone?: string
  notes?: string
}

interface ContactUpdate {
  name?: string
  company?: string
  role?: string
  email?: string
  phone?: string
  notes?: string
}

export const contactsApi = {
  list: async (projectId: string): Promise<Contact[]> => {
    const response = await apiClient.get(`/projects/${projectId}/contacts`)
    return response.data
  },

  get: async (projectId: string, id: string): Promise<Contact> => {
    const response = await apiClient.get(`/projects/${projectId}/contacts/${id}`)
    return response.data
  },

  create: async (projectId: string, data: ContactCreate): Promise<Contact> => {
    const response = await apiClient.post(`/projects/${projectId}/contacts`, data)
    return response.data
  },

  update: async (projectId: string, id: string, data: ContactUpdate): Promise<Contact> => {
    const response = await apiClient.put(`/projects/${projectId}/contacts/${id}`, data)
    return response.data
  },

  delete: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/contacts/${id}`)
  },
}
