import { apiClient } from './client'

export interface CollaboratorBrief {
  id: string
  userId: string
  fullName: string
  email: string
  isActive: boolean
  lastSeenAt: string | null
  cursorPosition: Record<string, unknown> | null
}

export interface CollaborativeDocument {
  id: string
  projectId: string
  title: string
  contentType: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  creatorName: string
  collaborators: CollaboratorBrief[]
  activeCount: number
}

export interface CollaborativeDocumentListItem {
  id: string
  projectId: string
  title: string
  contentType: string
  createdBy: string | null
  createdAt: string
  updatedAt: string
  creatorName: string
  activeCount: number
}

export interface CollaborativeDocumentCreateData {
  title: string
  content_type: string
}

export const collaborativeDocumentsApi = {
  list: async (projectId: string): Promise<CollaborativeDocumentListItem[]> => {
    const response = await apiClient.get(
      `/projects/${projectId}/collaborative-documents`
    )
    return response.data
  },

  get: async (projectId: string, docId: string): Promise<CollaborativeDocument> => {
    const response = await apiClient.get(
      `/projects/${projectId}/collaborative-documents/${docId}`
    )
    return response.data
  },

  create: async (
    projectId: string,
    data: CollaborativeDocumentCreateData
  ): Promise<CollaborativeDocument> => {
    const response = await apiClient.post(
      `/projects/${projectId}/collaborative-documents`,
      data
    )
    return response.data
  },

  update: async (
    projectId: string,
    docId: string,
    title: string
  ): Promise<CollaborativeDocument> => {
    const response = await apiClient.put(
      `/projects/${projectId}/collaborative-documents/${docId}`,
      { title }
    )
    return response.data
  },

  delete: async (projectId: string, docId: string): Promise<void> => {
    await apiClient.delete(
      `/projects/${projectId}/collaborative-documents/${docId}`
    )
  },

  join: async (
    projectId: string,
    docId: string
  ): Promise<{ message: string; collaborator_id: string }> => {
    const response = await apiClient.post(
      `/projects/${projectId}/collaborative-documents/${docId}/collaborators`
    )
    return response.data
  },

  leave: async (projectId: string, docId: string): Promise<void> => {
    await apiClient.delete(
      `/projects/${projectId}/collaborative-documents/${docId}/collaborators`
    )
  },
}

export function getCollabWebSocketUrl(documentId: string): string {
  const token = localStorage.getItem('authToken') || ''
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const apiBase = import.meta.env.VITE_API_URL || '/api/v1'
  const baseUrl = apiBase.startsWith('http')
    ? apiBase.replace(/^http/, 'ws')
    : `${wsProtocol}//${window.location.host}${apiBase}`
  return `${baseUrl}/ws/collab/${documentId}?token=${token}`
}
