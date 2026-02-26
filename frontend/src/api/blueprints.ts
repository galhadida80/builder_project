import { apiClient } from './client'

export interface BlueprintExtractionListItem {
  id: string
  projectId: string
  fileId?: string
  bimModelId?: string
  extractionSource: string
  status: string
  summary?: Record<string, number>
  tierUsed?: string
  processingTimeMs?: number
  language: string
  version: number
  createdAt: string
  updatedAt: string
  filename?: string
}

export interface BlueprintExtractionDetail extends BlueprintExtractionListItem {
  extractedData?: {
    floors?: Array<{
      floorNumber: number
      floorName?: string
      totalAreaSqm?: number
      rooms: Array<{
        name: string
        roomType?: string
        areaSqm?: number
        perimeterM?: number
        heightM?: number
        doors: Array<{ doorType?: string; widthCm?: number; heightCm?: number; quantity?: number }>
        windows: Array<{ windowType?: string; widthCm?: number; heightCm?: number; quantity?: number }>
        finishes?: { floorMaterial?: string; wallMaterial?: string; ceilingMaterial?: string }
      }>
    }>
    areas?: Array<{
      bimObjectId: number
      name: string
      areaType?: string
      floorNumber?: number
      areaCode?: string
    }>
    equipment?: Array<{
      bimObjectId: number
      name: string
      equipmentType?: string
      manufacturer?: string
      modelNumber?: string
    }>
    materials?: Array<{
      bimObjectId: number
      name: string
      materialType?: string
      manufacturer?: string
      modelNumber?: string
    }>
  }
  errorMessage?: string
}

export interface BlueprintUploadResponse {
  id: string
  status: string
  extractionSource: string
  filename: string
}

export interface BlueprintImportResult {
  importedCount: number
  skippedCount: number
  entityType: string
  importedEntityIds: string[]
}

export const blueprintsApi = {
  upload: async (projectId: string, file: File, language: string = 'he'): Promise<BlueprintUploadResponse> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(
      `/projects/${projectId}/blueprints/upload?language=${language}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 },
    )
    return response.data
  },

  list: async (projectId: string): Promise<BlueprintExtractionListItem[]> => {
    const response = await apiClient.get(`/projects/${projectId}/blueprints`)
    return response.data
  },

  get: async (projectId: string, extractionId: string): Promise<BlueprintExtractionDetail> => {
    const response = await apiClient.get(`/projects/${projectId}/blueprints/${extractionId}`)
    return response.data
  },

  reExtract: async (projectId: string, extractionId: string): Promise<BlueprintExtractionDetail> => {
    const response = await apiClient.post(`/projects/${projectId}/blueprints/${extractionId}/re-extract`)
    return response.data
  },

  importAreas: async (
    projectId: string,
    extractionId: string,
    items: number[] = [],
    floorIndices: number[] = [],
  ): Promise<BlueprintImportResult> => {
    const response = await apiClient.post(
      `/projects/${projectId}/blueprints/${extractionId}/import/areas`,
      { items, floor_indices: floorIndices },
    )
    return response.data
  },

  importEquipment: async (
    projectId: string,
    extractionId: string,
    items: number[],
  ): Promise<BlueprintImportResult> => {
    const response = await apiClient.post(
      `/projects/${projectId}/blueprints/${extractionId}/import/equipment`,
      { items },
    )
    return response.data
  },

  importMaterials: async (
    projectId: string,
    extractionId: string,
    items: number[],
  ): Promise<BlueprintImportResult> => {
    const response = await apiClient.post(
      `/projects/${projectId}/blueprints/${extractionId}/import/materials`,
      { items },
    )
    return response.data
  },

  delete: async (projectId: string, extractionId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/blueprints/${extractionId}`)
  },
}
