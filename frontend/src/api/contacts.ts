import { apiClient } from './client'
import type { Contact } from '../types'

interface ContactCreate {
  contact_type: string
  company_name?: string
  contact_name: string
  email?: string
  phone?: string
  role_description?: string
  is_primary?: boolean
  user_id?: string
}

interface ContactUpdate {
  contact_type?: string
  company_name?: string
  contact_name?: string
  email?: string
  phone?: string
  role_description?: string
  is_primary?: boolean
  user_id?: string | null
}

export interface ContactImportResult {
  importedCount: number
  skippedCount: number
  errors: string[]
}

export interface ContactImportRow {
  contact_name: string
  contact_type: string
  company_name?: string
  email?: string
  phone?: string
  role_description?: string
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

  importCsv: async (projectId: string, file: File): Promise<ContactImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/projects/${projectId}/contacts/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  importBulk: async (projectId: string, contacts: ContactImportRow[]): Promise<ContactImportResult> => {
    const response = await apiClient.post(`/projects/${projectId}/contacts/import-bulk`, { contacts })
    return response.data
  },

  exportCsv: async (projectId: string): Promise<Blob> => {
    const response = await apiClient.get(`/projects/${projectId}/contacts/export`, {
      responseType: 'blob',
    })
    return response.data
  },
}
