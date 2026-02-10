import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../api/client'

interface PermissionOverride {
  id: string
  permission: string
  granted: boolean
  grantedById: string
  createdAt: string
}

interface PermissionsData {
  role: string
  permissions: string[]
  overrides: PermissionOverride[]
}

interface UsePermissionsResult {
  permissions: string[]
  can: (permission: string) => boolean
  isProjectAdmin: boolean
  role: string | null
  loading: boolean
  overrides: PermissionOverride[]
  refetch: () => Promise<void>
}

const cache = new Map<string, PermissionsData>()

export function usePermissions(projectId?: string, memberId?: string): UsePermissionsResult {
  const [data, setData] = useState<PermissionsData | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPermissions = useCallback(async () => {
    if (!projectId || !memberId) return
    const cacheKey = `${projectId}:${memberId}`
    const cached = cache.get(cacheKey)
    if (cached) {
      setData(cached)
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.get<PermissionsData>(
        `/projects/${projectId}/members/${memberId}/permissions`
      )
      cache.set(cacheKey, response.data)
      setData(response.data)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, memberId])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  const can = useCallback(
    (permission: string) => data?.permissions.includes(permission) ?? false,
    [data]
  )

  const refetch = useCallback(async () => {
    if (projectId && memberId) {
      cache.delete(`${projectId}:${memberId}`)
    }
    await fetchPermissions()
  }, [projectId, memberId, fetchPermissions])

  return {
    permissions: data?.permissions ?? [],
    can,
    isProjectAdmin: data?.role === 'project_admin',
    role: data?.role ?? null,
    loading,
    overrides: data?.overrides ?? [],
    refetch,
  }
}
