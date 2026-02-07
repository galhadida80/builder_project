import { apiClient } from './client'

export interface FileRecord {
  id: string
  projectId: string
  entityType: string
  entityId: string
  filename: string
  fileType: string
  fileSize: number
  storagePath: string
  uploadedAt: string
  uploadedById?: string
  uploadedBy?: { id: string; email: string; fullName?: string }
}

export interface DocumentAnalysis {
  id: string
  fileId: string
  projectId: string
  analysisType: string
  result: Record<string, unknown> | null
  modelUsed: string
  status: string
  errorMessage: string | null
  processingTimeMs: number | null
  createdAt: string
  updatedAt: string
}

export const filesApi = {
  list: async (projectId: string, entityType?: string, entityId?: string): Promise<FileRecord[]> => {
    const params = new URLSearchParams()
    if (entityType) params.append('entity_type', entityType)
    if (entityId) params.append('entity_id', entityId)
    const query = params.toString()
    const response = await apiClient.get(`/projects/${projectId}/files${query ? `?${query}` : ''}`)
    return response.data
  },

  upload: async (projectId: string, entityType: string, entityId: string, file: File): Promise<FileRecord> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(
      `/projects/${projectId}/files?entity_type=${entityType}&entity_id=${entityId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  delete: async (projectId: string, fileId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/files/${fileId}`)
  },

  getDownloadUrl: async (projectId: string, fileId: string): Promise<string> => {
    const response = await apiClient.get(`/projects/${projectId}/files/${fileId}/download`)
    return response.data.download_url
  },

  analyze: async (projectId: string, fileId: string, analysisType: string): Promise<DocumentAnalysis> => {
    const response = await apiClient.post(`/projects/${projectId}/files/${fileId}/analyze`, {
      file_id: fileId,
      analysis_type: analysisType,
    })
    return response.data
  },

  getAnalysis: async (projectId: string, fileId: string): Promise<DocumentAnalysis[]> => {
    const response = await apiClient.get(`/projects/${projectId}/files/${fileId}/analysis`)
    return response.data
  },
}
