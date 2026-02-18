import { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react'
import { projectsApi } from '../api/projects'
import { useAuth } from './AuthContext'
import type { Project } from '../types'

interface ProjectContextType {
  selectedProjectId: string | undefined
  setSelectedProjectId: (id: string | undefined) => void
  projects: Project[]
  projectsLoading: boolean
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)

  const refreshProjects = useCallback(async () => {
    if (!user) {
      setProjects([])
      setProjectsLoading(false)
      return
    }
    try {
      const data = await projectsApi.list()
      setProjects(data)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setProjectsLoading(false)
    }
  }, [user])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const value = useMemo(() => ({
    selectedProjectId,
    setSelectedProjectId,
    projects,
    projectsLoading,
    refreshProjects,
  }), [selectedProjectId, projects, projectsLoading, refreshProjects])

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider')
  }
  return context
}
