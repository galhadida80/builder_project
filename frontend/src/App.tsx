import { GoogleOAuthProvider } from '@react-oauth/google'
import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt'
import { ProjectProvider } from './contexts/ProjectContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ReferenceDataProvider } from './contexts/ReferenceDataContext'
import { ClientPortalProvider } from './contexts/ClientPortalContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ProjectOverviewPage from './pages/ProjectOverviewPage'
import EquipmentPage from './pages/EquipmentPage'
import MaterialsPage from './pages/MaterialsPage'
import MeetingsPage from './pages/MeetingsPage'
import AreasPage from './pages/AreasPage'
import ContactsPage from './pages/ContactsPage'
import AuditLogPage from './pages/AuditLogPage'
import InspectionsPage from './pages/InspectionsPage'
import PermitsPage from './pages/PermitsPage'
import RFIPage from './pages/RFIPage'
import DocumentReviewPage from './pages/DocumentReviewPage'
import InspectorDashboardPage from './pages/InspectorDashboard'
import TeamWorkloadPage from './pages/TeamWorkloadPage'
import AnalyticsDashboard from './pages/Analytics/AnalyticsDashboard'
import RiskPredictionPage from './pages/RiskPredictionPage'
import GanttTimelinePage from './pages/GanttTimelinePage'
import RFIDetailPage from './pages/RFIDetailPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import InvitePage from './pages/InvitePage'
import AdminUsersPage from './pages/AdminUsersPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MeetingRSVPPage from './pages/MeetingRSVPPage'
import { lazy, Suspense } from 'react'
import { LoadingPage } from './components/common/LoadingPage'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { OfflineIndicator } from './components/common/OfflineIndicator'
import { OfflineQueueIndicator } from './components/common/OfflineQueueIndicator'
import ChecklistsPage from './pages/ChecklistsPage'
import MobileChecklistPage from './pages/MobileChecklistPage'
import DefectsPage from './pages/DefectsPage'
import DefectDetailPage from './pages/DefectDetailPage'
import TasksPage from './pages/TasksPage'
import BudgetPage from './pages/BudgetPage'
import OrganizationsPage from './pages/OrganizationsPage'
import OrganizationDetailPage from './pages/OrganizationDetailPage'
import ReportsPage from './pages/ReportsPage'
import CustomKPIPage from './pages/CustomKPIPage'
import NotificationsPage from './pages/NotificationsPage'
import SubcontractorListPage from './pages/SubcontractorListPage'
import SubcontractorPortalPage from './pages/SubcontractorPortalPage'
import ClientPortalLoginPage from './pages/ClientPortalLoginPage'
import ClientPortalDashboardPage from './pages/ClientPortalDashboardPage'
import ClientPortalPhotosPage from './pages/ClientPortalPhotosPage'
import ClientPortalDocumentsPage from './pages/ClientPortalDocumentsPage'
import NotFoundPage from './pages/NotFoundPage'
import PricingPage from './pages/PricingPage'
import BillingPage from './pages/BillingPage'
import TimeTrackingPage from './pages/TimeTrackingPage'
import FloorplanViewerPage from './pages/FloorplanViewerPage'

const BIMPage = lazy(() => import('./pages/BIMPage'))
const ProjectStructureWizardPage = lazy(() => import('./pages/ProjectStructureWizardPage'))
const QuantityExtractionPage = lazy(() => import('./pages/QuantityExtractionPage'))
const BlueprintsPage = lazy(() => import('./pages/BlueprintsPage'))

function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingPage />
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

function SuperAdminRoute() {
  const { user, isSuperAdmin, loading } = useAuth()
  if (loading) return <LoadingPage />
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
      <OfflineIndicator />
      <OfflineQueueIndicator />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/invite" element={<InvitePage />} />
        <Route path="/meetings/rsvp/:token" element={<MeetingRSVPPage />} />
        <Route path="/client-portal/login" element={<ClientPortalLoginPage />} />
        <Route path="/client-portal/dashboard" element={
          <ClientPortalProvider>
            <ClientPortalDashboardPage />
          </ClientPortalProvider>
        } />
        <Route path="/client-portal/photos" element={
          <ClientPortalProvider>
            <ClientPortalPhotosPage />
          </ClientPortalProvider>
        } />
        <Route path="/client-portal/documents" element={
          <ClientPortalProvider>
            <ClientPortalDocumentsPage />
          </ClientPortalProvider>
        } />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />

            <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<ProjectOverviewPage />} />
              <Route path="timeline" element={<GanttTimelinePage />} />
              <Route path="equipment" element={<EquipmentPage />} />
              <Route path="materials" element={<MaterialsPage />} />
              <Route path="meetings" element={<MeetingsPage />} />
              <Route path="approvals" element={<Navigate to="../tasks" replace />} />
              <Route path="areas" element={<AreasPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="inspections" element={<InspectionsPage />} />
              <Route path="permits" element={<PermitsPage />} />
              <Route path="rfis" element={<RFIPage />} />
              <Route path="rfis/:rfiId" element={<RFIDetailPage />} />
              <Route path="checklists" element={<ChecklistsPage />} />
              <Route path="checklists/fill/:instanceId" element={<MobileChecklistPage />} />
              <Route path="defects" element={<DefectsPage />} />
              <Route path="defects/:defectId" element={<DefectDetailPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="kpis" element={<CustomKPIPage />} />
              <Route path="bim" element={<Suspense fallback={<LoadingPage />}><BIMPage /></Suspense>} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="subcontractors" element={<SubcontractorListPage />} />
              <Route path="quantities" element={<Suspense fallback={<LoadingPage />}><QuantityExtractionPage /></Suspense>} />
              <Route path="blueprints" element={<Suspense fallback={<LoadingPage />}><BlueprintsPage /></Suspense>} />
              <Route path="structure-wizard" element={<Suspense fallback={<LoadingPage />}><ProjectStructureWizardPage /></Suspense>} />
              <Route path="time-tracking" element={<TimeTrackingPage />} />
            </Route>

            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />
            <Route path="/approvals" element={<Navigate to="/dashboard" replace />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/risk-prediction" element={<RiskPredictionPage />} />
            <Route path="/team-workload" element={<TeamWorkloadPage />} />
            <Route path="/inspector-dashboard" element={<InspectorDashboardPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/subcontractor-portal" element={<SubcontractorPortalPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/billing" element={<BillingPage />} />
          </Route>

          <Route element={<SuperAdminRoute />}>
            <Route element={<Layout />}>
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>
          </Route>

          <Route path="/projects/:projectId/documents/:documentId/review" element={<DocumentReviewPage />} />
          <Route path="/projects/:projectId/floorplans/:floorplanId" element={<FloorplanViewerPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </ReferenceDataProvider>
    </ProjectProvider>
  )
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function App() {
  const content = (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  )

  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        {content}
      </GoogleOAuthProvider>
    )
  }

  return content
}
