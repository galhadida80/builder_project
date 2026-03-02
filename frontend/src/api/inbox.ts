import { apiClient } from './client'
import type { InboxResponse } from '../types'

export const inboxApi = {
  getMyInbox: async (projectId?: string): Promise<InboxResponse> => {
    const params = new URLSearchParams()
    if (projectId) params.set('project_id', projectId)
    const qs = params.toString()
    const response = await apiClient.get(`/my-inbox${qs ? `?${qs}` : ''}`)
    return response.data
  },
}
