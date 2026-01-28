import { apiClient } from './client'
import type { AuditLog, User } from '../types'

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

interface ApiAuditLog {
  id: string
  project_id?: string
  user_id?: string
  user?: { id: string; email: string; full_name?: string; is_active: boolean; created_at: string }
  entity_type: string
  entity_id: string
  action: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  created_at: string
}

function transformAuditLog(log: ApiAuditLog): AuditLog {
  return {
    id: log.id,
    projectId: log.project_id,
    userId: log.user_id,
    user: log.user ? {
      id: log.user.id,
      email: log.user.email,
      fullName: log.user.full_name,
      isActive: log.user.is_active,
      createdAt: log.user.created_at,
    } as User : undefined,
    entityType: log.entity_type,
    entityId: log.entity_id,
    action: log.action as AuditLog['action'],
    oldValues: log.old_values,
    newValues: log.new_values,
    createdAt: log.created_at,
  }
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
    return response.data.map(transformAuditLog)
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
    return response.data.map(transformAuditLog)
  },
}
