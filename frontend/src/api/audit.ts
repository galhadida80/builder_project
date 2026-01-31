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
  projectId?: string
  userId?: string
  user?: { id: string; email: string; fullName?: string; isActive: boolean; createdAt: string }
  entityType: string
  entityId: string
  action: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  createdAt: string
}

function transformAuditLog(log: ApiAuditLog): AuditLog {
  return {
    id: log.id,
    projectId: log.projectId,
    userId: log.userId,
    user: log.user ? {
      id: log.user.id,
      email: log.user.email,
      fullName: log.user.fullName,
      isActive: log.user.isActive,
      createdAt: log.user.createdAt,
    } as User : undefined,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action as AuditLog['action'],
    oldValues: log.oldValues,
    newValues: log.newValues,
    createdAt: log.createdAt,
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
