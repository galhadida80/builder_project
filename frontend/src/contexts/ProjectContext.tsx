import { createContext, useContext, useState, useMemo, ReactNode } from 'react'

interface ProjectContextType {
  selectedProjectId: string | undefined
  setSelectedProjectId: (id: string | undefined) => void
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>()

  const value = useMemo(() => ({ selectedProjectId, setSelectedProjectId }), [selectedProjectId])

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
