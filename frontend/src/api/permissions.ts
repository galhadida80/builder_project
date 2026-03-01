import { apiClient } from './client'

// TypeScript interfaces matching backend schemas (camelCase per CamelCaseModel pattern)
export interface ResourcePermissionSummary {
  resourceType: string
  resourceId: string
  permission: string
  granted: boolean
}

export interface UserPermissionSummary {
  userId: string
  userName: string
  email: string
  role: string | null
  organizationRole: string | null
  projectRole: string | null
  effectivePermissions: string[]
  resourcePermissions: ResourcePermissionSummary[]
}

export interface PermissionMatrixResponse {
  projectId: string
  projectName: string
  members: UserPermissionSummary[]
}

export interface PermissionOverrideRequest {
  permission: string
  granted: boolean
}

export interface BulkPermissionAssignmentData {
  user_ids: string[]
  role_id?: string | null
  permission_overrides?: PermissionOverrideRequest[] | null
}

export interface PermissionAuditLogEntry {
  id: string
  action: string
  user: {
    id: string | null
    name: string | null
    email: string | null
  }
  targetUser: {
    id: string
    name: string
    email: string
  } | null
  entityType: string
  entityId: string | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export interface PermissionAuditFilters {
  action?: string
  user_id?: string
  target_user_id?: string
  entity_type?: string
  entity_id?: string
  start_date?: string
  end_date?: string
  limit?: number
  offset?: number
}

export interface BulkAssignmentResponse {
  success: boolean
  usersUpdated: number
}

export const permissionsApi = {
  getMatrix: async (projectId: string): Promise<PermissionMatrixResponse> => {
    const response = await apiClient.get(`/projects/${projectId}/permissions/matrix`)
    return response.data
  },

  bulkAssign: async (
    projectId: string,
    data: BulkPermissionAssignmentData
  ): Promise<BulkAssignmentResponse> => {
    const response = await apiClient.post(`/projects/${projectId}/permissions/bulk-assign`, data)
    return response.data
  },

  getAuditLog: async (
    projectId: string,
    filters?: PermissionAuditFilters
  ): Promise<PermissionAuditLogEntry[]> => {
    const response = await apiClient.get(`/projects/${projectId}/permissions/audit`, {
      params: filters,
    })
    return response.data
  },

  exportAuditLog: async (
    projectId: string,
    format: 'csv' | 'json',
    filters?: Omit<PermissionAuditFilters, 'limit' | 'offset'>
  ): Promise<Blob> => {
    const response = await apiClient.get(`/projects/${projectId}/permissions/audit/export`, {
      params: {
        format,
        ...filters,
      },
      responseType: 'blob',
    })
    return response.data
  },
}
