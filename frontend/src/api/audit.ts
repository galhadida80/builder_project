import { apiClient } from './client'
import type { AuditLog } from '../types'

interface AuditFilters {
  entityType?: string
  entityId?: string
  action?: string
  userId?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export const auditApi = {
  listByProject: async (projectId: string, filters?: AuditFilters): Promise<AuditLog[]> => {
    const params = new URLSearchParams()
    if (filters?.entityType) params.append('entity_type', filters.entityType)
    if (filters?.entityId) params.append('entity_id', filters.entityId)
    if (filters?.action) params.append('action', filters.action)
    if (filters?.userId) params.append('user_id', filters.userId)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())
    const query = params.toString()
    const response = await apiClient.get(`/projects/${projectId}/audit${query ? `?${query}` : ''}`)
    return response.data
  },

  listAll: async (filters?: AuditFilters): Promise<AuditLog[]> => {
    const params = new URLSearchParams()
    if (filters?.entityType) params.append('entity_type', filters.entityType)
    if (filters?.action) params.append('action', filters.action)
    if (filters?.userId) params.append('user_id', filters.userId)
    if (filters?.startDate) params.append('start_date', filters.startDate)
    if (filters?.endDate) params.append('end_date', filters.endDate)
    if (filters?.limit) params.append('limit', filters.limit.toString())
    if (filters?.offset) params.append('offset', filters.offset.toString())
    const query = params.toString()
    const response = await apiClient.get(`/audit${query ? `?${query}` : ''}`)
    return response.data
  },
}
