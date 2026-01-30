import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeProvider, Theme } from '@mui/material/styles'
import i18n from './i18n/config'
import getTheme from './theme'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import EquipmentPage from './pages/EquipmentPage'
import MaterialsPage from './pages/MaterialsPage'
import MeetingsPage from './pages/MeetingsPage'
import ApprovalsPage from './pages/ApprovalsPage'
import AreasPage from './pages/AreasPage'
import ContactsPage from './pages/ContactsPage'
import AuditLogPage from './pages/AuditLogPage'
import { ToastProvider } from './components/common/ToastProvider'

function ProtectedRoute() {
  const token = localStorage.getItem('authToken')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

export default function App() {
  const { i18n: i18nInstance } = useTranslation()
  const [theme, setTheme] = useState<Theme>(getTheme())

  useEffect(() => {
    // Set document direction based on current language
    const direction = i18nInstance.language === 'he' ? 'rtl' : 'ltr'
    document.dir = direction
    document.documentElement.lang = i18nInstance.language

    // Update theme with new direction
    setTheme(getTheme())

    // Listen for language changes and update document direction and theme
    const handleLanguageChange = (lng: string) => {
      const newDirection = lng === 'he' ? 'rtl' : 'ltr'
      document.dir = newDirection
      document.documentElement.lang = lng

      // Update theme when language changes
      setTheme(getTheme())
    }

    i18n.on('languageChanged', handleLanguageChange)

    return () => {
      i18n.off('languageChanged', handleLanguageChange)
    }
  }, [i18nInstance])

  return (
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />

              <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="materials" element={<MaterialsPage />} />
                <Route path="meetings" element={<MeetingsPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="areas" element={<AreasPage />} />
                <Route path="contacts" element={<ContactsPage />} />
              </Route>

              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </ThemeProvider>
  )
}
