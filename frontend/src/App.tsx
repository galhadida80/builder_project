import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt'
import { ProjectProvider } from './contexts/ProjectContext'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))
const ProjectOverviewPage = lazy(() => import('./pages/ProjectOverviewPage'))
const EquipmentPage = lazy(() => import('./pages/EquipmentPage'))
const MaterialsPage = lazy(() => import('./pages/MaterialsPage'))
const MeetingsPage = lazy(() => import('./pages/MeetingsPage'))
const ApprovalsPage = lazy(() => import('./pages/ApprovalsPage'))
const AreasPage = lazy(() => import('./pages/AreasPage'))
const ContactsPage = lazy(() => import('./pages/ContactsPage'))
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'))
const InspectionsPage = lazy(() => import('./pages/InspectionsPage'))
const RFIPage = lazy(() => import('./pages/RFIPage'))
const DocumentReviewPage = lazy(() => import('./pages/DocumentReviewPage'))
const InspectorDashboardPage = lazy(() => import('./pages/InspectorDashboard'))
const TeamWorkloadPage = lazy(() => import('./pages/TeamWorkloadPage'))
const AnalyticsDashboard = lazy(() => import('./pages/Analytics/AnalyticsDashboard'))
const ApprovalQueuePage = lazy(() => import('./pages/ApprovalQueuePage'))
const DocumentLibraryPage = lazy(() => import('./pages/DocumentLibraryPage'))
const GanttTimelinePage = lazy(() => import('./pages/GanttTimelinePage'))
const MobileChecklistPage = lazy(() => import('./pages/MobileChecklistPage'))
const RFIDetailPage = lazy(() => import('./pages/RFIDetailPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function RouteLoadingFallback() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress />
    </Box>
  )
}

function ProtectedRoute() {
  const token = localStorage.getItem('authToken')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <ProjectProvider>
      <PWAInstallPrompt />
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />

              <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
                <Route path="overview" element={<ProjectOverviewPage />} />
                <Route path="timeline" element={<GanttTimelinePage />} />
                <Route path="equipment" element={<EquipmentPage />} />
                <Route path="materials" element={<MaterialsPage />} />
                <Route path="meetings" element={<MeetingsPage />} />
                <Route path="approvals" element={<ApprovalsPage />} />
                <Route path="areas" element={<AreasPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="inspections" element={<InspectionsPage />} />
                <Route path="rfis" element={<RFIPage />} />
              </Route>

              <Route path="/approvals" element={<ApprovalsPage />} />
              <Route path="/audit" element={<AuditLogPage />} />
              <Route path="/analytics" element={<AnalyticsDashboard />} />
              <Route path="/team-workload" element={<TeamWorkloadPage />} />
              <Route path="/inspector-dashboard" element={<InspectorDashboardPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Document review page - fullscreen layout without nested Layout */}
            <Route path="/projects/:projectId/documents/:documentId/review" element={<DocumentReviewPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ProjectProvider>
  )
}
