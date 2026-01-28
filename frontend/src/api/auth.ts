import { apiClient } from './client'
import type { User } from '../types'

interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    company: string | null
    role: string | null
    is_active: boolean
    created_at: string
  }
}

function transformUser(apiUser: LoginResponse['user']): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    fullName: apiUser.full_name || '',
    phone: apiUser.phone || undefined,
    company: apiUser.company || undefined,
    role: apiUser.role || undefined,
    isActive: apiUser.is_active,
    createdAt: apiUser.created_at,
  }
}

export const authApi = {
  login: async (email: string, password: string): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password })
    return {
      access_token: response.data.access_token,
      user: transformUser(response.data.user),
    }
  },

  register: async (email: string, password: string, fullName: string): Promise<{ access_token: string; user: User }> => {
    const response = await apiClient.post<LoginResponse>('/auth/register', {
      email,
      password,
      full_name: fullName,
    })
    return {
      access_token: response.data.access_token,
      user: transformUser(response.data.user),
    }
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<LoginResponse['user']>('/auth/me')
    return transformUser(response.data)
  },
}
