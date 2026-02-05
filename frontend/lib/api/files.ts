import { apiClient } from './client'

export interface FileRecord {
  id: string
  project_id: string
  entity_type: string
  entity_id: string
  filename: string
  file_type: string
  file_size: number
  storage_path: string
  uploaded_at: string
  uploaded_by_id?: string
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
}
