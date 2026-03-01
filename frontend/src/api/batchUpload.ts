import { apiClient } from './client'

export interface BatchUploadResponse {
  id: string
  projectId: string
  totalFiles: number
  processedFiles: number
  failedFiles: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  metadataJson: Record<string, string> | null
  createdAt: string
  completedAt: string | null
  uploader: {
    id: string
    full_name: string
  } | null
}

export interface BatchUploadFileResponse {
  id: string
  filename: string
  fileType: string | null
  fileSize: number | null
  storagePath: string
  uploadedAt: string
}

export interface BatchUploadStatusResponse extends BatchUploadResponse {
  files: BatchUploadFileResponse[]
}

export interface BatchUploadMetadata {
  entityType?: string
  entityId?: string
  category?: string
  building?: string
  floor?: string
}

export async function uploadBatch(
  projectId: string,
  files: File[],
  metadata?: BatchUploadMetadata,
): Promise<BatchUploadResponse> {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))

  if (metadata?.entityType) formData.append('entity_type', metadata.entityType)
  if (metadata?.entityId) formData.append('entity_id', metadata.entityId)
  if (metadata?.category) formData.append('category', metadata.category)
  if (metadata?.building) formData.append('building', metadata.building)
  if (metadata?.floor) formData.append('floor', metadata.floor)

  const response = await apiClient.post<BatchUploadResponse>(
    `/projects/${projectId}/batch-uploads`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return response.data
}

export async function getBatchStatus(
  projectId: string,
  batchId: string,
): Promise<BatchUploadStatusResponse> {
  const response = await apiClient.get<BatchUploadStatusResponse>(
    `/projects/${projectId}/batch-uploads/${batchId}`,
  )
  return response.data
}

export async function listBatches(
  projectId: string,
): Promise<BatchUploadResponse[]> {
  const response = await apiClient.get<BatchUploadResponse[]>(
    `/projects/${projectId}/batch-uploads`,
  )
  return response.data
}
