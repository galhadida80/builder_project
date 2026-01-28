import { apiClient } from './client'

interface FileRecord {
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

  get: async (projectId: string, id: string): Promise<FileRecord> => {
    const response = await apiClient.get(`/projects/${projectId}/files/${id}`)
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

  delete: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/files/${id}`)
  },

  getDownloadUrl: async (projectId: string, id: string): Promise<string> => {
    const response = await apiClient.get(`/projects/${projectId}/files/${id}/download`)
    return response.data.download_url
  },
}
