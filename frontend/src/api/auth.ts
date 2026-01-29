import { apiClient } from './client'
import type { User } from '../types'

interface LoginResponse {
  accessToken: string
  tokenType: string
  user: User
}

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', {
      email,
      password
    })
    return response.data
  },

  verifyToken: async (token: string): Promise<User> => {
    const response = await apiClient.post('/auth/verify', { token })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}
