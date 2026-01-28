import { apiClient } from './client'
import type { User } from '../types'

export const authApi = {
  verifyToken: async (token: string): Promise<User> => {
    const response = await apiClient.post('/auth/verify', { token })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },
}
