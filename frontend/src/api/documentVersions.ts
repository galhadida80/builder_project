import { apiClient } from './client'

export interface DocumentVersion {
  id: string
  fileId: string
  versionNumber: number
  filename: string
  storagePath: string
  fileSize?: number
  changeSummary?: string
  uploadedById?: string
  uploadedBy?: { id: string; fullName: string; email: string }
  createdAt: string
}

export interface DocumentAnnotation {
  id: string
  fileId: string
  pageNumber: number
  xPosition: number
  yPosition: number
  width?: number
  height?: number
  annotationType: string
  content: string
  color?: string
  createdById?: string
  createdBy?: { id: string; fullName: string; email: string }
  isResolved: boolean
  createdAt: string
  updatedAt: string
}

export interface AnnotationCreate {
  pageNumber: number
  xPosition: number
  yPosition: number
  width?: number
  height?: number
  annotationType?: string
  content: string
  color?: string
}

export const documentVersionsApi = {
  listVersions: async (projectId: string, fileId: string): Promise<DocumentVersion[]> => {
    const res = await apiClient.get<DocumentVersion[]>(`/projects/${projectId}/files/${fileId}/versions`)
    return res.data
  },

  createVersion: async (projectId: string, fileId: string, changeSummary?: string): Promise<DocumentVersion> => {
    const res = await apiClient.post<DocumentVersion>(`/projects/${projectId}/files/${fileId}/versions`, { changeSummary })
    return res.data
  },

  listAnnotations: async (projectId: string, fileId: string, pageNumber?: number): Promise<DocumentAnnotation[]> => {
    const params = pageNumber ? { page_number: pageNumber } : {}
    const res = await apiClient.get<DocumentAnnotation[]>(`/projects/${projectId}/files/${fileId}/annotations`, { params })
    return res.data
  },

  createAnnotation: async (projectId: string, fileId: string, data: AnnotationCreate): Promise<DocumentAnnotation> => {
    const res = await apiClient.post<DocumentAnnotation>(`/projects/${projectId}/files/${fileId}/annotations`, data)
    return res.data
  },

  updateAnnotation: async (annotationId: string, data: { content?: string; isResolved?: boolean; color?: string }): Promise<DocumentAnnotation> => {
    const res = await apiClient.patch<DocumentAnnotation>(`/annotations/${annotationId}`, data)
    return res.data
  },

  deleteAnnotation: async (annotationId: string): Promise<void> => {
    await apiClient.delete(`/annotations/${annotationId}`)
  },
}
