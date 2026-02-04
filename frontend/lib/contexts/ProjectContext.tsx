'use client'

import { createContext, useContext } from 'react'

interface Project {
  id: string
  name: string
  code: string
  description?: string
  status?: string
}

interface ProjectContextType {
  selectedProjectId: string | null
  setSelectedProjectId: (id: string | null) => void
  projects: Project[]
  currentProject: Project | null
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used within DashboardLayout')
  }
  return context
}
