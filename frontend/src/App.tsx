import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/layout/Layout'
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

function ProtectedRoute() {
  const token = localStorage.getItem('authToken')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />

            <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
              <Route path="overview" element={<ProjectOverviewPage />} />
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
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
  )
}
