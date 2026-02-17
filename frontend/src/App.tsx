import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt'
import { ProjectProvider } from './contexts/ProjectContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ReferenceDataProvider } from './contexts/ReferenceDataContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectOverviewPage from './pages/ProjectOverviewPage'
import EquipmentPage from './pages/EquipmentPage'
import MaterialsPage from './pages/MaterialsPage'
import MeetingsPage from './pages/MeetingsPage'
import ApprovalsPage from './pages/ApprovalsPage'
import AreasPage from './pages/AreasPage'
import ContactsPage from './pages/ContactsPage'
import AuditLogPage from './pages/AuditLogPage'
import InspectionsPage from './pages/InspectionsPage'
import RFIPage from './pages/RFIPage'
import DocumentReviewPage from './pages/DocumentReviewPage'
import InspectorDashboardPage from './pages/InspectorDashboard'
import TeamWorkloadPage from './pages/TeamWorkloadPage'
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard'
import ApprovalQueuePage from './pages/ApprovalQueuePage'
import DocumentLibraryPage from './pages/DocumentLibraryPage'
import GanttTimelinePage from './pages/GanttTimelinePage'
import MobileChecklistPage from './pages/MobileChecklistPage'
import RFIDetailPage from './pages/RFIDetailPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import InvitePage from './pages/InvitePage'
import AdminUsersPage from './pages/AdminUsersPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { lazy, Suspense } from 'react'
import ChecklistsPage from './pages/ChecklistsPage'
import DefectsPage from './pages/DefectsPage'
import DefectDetailPage from './pages/DefectDetailPage'
import TasksPage from './pages/TasksPage'
import BudgetPage from './pages/BudgetPage'
import OrganizationsPage from './pages/OrganizationsPage'
import OrganizationDetailPage from './pages/OrganizationDetailPage'

const BIMPage = lazy(() => import('./pages/BIMPage'))

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function SuperAdminRoute() {
  const { user, isSuperAdmin, loading } = useAuth()
  if (loading) return null
  if (!user || !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }
  return <Outlet />
}

function AppRoutes() {
  return (
    <ProjectProvider>
      <ReferenceDataProvider>
      <PWAInstallPrompt />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite" element={<InvitePage />} />

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
              <Route path="rfis/:rfiId" element={<RFIDetailPage />} />
              <Route path="checklists" element={<ChecklistsPage />} />
              <Route path="defects" element={<DefectsPage />} />
              <Route path="defects/:defectId" element={<DefectDetailPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="bim" element={<Suspense fallback={null}><BIMPage /></Suspense>} />
            </Route>

            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/team-workload" element={<TeamWorkloadPage />} />
            <Route path="/inspector-dashboard" element={<InspectorDashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<SuperAdminRoute />}>
            <Route element={<Layout />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>

          <Route path="/projects/:projectId/documents/:documentId/review" element={<DocumentReviewPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ReferenceDataProvider>
    </ProjectProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
