import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import FilterChips from '../components/ui/FilterChips'
import DashboardKPICards from '../components/dashboard/DashboardKPICards'
import DashboardActivityFeed from '../components/dashboard/DashboardActivityFeed'
import DashboardCharts from '../components/dashboard/DashboardCharts'
import DashboardQuickPanel from '../components/dashboard/DashboardQuickPanel'
import type { Equipment, Material, Meeting, ApprovalRequest, AuditLog, TeamMember, Project } from '../types'
import type { DashboardStats } from '../api/dashboardStats'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import { approvalsApi } from '../api/approvals'
import { auditApi } from '../api/audit'
import { workloadApi } from '../api/workload'
import { dashboardStatsApi } from '../api/dashboardStats'
import { projectsApi } from '../api/projects'
import { defectsApi } from '../api/defects'
import { useToast } from '../components/common/ToastProvider'
import { useProject } from '../contexts/ProjectContext'
import { useAuth } from '../contexts/AuthContext'
import { getDateLocale } from '../utils/dateLocale'
import { Box, Typography, Skeleton } from '@/mui'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const dateLocale = getDateLocale()
  const { showError, showWarning } = useToast()
  const { selectedProjectId } = useProject()

  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [criticalDefectsCount, setCriticalDefectsCount] = useState(0)
  const [period, setPeriod] = useState('month')

  const getDateRange = useCallback((p: string) => {
    const now = new Date()
    const dateTo = now.toISOString().split('T')[0]
    const days = p === 'week' ? 7 : p === 'quarter' ? 90 : p === 'year' ? 365 : 30
    const from = new Date(now.getTime() - days * 86400000)
    return { dateFrom: from.toISOString().split('T')[0], dateTo }
  }, [])

  const loadDashboardStats = async (dateFrom?: string, dateTo?: string) => {
    if (!selectedProjectId) return
    try {
      setStatsLoading(true)
      const stats = await dashboardStatsApi.getStats(selectedProjectId, dateFrom, dateTo)
      setDashboardStats(stats)
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    let stale = false
    const load = async () => {
      try {
        setLoading(true)
        const pid = selectedProjectId
        const [equipmentData, materialsData, meetingsData, approvalsData, auditData, teamData, projectsData] = await Promise.all([
          equipmentApi.list(pid),
          materialsApi.list(pid),
          meetingsApi.list(pid),
          approvalsApi.list(pid),
          pid ? auditApi.listByProject(pid, { limit: 10 }) : auditApi.listAll({ limit: 10 }),
          workloadApi.getTeamMembers(pid),
          projectsApi.list()
        ])
        if (stale) return
        setEquipment(equipmentData.items)
        setMaterials(materialsData.items)
        setMeetings(meetingsData)
        setApprovals(approvalsData)
        setAuditLogs(auditData)
        setTeamMembers(teamData)
        setProjects(projectsData)

        if (pid) {
          try {
            const defectsData = await defectsApi.list(pid, { severity: 'critical', pageSize: 1 })
            if (!stale) setCriticalDefectsCount(defectsData.total ?? 0)
          } catch {
            if (!stale) setCriticalDefectsCount(0)
          }
        } else {
          setCriticalDefectsCount(0)
        }
      } catch (error) {
        if (stale) return
        console.error('Failed to load dashboard data:', error)
        showError(t('dashboard.failedToLoad'))
      } finally {
        if (!stale) setLoading(false)
      }
    }
    load()
    if (selectedProjectId) {
      const { dateFrom, dateTo } = getDateRange(period)
      loadDashboardStats(dateFrom, dateTo)
    } else {
      setDashboardStats(null)
    }
    return () => { stale = true }
  }, [selectedProjectId, period])

  const pendingApprovals = approvals.filter(a => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected')
  const sevenDaysFromNow = new Date(Date.now() + 7 * 86400000)
  const now = new Date()
  const upcomingMeetings = meetings.filter(m => (m.status === 'scheduled' || m.status === 'invitations_sent') && new Date(m.scheduledDate) >= now && new Date(m.scheduledDate) <= sevenDaysFromNow)
  const equipmentPending = equipment.filter(e => e.status !== 'approved' && e.status !== 'draft')
  const materialsPending = materials.filter(m => m.status !== 'approved' && m.status !== 'draft')
  const completionRate = equipment.length > 0
    ? Math.round((equipment.filter(e => e.status === 'approved').length / equipment.length) * 100)
    : 0

  const activeProjects = projects.filter(p => p.status === 'active')
  const selectedProject = selectedProjectId ? projects.find(p => p.id === selectedProjectId) : null
  const projectProgress = dashboardStats?.overallProgress ?? 0

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={20} sx={{ mb: { xs: 2, md: 2.5 } }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 2.5 } }}>
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 4 }} />
          ))}
        </Box>
        <Box sx={{ mb: { xs: 2.5, md: 3 } }}>
          <Skeleton variant="text" width={150} height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 3 }} />
            ))}
          </Box>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: { xs: 2, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 4 }} />
          <Skeleton variant="rounded" height={220} sx={{ borderRadius: 4 }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
          <Skeleton variant="rounded" height={150} sx={{ borderRadius: 4 }} />
          <Skeleton variant="rounded" height={150} sx={{ borderRadius: 4 }} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: 'text.primary', mb: 1.5, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
      >
        {t('dashboard.greeting', { name: user?.fullName || user?.email || '' })}
      </Typography>

      <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
        <FilterChips
          value={period}
          onChange={setPeriod}
          items={[
            { label: t('dashboard.periodWeek'), value: 'week' },
            { label: t('dashboard.periodMonth'), value: 'month' },
            { label: t('dashboard.periodQuarter'), value: 'quarter' },
            { label: t('dashboard.periodYear'), value: 'year' },
          ]}
        />
      </Box>

      <DashboardKPICards
        activeProjects={activeProjects}
        pendingApprovals={pendingApprovals}
        criticalDefectsCount={criticalDefectsCount}
        selectedProjectId={selectedProjectId}
        selectedProject={selectedProject ?? null}
        projectProgress={projectProgress}
        onNavigate={navigate}
      />

      <DashboardActivityFeed auditLogs={auditLogs} onNavigate={navigate} />

      {selectedProjectId && (
        <DashboardCharts
          dashboardStats={dashboardStats}
          statsLoading={statsLoading}
          dateLocale={dateLocale}
        />
      )}

      <DashboardQuickPanel
        upcomingMeetings={upcomingMeetings}
        equipment={equipment}
        materials={materials}
        equipmentPending={equipmentPending}
        materialsPending={materialsPending}
        completionRate={completionRate}
        teamMembers={teamMembers}
        selectedProjectId={selectedProjectId}
        dateLocale={dateLocale}
        onNavigate={navigate}
        onShowWarning={showWarning}
      />
    </Box>
  )
}
