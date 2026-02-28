import { apiClient } from './client'
import type { ExportRequest, ExportJob, ExportFilters } from '../types/export'

export const exportsApi = {
  // Project-level exports
  create: async (projectId: string, data: ExportRequest): Promise<ExportJob> => {
    const response = await apiClient.post(`/projects/${projectId}/exports`, data)
    return response.data
  },

  list: async (projectId: string): Promise<ExportJob[]> => {
    const response = await apiClient.get(`/projects/${projectId}/exports`)
    return response.data
  },

  get: async (projectId: string, exportId: string): Promise<ExportJob> => {
    const response = await apiClient.get(`/projects/${projectId}/exports/${exportId}`)
    return response.data
  },

  download: async (projectId: string, exportId: string): Promise<Blob> => {
    const response = await apiClient.get(`/projects/${projectId}/exports/${exportId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  // Organization-level exports
  createOrganizationExport: async (organizationId: string, data: ExportRequest): Promise<ExportJob> => {
    const response = await apiClient.post(`/organizations/${organizationId}/exports`, data)
    return response.data
  },

  listOrganizationExports: async (organizationId: string): Promise<ExportJob[]> => {
    const response = await apiClient.get(`/organizations/${organizationId}/exports`)
    return response.data
  },

  // All projects exports (user has access to)
  createAllProjectsExport: async (data: ExportRequest): Promise<ExportJob> => {
    const response = await apiClient.post('/exports', data)
    return response.data
  },

  listAllExports: async (): Promise<ExportJob[]> => {
    const response = await apiClient.get('/exports')
    return response.data
  },
}
