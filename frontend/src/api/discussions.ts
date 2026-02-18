import { apiClient } from './client'

export interface Discussion {
  id: string
  projectId: string
  entityType: string
  entityId: string
  authorId: string
  parentId: string | null
  content: string
  createdAt: string
  updatedAt: string
  author: {
    id: string
    fullName: string
    email: string
  } | null
  replies: Discussion[]
}

export interface DiscussionCreateData {
  entity_type: string
  entity_id: string
  content: string
  parent_id?: string
}

export const discussionsApi = {
  list: async (projectId: string, entityType: string, entityId: string): Promise<Discussion[]> => {
    const response = await apiClient.get(
      `/projects/${projectId}/discussions?entity_type=${entityType}&entity_id=${entityId}`
    )
    return response.data
  },

  create: async (projectId: string, data: DiscussionCreateData): Promise<Discussion> => {
    const response = await apiClient.post(`/projects/${projectId}/discussions`, data)
    return response.data
  },

  update: async (projectId: string, discussionId: string, content: string): Promise<Discussion> => {
    const response = await apiClient.put(`/projects/${projectId}/discussions/${discussionId}`, { content })
    return response.data
  },

  delete: async (projectId: string, discussionId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/discussions/${discussionId}`)
  },
}
