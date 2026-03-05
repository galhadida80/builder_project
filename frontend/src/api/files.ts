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
}

export interface BatchUploadMetadata {
  entityType: string
  entityId: string
}

export interface ProcessingTask {
  id: string
  batchUploadId: string
  fileId: string
  taskType: string
  status: string
  progressPercent: number
  errorMessage?: string
  celeryTaskId?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface BatchUploadRecord {
  id: string
  projectId: string
  userId: string
  totalFiles: number
  completedFiles: number
  failedFiles: number
  status: string
  createdAt: string
  updatedAt: string
  processingTasks: ProcessingTask[]
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

  getFileBlob: async (projectId: string, id: string): Promise<string> => {
    const response = await apiClient.get(`/projects/${projectId}/files/${id}/content`, {
      responseType: 'blob',
    })
    return URL.createObjectURL(response.data)
  },

  batchUpload: async (
    projectId: string,
    files: File[],
    metadata: BatchUploadMetadata
  ): Promise<BatchUploadRecord> => {
    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })
    formData.append('entity_type', metadata.entityType)
    formData.append('entity_id', metadata.entityId)
    const response = await apiClient.post(
      `/projects/${projectId}/batch-uploads`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  getBatchStatus: async (batchId: string): Promise<BatchUploadRecord> => {
    const response = await apiClient.get(`/batch-uploads/${batchId}`)
    return response.data
  },

  triggerProcessing: async (batchId: string): Promise<{ taskId: string; batchId: string }> => {
    const response = await apiClient.post(`/batch-uploads/${batchId}/process`)
    return response.data
  },
}
