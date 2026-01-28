import { apiClient } from './client'
import type { ApprovalRequest } from '../types'

interface ApprovalAction {
  action: 'approve' | 'reject' | 'revision'
  comments?: string
}

export const approvalsApi = {
  list: async (projectId?: string): Promise<ApprovalRequest[]> => {
    const url = projectId ? `/projects/${projectId}/approvals` : '/approvals'
    const response = await apiClient.get(url)
    return response.data
  },

  approve: async (id: string, comments?: string): Promise<ApprovalRequest> => {
    const response = await apiClient.post(`/approvals/${id}/approve`, { comments })
    return response.data
  },

  reject: async (id: string, comments: string): Promise<ApprovalRequest> => {
    const response = await apiClient.post(`/approvals/${id}/reject`, { comments })
    return response.data
  },

  get: async (projectId: string, id: string): Promise<ApprovalRequest> => {
    const response = await apiClient.get(`/projects/${projectId}/approvals/${id}`)
    return response.data
  },

  processStep: async (projectId: string, approvalId: string, stepId: string, data: ApprovalAction) => {
    const response = await apiClient.post(
      `/projects/${projectId}/approvals/${approvalId}/steps/${stepId}/action`,
      data
    )
    return response.data
  },

  myPending: async (): Promise<ApprovalRequest[]> => {
    const response = await apiClient.get('/my-approvals')
    return response.data
  },
}
