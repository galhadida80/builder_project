import { apiClient } from './client'

export interface Invitation {
  id: string
  projectId: string
  email: string
  role: string
  token: string
  status: string
  inviteUrl: string
  invitedById: string
  expiresAt: string
  createdAt: string
}

export interface InvitationValidation {
  email: string
  role: string
  projectName: string | null
  projectId: string
}

export const invitationsApi = {
  create: async (projectId: string, data: { email: string; role: string }): Promise<Invitation> => {
    const response = await apiClient.post<Invitation>(`/projects/${projectId}/invitations`, data)
    return response.data
  },

  list: async (projectId: string): Promise<Invitation[]> => {
    const response = await apiClient.get<Invitation[]>(`/projects/${projectId}/invitations`)
    return response.data
  },

  revoke: async (projectId: string, invitationId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/invitations/${invitationId}`)
  },

  validate: async (token: string): Promise<InvitationValidation> => {
    const response = await apiClient.get<InvitationValidation>('/invitations/validate', {
      params: { token },
    })
    return response.data
  },

  accept: async (token: string): Promise<{ message: string; projectId?: string }> => {
    const response = await apiClient.post<{ message: string; projectId?: string }>(
      '/invitations/accept',
      null,
      { params: { token } }
    )
    return response.data
  },
}
