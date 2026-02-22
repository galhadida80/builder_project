import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart } from '@mui/x-charts/BarChart'
import { Card } from '../components/ui/Card'
import { AvatarGroup } from '../components/ui/Avatar'
import { ProgressBar, CircularProgressDisplay } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import DistributionChart from '../pages/Analytics/components/DistributionChart'
import ProjectMetricsChart from '../pages/Analytics/components/ProjectMetricsChart'
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
import { BuildIcon, InventoryIcon, CheckCircleIcon, EventIcon, TrendingUpIcon, WarningAmberIcon, AssignmentIcon, GroupIcon, ErrorOutlineIcon, BusinessIcon, SyncIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, List, ListItem, ListItemText, ListItemAvatar, Paper, LinearProgress, alpha } from '@/mui'

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
      loadDashboardStats()
    } else {
      setDashboardStats(null)
    }
    return () => { stale = true }
  }, [selectedProjectId])

  const loadDashboardStats = async () => {
    if (!selectedProjectId) return
    try {
      setStatsLoading(true)
      const stats = await dashboardStatsApi.getStats(selectedProjectId)
      setDashboardStats(stats)
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

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

  const activityChartData = useMemo(() => {
    if (!dashboardStats) return { data: [], labels: [] }
    const labels = dashboardStats.weeklyActivity.map(p => {
      const d = new Date(p.date)
      return d.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })
    })
    const data = [
      { label: t('nav.equipment'), values: dashboardStats.weeklyActivity.map(p => p.equipment) },
      { label: t('nav.materials'), values: dashboardStats.weeklyActivity.map(p => p.materials) },
      { label: t('nav.inspections'), values: dashboardStats.weeklyActivity.map(p => p.inspections) },
      { label: t('nav.rfis'), values: dashboardStats.weeklyActivity.map(p => p.rfis) },
    ]
    return { data, labels }
  }, [dashboardStats, dateLocale, t])

  const toDistChartData = (items: { label: string; value: number }[]) =>
    items.map((item, i) => ({ id: i, label: t(`statuses.${item.label}`, { defaultValue: item.label.replace(/_/g, ' ') }), value: item.value }))

  const getActivityColor = (action: string): { bg: string; icon: string } => {
    switch (action) {
      case 'create': return { bg: 'rgba(46,125,50,0.15)', icon: 'success.main' }
      case 'approval': return { bg: 'rgba(25,118,210,0.15)', icon: 'info.main' }
      case 'update': return { bg: 'rgba(237,108,2,0.15)', icon: 'warning.main' }
      case 'delete': return { bg: 'rgba(211,47,47,0.15)', icon: 'error.main' }
      default: return { bg: 'rgba(242,140,38,0.15)', icon: 'primary.main' }
    }
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'create': return <TrendingUpIcon sx={{ fontSize: 20 }} />
      case 'approval': return <CheckCircleIcon sx={{ fontSize: 20 }} />
      case 'update': return <WarningAmberIcon sx={{ fontSize: 20 }} />
      case 'delete': return <ErrorOutlineIcon sx={{ fontSize: 20 }} />
      default: return <AssignmentIcon sx={{ fontSize: 20 }} />
    }
  }

  const getRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return t('common.justNow', { defaultValue: 'Just now' })
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    return `${days}d`
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={20} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>

      {/* Greeting */}
      <Typography
        variant="h5"
        sx={{ fontWeight: 700, color: 'text.primary', mb: { xs: 2, md: 2.5 }, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}
      >
        {t('dashboard.greeting', { name: user?.fullName || user?.email || '' })}
      </Typography>

      {/* KPI Grid - 2 columns */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: { xs: 1.5, md: 2 }, mb: { xs: 2, md: 2.5 } }}>
        {/* Active Projects */}
        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                color: 'primary.main',
              }}
            >
              <BusinessIcon sx={{ fontSize: 20 }} />
            </Box>
            {activeProjects.length > 0 && (
              <Chip
                label={`+${activeProjects.length} ${t('dashboard.newThisMonth')}`}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                }}
              />
            )}
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {t('dashboard.activeProjects')}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {activeProjects.length}
          </Typography>
        </Paper>

        {/* Pending Approvals */}
        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            cursor: 'pointer',
          }}
          onClick={() => selectedProjectId ? navigate(`/projects/${selectedProjectId}/approvals`) : navigate('/approvals')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                color: 'warning.main',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 20 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {t('dashboard.pendingApprovals')}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {pendingApprovals.length}
          </Typography>
        </Paper>
      </Box>

      {/* Critical Alert Banner */}
      {criticalDefectsCount > 0 && selectedProjectId && (
        <Paper
          sx={{
            mb: { xs: 2, md: 2.5 },
            p: 2,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
            border: 1,
            borderColor: (theme) => alpha(theme.palette.error.main, 0.3),
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 24 }} />
            <Box>
              <Typography variant="body2" fontWeight={700} sx={{ color: 'error.main' }}>
                {t('dashboard.criticalDefects')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'error.main', opacity: 0.85 }}>
                {t('dashboard.requiresImmediate', { count: criticalDefectsCount })}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="primary"
            size="small"
            sx={{
              bgcolor: 'error.main',
              color: 'error.contrastText',
              '&:hover': { bgcolor: 'error.dark' },
              flexShrink: 0,
            }}
            onClick={() => navigate(`/projects/${selectedProjectId}/defects?severity=critical`)}
          >
            {t('dashboard.view')}
          </Button>
        </Paper>
      )}

      {/* Featured Project Banner */}
      {selectedProject && (
        <Paper
          sx={{
            mb: { xs: 2, md: 2.5 },
            p: 0,
            borderRadius: 3,
            overflow: 'hidden',
            position: 'relative',
            cursor: 'pointer',
            background: (theme) =>
              `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            minHeight: 120,
          }}
          onClick={() => navigate(`/projects/${selectedProjectId}`)}
        >
          <Box
            sx={{
              p: { xs: 2.5, md: 3 },
              position: 'relative',
              zIndex: 1,
              color: 'primary.contrastText',
            }}
          >
            <Typography variant="overline" sx={{ opacity: 0.8, fontSize: '0.65rem', letterSpacing: 1.5 }}>
              {t('dashboard.featuredProject')}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
              {selectedProject.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={projectProgress}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'rgba(255,255,255,0.9)',
                      borderRadius: 3,
                    },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9 }}>
                {projectProgress}% {t('dashboard.completed')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.7 }}>
              <SyncIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                {t('dashboard.syncedRecently')}
              </Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Recent Activity Feed */}
      <Box sx={{ mb: { xs: 2.5, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>{t('dashboard.recentActivity')}</Typography>
          <Button variant="tertiary" size="small" onClick={() => navigate('/audit-log')}>
            {t('dashboard.viewAll')}
          </Button>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {auditLogs.length > 0 ? auditLogs.slice(0, 5).map((log) => {
            const colors = getActivityColor(log.action)
            return (
              <Paper
                key={log.id}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  alignItems: 'center',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: colors.bg,
                    color: colors.icon,
                  }}
                >
                  {getActivityIcon(log.action)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {log.user?.fullName || t('dashboard.system')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {t(`dashboard.activityActions.${log.action}`, { defaultValue: log.action })}{' '}
                    {t(`dashboard.activityEntities.${log.entityType}`, { defaultValue: log.entityType })}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                  {getRelativeTime(log.createdAt)}
                </Typography>
              </Paper>
            )
          }) : (
            <EmptyState variant="empty" title={t('dashboard.noActivityYet')} description={t('dashboard.activityWillAppear')} />
          )}
        </Box>
      </Box>

      {/* Charts Section */}
      {selectedProjectId && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: { xs: 2, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
          <ProjectMetricsChart
            title={t('dashboard.charts.activityTrend')}
            data={activityChartData.data}
            xAxisLabels={activityChartData.labels}
            loading={statsLoading}
            height={220}
          />
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.charts.overallProgress')}
            </Typography>
            {statsLoading ? (
              <Skeleton variant="circular" width={120} height={120} />
            ) : (
              <>
                <CircularProgressDisplay value={dashboardStats?.overallProgress ?? 0} size={100} thickness={8} color="primary" />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5 }}>
                  {dashboardStats?.areaProgressByFloor.length ?? 0} {t('dashboard.charts.floorsTracked')}
                </Typography>
              </>
            )}
          </Paper>
        </Box>
      )}

      {selectedProjectId && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
          <DistributionChart title={t('dashboard.charts.equipmentStatus')} data={toDistChartData(dashboardStats?.equipmentDistribution ?? [])} loading={statsLoading} height={200} innerRadius={50} outerRadius={75} />
          <DistributionChart title={t('dashboard.charts.materialStatus')} data={toDistChartData(dashboardStats?.materialDistribution ?? [])} loading={statsLoading} height={200} innerRadius={50} outerRadius={75} />
          <DistributionChart title={t('dashboard.charts.rfiStatus')} data={toDistChartData(dashboardStats?.rfiDistribution ?? [])} loading={statsLoading} height={200} innerRadius={50} outerRadius={75} />
        </Box>
      )}

      {selectedProjectId && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, overflow: 'hidden' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.charts.areaProgress')}
            </Typography>
            {statsLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            ) : (dashboardStats?.areaProgressByFloor.length ?? 0) > 0 ? (
              <BarChart
                xAxis={[{ scaleType: 'band' as const, data: dashboardStats!.areaProgressByFloor.map(f => `${t('dashboard.charts.floor')} ${f.floor}`) }]}
                yAxis={[{ valueFormatter: (v: number | null) => v == null ? '' : `${Math.round(v)}%` }]}
                series={[{ data: dashboardStats!.areaProgressByFloor.map(f => Math.round(f.avgProgress)), label: t('dashboard.charts.avgProgress'), color: '#f28c26', valueFormatter: (v: number | null) => v == null ? '' : `${Math.round(v)}%` }]}
                height={200}
                margin={{ top: 20, right: 10, bottom: 30, left: 40 }}
              />
            ) : (
              <EmptyState variant="empty" title={t('dashboard.charts.noData')} />
            )}
          </Paper>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, overflow: 'hidden' }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.charts.findingsSeverity')}
            </Typography>
            {statsLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            ) : (dashboardStats?.findingsSeverity.length ?? 0) > 0 ? (
              <BarChart
                xAxis={[{ scaleType: 'band' as const, data: dashboardStats!.findingsSeverity.map(f => f.label) }]}
                series={[{ data: dashboardStats!.findingsSeverity.map(f => f.value), label: t('dashboard.charts.findings'), color: '#d32f2f' }]}
                height={200}
                margin={{ top: 20, right: 10, bottom: 30, left: 40 }}
              />
            ) : (
              <EmptyState variant="empty" title={t('dashboard.charts.noData')} />
            )}
          </Paper>
        </Box>
      )}

      {/* Meetings and Quick Actions */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>{t('dashboard.upcomingMeetings')}</Typography>
              <Chip label={upcomingMeetings.length} size="small" color="primary" />
            </Box>
            {upcomingMeetings.length > 0 ? (
              <List disablePadding>
                {upcomingMeetings.slice(0, 4).map((meeting, index) => (
                  <ListItem key={meeting.id} sx={{ px: 0, py: 1, borderBottom: index < Math.min(upcomingMeetings.length - 1, 3) ? 1 : 0, borderColor: 'divider' }}>
                    <ListItemAvatar>
                      <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="caption" sx={{ lineHeight: 1, fontWeight: 700, fontSize: '0.7rem' }}>
                          {new Date(meeting.scheduledDate).toLocaleDateString(dateLocale, { day: '2-digit' })}
                        </Typography>
                        <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.55rem', textTransform: 'uppercase' }}>
                          {new Date(meeting.scheduledDate).toLocaleDateString(dateLocale, { month: 'short' })}
                        </Typography>
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>{meeting.title}</Typography>}
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(meeting.scheduledDate).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <EmptyState variant="empty" title={t('dashboard.noMeetingsScheduled')} description={t('dashboard.scheduleFirstMeeting')} />
            )}
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>{t('dashboard.quickActions')}</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              <Button variant="secondary" size="small" icon={<BuildIcon />} fullWidth sx={{ justifyContent: 'flex-start', px: 2 }} onClick={() => { if (selectedProjectId) navigate(`/projects/${selectedProjectId}/equipment?action=add`); else showWarning(t('dashboard.selectProjectFirst')); }}>
                {t('dashboard.addEquipment')}
              </Button>
              <Button variant="secondary" size="small" icon={<InventoryIcon />} fullWidth sx={{ justifyContent: 'flex-start', px: 2 }} onClick={() => { if (selectedProjectId) navigate(`/projects/${selectedProjectId}/materials?action=add`); else showWarning(t('dashboard.selectProjectFirst')); }}>
                {t('dashboard.addMaterial')}
              </Button>
              <Button variant="secondary" size="small" icon={<EventIcon />} fullWidth sx={{ justifyContent: 'flex-start', px: 2 }} onClick={() => { if (selectedProjectId) navigate(`/projects/${selectedProjectId}/meetings?action=add`); else showWarning(t('dashboard.selectProjectFirst')); }}>
                {t('dashboard.scheduleMeeting')}
              </Button>
              <Button variant="secondary" size="small" icon={<AssignmentIcon />} fullWidth sx={{ justifyContent: 'flex-start', px: 2 }} onClick={() => { if (selectedProjectId) navigate(`/projects/${selectedProjectId}/inspections?action=add`); else showWarning(t('dashboard.selectProjectFirst')); }}>
                {t('dashboard.newInspection')}
              </Button>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Completion Rate and Team Overview */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
        <Card>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>{t('dashboard.completionRate')}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <CircularProgressDisplay value={completionRate} size={80} thickness={6} color="success" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {equipment.filter(e => e.status === 'approved').length} {t('dashboard.of')} {equipment.length} {t('dashboard.approved')}
                </Typography>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('nav.equipment')}</Typography>
                    <Typography variant="body2" fontWeight={600}>{equipmentPending.length} {t('dashboard.pending')}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">{t('nav.materials')}</Typography>
                    <Typography variant="body2" fontWeight={600}>{materialsPending.length} {t('dashboard.pending')}</Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>{t('dashboard.teamOverview')}</Typography>
              <Button variant="tertiary" size="small" icon={<GroupIcon />} onClick={() => navigate('/team-workload')}>
                {t('dashboard.viewAll')}
              </Button>
            </Box>
            <Box sx={{ mb: 2 }}>
              {teamMembers.length > 0 ? (
                <AvatarGroup
                  users={teamMembers.map(member => ({ name: member.user?.fullName || member.user?.email || t('common.unknown') }))}
                  max={5}
                  size="medium"
                />
              ) : (
                <Typography variant="body2" color="text.secondary">{t('dashboard.noTeamMembers')}</Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('dashboard.tasksCompleted')}</Typography>
                  <Typography variant="caption" fontWeight={600}>{completionRate}%</Typography>
                </Box>
                <ProgressBar value={completionRate} showValue={false} size="small" color="success" />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('dashboard.materialsApproved')}</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {materials.length > 0 ? Math.round((materials.filter(m => m.status === 'approved').length / materials.length) * 100) : 0}%
                  </Typography>
                </Box>
                <ProgressBar value={materials.length > 0 ? Math.round((materials.filter(m => m.status === 'approved').length / materials.length) * 100) : 0} showValue={false} size="small" color="info" />
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}
