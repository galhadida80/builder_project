import { apiClient } from './client'
import type { User } from '../types'

interface LoginResponse {
  accessToken: string
  tokenType: string
  user: {
    id: string
    email: string
    fullName: string | null
    phone: string | null
    company: string | null
    role: string | null
    isActive: boolean
    isSuperAdmin: boolean
    createdAt: string
  }
}

function transformUser(apiUser: LoginResponse['user']): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    fullName: apiUser.fullName || '',
    phone: apiUser.phone || undefined,
    company: apiUser.company || undefined,
    role: apiUser.role || undefined,
    isActive: apiUser.isActive,
    isSuperAdmin: apiUser.isSuperAdmin,
    createdAt: apiUser.createdAt,
  }
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password })
    return {
      access_token: response.data.accessToken,
      user: transformUser(response.data.user),
    }
  },

  register: async (email: string, password: string, fullName: string, inviteToken?: string): Promise<{ access_token: string; user: User }> => {
    const params = inviteToken ? { invite_token: inviteToken } : undefined
    const response = await apiClient.post<LoginResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
    }, { params })
    return {
      access_token: response.data.accessToken,
      user: transformUser(response.data.user),
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<LoginResponse['user']>('/auth/me')
    return transformUser(response.data)
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email })
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, new_password: newPassword })
  },

  updateProfile: async (data: { full_name?: string; phone?: string; company?: string }): Promise<User> => {
    const response = await apiClient.put<LoginResponse['user']>('/auth/me', data)
    return transformUser(response.data)
  },
}
