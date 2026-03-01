import { apiClient } from './client'
import type { BimModel, BimExtractionResponse, BimImportResult, Equipment, Material, ConstructionArea } from '../types'

export interface BimLinkedEntitiesResponse {
  equipment: Equipment[]
  materials: Material[]
  areas: ConstructionArea[]
}

export const bimApi = {
  list: async (projectId: string): Promise<BimModel[]> => {
    const response = await apiClient.get(`/projects/${projectId}/bim`)
    return response.data
  },

  get: async (projectId: string, modelId: string): Promise<BimModel> => {
    const response = await apiClient.get(`/projects/${projectId}/bim/${modelId}`)
    return response.data
  },

  upload: async (projectId: string, file: File): Promise<BimModel> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/projects/${projectId}/bim/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  translate: async (projectId: string, modelId: string): Promise<{ translationStatus: string; translationProgress: number }> => {
    const response = await apiClient.post(`/projects/${projectId}/bim/${modelId}/translate`)
    return response.data
  },

  getStatus: async (projectId: string, modelId: string): Promise<{ translationStatus: string; translationProgress: number }> => {
    const response = await apiClient.get(`/projects/${projectId}/bim/${modelId}/status`)
    return response.data
  },

  getViewerToken: async (projectId: string, modelId: string): Promise<{ accessToken: string; expiresIn: number }> => {
    const response = await apiClient.get(`/projects/${projectId}/bim/${modelId}/token`)
    return response.data
  },

  getFileContent: async (projectId: string, modelId: string): Promise<Blob> => {
    const response = await apiClient.get(`/projects/${projectId}/bim/${modelId}/content`, {
      responseType: 'blob',
    })
    return response.data
  },

  delete: async (projectId: string, modelId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/bim/${modelId}`)
  },

  extractData: async (projectId: string, modelId: string): Promise<BimExtractionResponse> => {
    const response = await apiClient.get(`/projects/${projectId}/bim/${modelId}/extract`)
    return response.data
  },

  refreshExtraction: async (projectId: string, modelId: string): Promise<BimExtractionResponse> => {
    const response = await apiClient.post(`/projects/${projectId}/bim/${modelId}/extract/refresh`)
    return response.data
  },

  importAreas: async (projectId: string, modelId: string, items: number[]): Promise<BimImportResult> => {
    const response = await apiClient.post(`/projects/${projectId}/bim/${modelId}/import/areas`, { items })
    return response.data
  },

  importEquipment: async (
    projectId: string,
    modelId: string,
    items: number[],
    itemMappings?: Array<{ bim_object_id: number; template_id?: string }>,
  ): Promise<BimImportResult> => {
    const response = await apiClient.post(`/projects/${projectId}/bim/${modelId}/import/equipment`, {
      items,
      item_mappings: itemMappings || [],
    })
    return response.data
  },

  importMaterials: async (
    projectId: string,
    modelId: string,
    items: number[],
    itemMappings?: Array<{ bim_object_id: number; template_id?: string }>,
  ): Promise<BimImportResult> => {
    const response = await apiClient.post(`/projects/${projectId}/bim/${modelId}/import/materials`, {
      items,
      item_mappings: itemMappings || [],
    })
    return response.data
  },

  getLinkedEntities: async (projectId: string, modelId: string): Promise<BimLinkedEntitiesResponse> => {
    const response = await apiClient.get(`/projects/${projectId}/bim/${modelId}/entities`)
    return response.data
  },
}
