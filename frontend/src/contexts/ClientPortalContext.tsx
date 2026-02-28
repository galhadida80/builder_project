import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { clientPortalApi } from '../api/clientPortal'
import type { Project, ProjectOverview, ProgressMetrics } from '../api/clientPortal'

interface PortalPermissions {
  canViewBudget: boolean
  canViewDocuments: boolean
  canSubmitFeedback: boolean
}

interface ClientPortalContextType {
  projectId: string | undefined
  setProjectId: (id: string | undefined) => void
  project: Project | null
  overview: ProjectOverview | null
  progress: ProgressMetrics | null
  canViewBudget: boolean
  canViewDocuments: boolean
  canSubmitFeedback: boolean
  loading: boolean
  error: string | null
  setPermissions: (permissions: PortalPermissions) => void
  refreshProject: () => Promise<void>
  refreshOverview: () => Promise<void>
  refreshProgress: () => Promise<void>
  refreshAll: () => Promise<void>
}

const ClientPortalContext = createContext<ClientPortalContextType | undefined>(undefined)

export function ClientPortalProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectIdState] = useState<string | undefined>(
    () => localStorage.getItem('clientPortalProjectId') || undefined
  )
  const [project, setProject] = useState<Project | null>(null)
  const [overview, setOverview] = useState<ProjectOverview | null>(null)
  const [progress, setProgress] = useState<ProgressMetrics | null>(null)
  const [canViewBudget, setCanViewBudget] = useState(false)
  const [canViewDocuments, setCanViewDocuments] = useState(false)
  const [canSubmitFeedback, setCanSubmitFeedback] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setProjectId = useCallback((id: string | undefined) => {
    setProjectIdState(id)
    if (id) {
      localStorage.setItem('clientPortalProjectId', id)
    } else {
      localStorage.removeItem('clientPortalProjectId')
    }
  }, [])

  const setPermissions = useCallback((permissions: PortalPermissions) => {
    setCanViewBudget(permissions.canViewBudget)
    setCanViewDocuments(permissions.canViewDocuments)
    setCanSubmitFeedback(permissions.canSubmitFeedback)
  }, [])

  const refreshProject = useCallback(async () => {
    if (!projectId) {
      setProject(null)
      return
    }
    try {
      setError(null)
      const data = await clientPortalApi.getProject(projectId)
      setProject(data)
    } catch (err) {
      console.error('Failed to load project:', err)
      setError('Failed to load project data')
    }
  }, [projectId])

  const refreshOverview = useCallback(async () => {
    if (!projectId) {
      setOverview(null)
      return
    }
    try {
      setError(null)
      const data = await clientPortalApi.getProjectOverview(projectId)
      setOverview(data)
    } catch (err) {
      console.error('Failed to load project overview:', err)
      setError('Failed to load project overview')
    }
  }, [projectId])

  const refreshProgress = useCallback(async () => {
    if (!projectId) {
      setProgress(null)
      return
    }
    try {
      setError(null)
      const data = await clientPortalApi.getProjectProgress(projectId)
      setProgress(data)
    } catch (err) {
      console.error('Failed to load project progress:', err)
      setError('Failed to load project progress')
    }
  }, [projectId])

  const refreshAll = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      await Promise.all([
        refreshProject(),
        refreshOverview(),
        refreshProgress(),
      ])
    } finally {
      setLoading(false)
    }
  }, [projectId, refreshProject, refreshOverview, refreshProgress])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const value = useMemo(() => ({
    projectId,
    setProjectId,
    project,
    overview,
    progress,
    canViewBudget,
    canViewDocuments,
    canSubmitFeedback,
    loading,
    error,
    setPermissions,
    refreshProject,
    refreshOverview,
    refreshProgress,
    refreshAll,
  }), [
    projectId,
    setProjectId,
    project,
    overview,
    progress,
    canViewBudget,
    canViewDocuments,
    canSubmitFeedback,
    loading,
    error,
    setPermissions,
    refreshProject,
    refreshOverview,
    refreshProgress,
    refreshAll,
  ])

  return (
    <ClientPortalContext.Provider value={value}>
      {children}
    </ClientPortalContext.Provider>
  )
}

export function useClientPortal() {
  const context = useContext(ClientPortalContext)
  if (!context) {
    throw new Error('useClientPortal must be used within ClientPortalProvider')
  }
  return context
}
