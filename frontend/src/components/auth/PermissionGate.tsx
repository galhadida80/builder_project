import { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface PermissionGateProps {
  permission: string
  permissions: string[]
  children: ReactNode
  fallback?: ReactNode
}

export default function PermissionGate({ permission, permissions, children, fallback = null }: PermissionGateProps) {
  const { isSuperAdmin } = useAuth()

  if (isSuperAdmin || permissions.includes(permission)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
