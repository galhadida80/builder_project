import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Layout from './components/layout/Layout'
import { PageTransition } from './components/common/PageTransition'
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
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
            <Route path="/projects" element={<PageTransition><ProjectsPage /></PageTransition>} />

            <Route path="/projects/:projectId" element={<PageTransition><ProjectDetailPage /></PageTransition>}>
              <Route path="equipment" element={<PageTransition><EquipmentPage /></PageTransition>} />
              <Route path="materials" element={<PageTransition><MaterialsPage /></PageTransition>} />
              <Route path="meetings" element={<PageTransition><MeetingsPage /></PageTransition>} />
              <Route path="approvals" element={<PageTransition><ApprovalsPage /></PageTransition>} />
              <Route path="areas" element={<PageTransition><AreasPage /></PageTransition>} />
              <Route path="contacts" element={<PageTransition><ContactsPage /></PageTransition>} />
              <Route path="inspections" element={<PageTransition><InspectionsPage /></PageTransition>} />
              <Route path="rfis" element={<PageTransition><RFIPage /></PageTransition>} />
            </Route>

            <Route path="/approvals" element={<PageTransition><ApprovalsPage /></PageTransition>} />
            <Route path="/audit" element={<PageTransition><AuditLogPage /></PageTransition>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
  )
}
