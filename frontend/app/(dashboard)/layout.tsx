'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Skeleton from '@mui/material/Skeleton'
import { apiClient } from '@/lib/api/client'
import { ProjectContext } from '@/lib/contexts/ProjectContext'
import { AuthContext } from '@/lib/contexts/AuthContext'
import AppSidebar, { DRAWER_WIDTH } from '@/components/dashboard/AppSidebar'
import AppHeader from '@/components/dashboard/AppHeader'

interface User {
  id: string
  email: string
  fullName: string
  role?: string
}

interface Project {
  id: string
  name: string
  code: string
  description?: string
  status?: string
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUserAndProjects = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (!token) {
          router.push('/login')
          return
        }

        const [userResponse, projectsResponse] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/projects'),
        ])

        setUser({
          id: userResponse.data.id,
          email: userResponse.data.email,
          fullName: userResponse.data.fullName || '',
          role: userResponse.data.role,
        })

        const projectsList = projectsResponse.data || []
        setProjects(projectsList)

        const savedProjectId = localStorage.getItem('selectedProjectId')
        if (savedProjectId && projectsList.some((p: Project) => p.id === savedProjectId)) {
          setSelectedProjectId(savedProjectId)
        } else if (projectsList.length > 0) {
          setSelectedProjectId(projectsList[0].id)
        }
      } catch (error) {
        console.error('Failed to load user data:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    loadUserAndProjects()
  }, [router])

  const handleProjectChange = useCallback((projectId: string | null) => {
    setSelectedProjectId(projectId)
    if (projectId) {
      localStorage.setItem('selectedProjectId', projectId)
    } else {
      localStorage.removeItem('selectedProjectId')
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('selectedProjectId')
    document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.push('/login')
  }, [router])

  const currentProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  )

  const projectContextValue = useMemo(
    () => ({
      selectedProjectId,
      setSelectedProjectId: handleProjectChange,
      projects,
      currentProject,
    }),
    [selectedProjectId, handleProjectChange, projects, currentProject]
  )

  const authContextValue = useMemo(
    () => ({
      user,
      logout,
    }),
    [user, logout]
  )

  if (loading) {
    return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        <Box sx={{ width: DRAWER_WIDTH, bgcolor: 'background.paper', borderRight: 1, borderColor: 'divider' }}>
          <Box sx={{ p: 2.5 }}>
            <Skeleton variant="rounded" width={200} height={40} />
          </Box>
          <Box sx={{ px: 1.5 }}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={40} sx={{ mb: 1 }} />
            ))}
          </Box>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ height: 64, borderBottom: 1, borderColor: 'divider', px: 3, display: 'flex', alignItems: 'center' }}>
            <Skeleton variant="rounded" width={200} height={40} />
          </Box>
          <Box sx={{ p: 3 }}>
            <Skeleton variant="text" width={300} height={48} sx={{ mb: 2 }} />
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} variant="rounded" height={140} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <AuthContext.Provider value={authContextValue}>
      <ProjectContext.Provider value={projectContextValue}>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <AppHeader
            user={user}
            projects={projects}
            currentProject={currentProject}
            onProjectChange={(id) => handleProjectChange(id)}
            onLogout={logout}
          />
          <AppSidebar projectId={selectedProjectId} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              marginInlineStart: `${DRAWER_WIDTH}px`,
              bgcolor: 'background.default',
              minHeight: '100vh',
            }}
          >
            <Toolbar />
            {children}
          </Box>
        </Box>
      </ProjectContext.Provider>
    </AuthContext.Provider>
  )
}
