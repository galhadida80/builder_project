import { apiClient } from './client'
import type {
  ChecklistTemplate,
  ChecklistTemplateCreate,
  ChecklistTemplateUpdate,
  ChecklistInstance,
  ChecklistInstanceCreate,
  ChecklistInstanceUpdate,
  ChecklistItemResponse,
  ChecklistItemResponseCreate,
  ChecklistItemResponseUpdate,
  FileAttachment
} from '../types'

export const checklistsApi = {
  // Template methods
  getTemplates: async (projectId: string): Promise<ChecklistTemplate[]> => {
    const response = await apiClient.get(`/projects/${projectId}/checklist-templates`)
    return response.data
  },

  getTemplate: async (templateId: string): Promise<ChecklistTemplate> => {
    const response = await apiClient.get(`/checklist-templates/${templateId}`)
    return response.data
  },

  createTemplate: async (projectId: string, data: ChecklistTemplateCreate): Promise<ChecklistTemplate> => {
    const response = await apiClient.post(`/projects/${projectId}/checklist-templates`, data)
    return response.data
  },

  updateTemplate: async (templateId: string, data: ChecklistTemplateUpdate): Promise<ChecklistTemplate> => {
    const response = await apiClient.put(`/checklist-templates/${templateId}`, data)
    return response.data
  },

  // Instance methods
  getInstances: async (projectId: string): Promise<ChecklistInstance[]> => {
    const response = await apiClient.get(`/projects/${projectId}/checklist-instances`)
    return response.data
  },

  getInstance: async (instanceId: string): Promise<ChecklistInstance> => {
    const response = await apiClient.get(`/checklist-instances/${instanceId}`)
    return response.data
  },

  createInstance: async (projectId: string, data: ChecklistInstanceCreate): Promise<ChecklistInstance> => {
    const response = await apiClient.post(`/projects/${projectId}/checklist-instances`, data)
    return response.data
  },

  updateInstance: async (instanceId: string, data: ChecklistInstanceUpdate): Promise<ChecklistInstance> => {
    const response = await apiClient.put(`/checklist-instances/${instanceId}`, data)
    return response.data
  },

  // Response methods
  createResponse: async (instanceId: string, data: ChecklistItemResponseCreate): Promise<ChecklistItemResponse> => {
    const response = await apiClient.post(`/checklist-instances/${instanceId}/responses`, data)
    return response.data
  },

  updateResponse: async (instanceId: string, responseId: string, data: ChecklistItemResponseUpdate): Promise<ChecklistItemResponse> => {
    const response = await apiClient.put(`/checklist-instances/${instanceId}/responses/${responseId}`, data)
    return response.data
  },

  // File upload method
  uploadFile: async (projectId: string, file: File): Promise<FileAttachment> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post(`/projects/${projectId}/files`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}
