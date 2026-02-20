import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart } from '@mui/x-charts/BarChart'
import { Card, KPICard } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'
import { ProgressBar, CircularProgressDisplay } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import DistributionChart from '../pages/Analytics/components/DistributionChart'
import ProjectMetricsChart from '../pages/Analytics/components/ProjectMetricsChart'
import type { Equipment, Material, Meeting, ApprovalRequest, AuditLog, TeamMember } from '../types'
import type { DashboardStats } from '../api/dashboardStats'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import { approvalsApi } from '../api/approvals'
import { auditApi } from '../api/audit'
import { workloadApi } from '../api/workload'
import { dashboardStatsApi } from '../api/dashboardStats'
import { useToast } from '../components/common/ToastProvider'
import { useProject } from '../contexts/ProjectContext'
import { getDateLocale } from '../utils/dateLocale'
import { BuildIcon, InventoryIcon, CheckCircleIcon, EventIcon, TrendingUpIcon, WarningAmberIcon, AssignmentIcon, GroupIcon, ArrowForwardIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, List, ListItem, ListItemText, ListItemAvatar, Paper } from '@/mui'

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

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

  useEffect(() => {
    let stale = false
    const load = async () => {
      try {
        setLoading(true)
        const pid = selectedProjectId
        const [equipmentData, materialsData, meetingsData, approvalsData, auditData, teamData] = await Promise.all([
          equipmentApi.list(pid),
          materialsApi.list(pid),
          meetingsApi.list(pid),
          approvalsApi.list(pid),
          pid ? auditApi.listByProject(pid, { limit: 10 }) : auditApi.listAll({ limit: 10 }),
          workloadApi.getTeamMembers(pid)
        ])
        if (stale) return
        setEquipment(equipmentData.items)
        setMaterials(materialsData.items)
        setMeetings(meetingsData)
        setApprovals(approvalsData)
        setAuditLogs(auditData)
        setTeamMembers(teamData)
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

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
            fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('dashboard.overviewSubtitle')}
        </Typography>
      </Box>

      {/* Row 1: KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, 1fr)' },
          gap: { xs: 1, sm: 1.5 },
          mb: { xs: 2, md: 3 },
          overflow: 'hidden',
        }}
      >
        <KPICard
          title={t('dashboard.equipmentItems')}
          value={equipment.length}
          icon={<BuildIcon />}
          color="primary"
        />
        <KPICard
          title={t('nav.materials')}
          value={materials.length}
          icon={<InventoryIcon />}
          color="warning"
        />
        <KPICard
          title={t('dashboard.pendingApprovals')}
          value={pendingApprovals.length}
          icon={<CheckCircleIcon />}
          color="success"
        />
        <KPICard
          title={t('dashboard.upcomingMeetings')}
          value={upcomingMeetings.length}
          icon={<EventIcon />}
          color="info"
        />
      </Box>

      {/* Row 2: Activity Trend + Overall Progress */}
      {selectedProjectId && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: { xs: 1, md: 2 }, mb: { xs: 2, md: 3 } }}>
          <ProjectMetricsChart
            title={t('dashboard.charts.activityTrend')}
            data={activityChartData.data}
            xAxisLabels={activityChartData.labels}
            loading={statsLoading}
            height={220}
          />
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.charts.overallProgress')}
            </Typography>
            {statsLoading ? (
              <Skeleton variant="circular" width={140} height={140} />
            ) : (
              <>
                <CircularProgressDisplay
                  value={dashboardStats?.overallProgress ?? 0}
                  size={120}
                  thickness={8}
                  color="primary"
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {dashboardStats?.areaProgressByFloor.length ?? 0} {t('dashboard.charts.floorsTracked')}
                </Typography>
              </>
            )}
          </Paper>
        </Box>
      )}

      {/* Row 3: Equipment Donut + Material Donut + RFI Status */}
      {selectedProjectId && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: { xs: 1, md: 2 }, mb: { xs: 2, md: 3 } }}>
          <DistributionChart
            title={t('dashboard.charts.equipmentStatus')}
            data={toDistChartData(dashboardStats?.equipmentDistribution ?? [])}
            loading={statsLoading}
            height={200}
            innerRadius={50}
            outerRadius={75}
          />
          <DistributionChart
            title={t('dashboard.charts.materialStatus')}
            data={toDistChartData(dashboardStats?.materialDistribution ?? [])}
            loading={statsLoading}
            height={200}
            innerRadius={50}
            outerRadius={75}
          />
          <DistributionChart
            title={t('dashboard.charts.rfiStatus')}
            data={toDistChartData(dashboardStats?.rfiDistribution ?? [])}
            loading={statsLoading}
            height={200}
            innerRadius={50}
            outerRadius={75}
          />
        </Box>
      )}

      {/* Row 4: Area Progress by Floor + Findings Severity */}
      {selectedProjectId && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1, md: 2 }, mb: { xs: 2, md: 3 } }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, overflow: 'hidden' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.charts.areaProgress')}
            </Typography>
            {statsLoading ? (
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            ) : (dashboardStats?.areaProgressByFloor.length ?? 0) > 0 ? (
              <BarChart
                xAxis={[{
                  scaleType: 'band' as const,
                  data: dashboardStats!.areaProgressByFloor.map(f => `${t('dashboard.charts.floor')} ${f.floor}`),
                }]}
                yAxis={[{ valueFormatter: (v: number | null) => v == null ? '' : `${Math.round(v)}%` }]}
                series={[{
                  data: dashboardStats!.areaProgressByFloor.map(f => Math.round(f.avgProgress)),
                  label: t('dashboard.charts.avgProgress'),
                  color: '#1976d2',
                  valueFormatter: (v: number | null) => v == null ? '' : `${Math.round(v)}%`,
                }]}
                height={200}
                margin={{ top: 20, right: 10, bottom: 30, left: 40 }}
              />
            ) : (
              <EmptyState variant="empty" title={t('dashboard.charts.noData')} />
            )}
          </Paper>
          <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 3, overflow: 'hidden' }}>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              {t('dashboard.charts.findingsSeverity')}
            </Typography>
            {statsLoading ? (
              <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
            ) : (dashboardStats?.findingsSeverity.length ?? 0) > 0 ? (
              <BarChart
                xAxis={[{
                  scaleType: 'band' as const,
                  data: dashboardStats!.findingsSeverity.map(f => f.label),
                }]}
                series={[{
                  data: dashboardStats!.findingsSeverity.map(f => f.value),
                  label: t('dashboard.charts.findings'),
                  color: '#d32f2f',
                }]}
                height={200}
                margin={{ top: 20, right: 10, bottom: 30, left: 40 }}
              />
            ) : (
              <EmptyState variant="empty" title={t('dashboard.charts.noData')} />
            )}
          </Paper>
        </Box>
      )}

      {/* Row 5: Pending Approvals + Completion Rate + Quick Actions */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: { xs: 1, md: 2 },
          mb: { xs: 2, md: 3 },
        }}
      >
        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('dashboard.pendingApprovals')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.itemsAwaitingReview')}
                </Typography>
              </Box>
              <Chip
                label={`${pendingApprovals.length} ${t('dashboard.pending')}`}
                size="small"
                color="warning"
                sx={{ fontWeight: 600, flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }}
              />
            </Box>

            {pendingApprovals.length > 0 ? (
              <>
                <List disablePadding>
                  {pendingApprovals.slice(0, 5).map((approval, index) => {
                    const entity = approval.entityType === 'equipment'
                      ? equipment.find(e => e.id === approval.entityId)
                      : approval.entityType === 'material'
                      ? materials.find(m => m.id === approval.entityId)
                      : null
                    const completedSteps = approval.steps?.filter(s => s.status === 'approved').length || 0
                    const totalSteps = approval.steps?.length || 1
                    const progress = Math.round((completedSteps / totalSteps) * 100)

                    return (
                      <ListItem
                        key={approval.id}
                        sx={{
                          px: 0,
                          py: 1.5,
                          borderBottom: index < Math.min(pendingApprovals.length - 1, 4) ? 1 : 0,
                          borderColor: 'divider',
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar
                            name={entity?.name || 'Item'}
                            color={approval.entityType === 'equipment' ? 'primary' : 'warning'}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {entity?.name || t('dashboard.unknownItem')}
                              </Typography>
                              <StatusBadge status={approval.currentStatus} size="small" />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                {t('dashboard.stepOfTotal', { current: Math.min(completedSteps + 1, totalSteps), total: totalSteps })}
                              </Typography>
                              <ProgressBar value={progress} showValue={false} size="small" />
                            </Box>
                          }
                        />
                        <Button
                          variant="tertiary"
                          size="small"
                          icon={<ArrowForwardIcon />}
                          iconPosition="end"
                          onClick={() => {
                            if (selectedProjectId) {
                              navigate(`/projects/${selectedProjectId}/approvals`)
                            }
                          }}
                        >
                          {t('dashboard.review')}
                        </Button>
                      </ListItem>
                    )
                  })}
                </List>
                {pendingApprovals.length > 5 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button
                      variant="tertiary"
                      size="small"
                      onClick={() => {
                        if (selectedProjectId) {
                          navigate(`/projects/${selectedProjectId}/approvals`)
                        } else {
                          navigate('/approvals')
                        }
                      }}
                    >
                      {t('dashboard.viewAllApprovals', { count: pendingApprovals.length })}
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <EmptyState
                title={t('dashboard.allCaughtUp')}
                description={t('dashboard.noPendingApprovals')}
                icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
              />
            )}
          </Box>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {t('dashboard.completionRate')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center', gap: { xs: 2, sm: 3 } }}>
                <CircularProgressDisplay
                  value={completionRate}
                  size={100}
                  thickness={6}
                  color="success"
                />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {equipment.filter(e => e.status === 'approved').length} {t('dashboard.of')} {equipment.length} {t('dashboard.approved')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{t('nav.equipment')}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {equipmentPending.length} {t('dashboard.pending')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{t('nav.materials')}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {materialsPending.length} {t('dashboard.pending')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Card>

          <Card>
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>{t('dashboard.quickActions')}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<BuildIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      navigate(`/projects/${selectedProjectId}/equipment?action=add`)
                    } else {
                      showWarning(t('dashboard.selectProjectFirst'))
                    }
                  }}
                >
                  {t('dashboard.addEquipment')}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<InventoryIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      navigate(`/projects/${selectedProjectId}/materials?action=add`)
                    } else {
                      showWarning(t('dashboard.selectProjectFirst'))
                    }
                  }}
                >
                  {t('dashboard.addMaterial')}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<EventIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      navigate(`/projects/${selectedProjectId}/meetings?action=add`)
                    } else {
                      showWarning(t('dashboard.selectProjectFirst'))
                    }
                  }}
                >
                  {t('dashboard.scheduleMeeting')}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<AssignmentIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      navigate(`/projects/${selectedProjectId}/inspections?action=add`)
                    } else {
                      showWarning(t('dashboard.selectProjectFirst'))
                    }
                  }}
                >
                  {t('dashboard.newInspection')}
                </Button>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>

      {/* Row 6: Meetings + Activity + Team */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: { xs: 1, md: 2 },
        }}
      >
        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('dashboard.upcomingMeetings')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.next7Days')}
                </Typography>
              </Box>
              <Chip label={upcomingMeetings.length} size="small" color="primary" sx={{ flexShrink: 0, alignSelf: { xs: 'flex-start', sm: 'center' } }} />
            </Box>

            {upcomingMeetings.length > 0 ? (
              <List disablePadding>
                {upcomingMeetings.slice(0, 4).map((meeting, index) => (
                  <ListItem
                    key={meeting.id}
                    sx={{
                      px: 0,
                      py: 1.5,
                      borderBottom: index < Math.min(upcomingMeetings.length - 1, 3) ? 1 : 0,
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemAvatar>
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 2,
                          bgcolor: 'primary.main',
                          color: 'white',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="caption" sx={{ lineHeight: 1, fontWeight: 700 }}>
                          {new Date(meeting.scheduledDate).toLocaleDateString(dateLocale, { day: '2-digit' })}
                        </Typography>
                        <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.6rem', textTransform: 'uppercase' }}>
                          {new Date(meeting.scheduledDate).toLocaleDateString(dateLocale, { month: 'short' })}
                        </Typography>
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontWeight={500}>
                          {meeting.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(meeting.scheduledDate).toLocaleTimeString(dateLocale, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      }
                    />
                    <Chip
                      label={meeting.meetingType ? t(`meetings.type${meeting.meetingType.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`, { defaultValue: meeting.meetingType.replace('_', ' ') }) : ''}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'capitalize', fontSize: '0.65rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <EmptyState
                variant="empty"
                title={t('dashboard.noMeetingsScheduled')}
                description={t('dashboard.scheduleFirstMeeting')}
              />
            )}
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>{t('dashboard.recentActivity')}</Typography>
            </Box>

            {auditLogs.length > 0 ? (
              <List disablePadding>
                {auditLogs.slice(0, 5).map((log, index) => (
                  <ListItem
                    key={log.id}
                    sx={{
                      px: 0,
                      py: 1,
                      borderBottom: index < Math.min(auditLogs.length - 1, 4) ? 1 : 0,
                      borderColor: 'divider',
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 40 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: log.action === 'create' ? 'success.light'
                            : log.action === 'approval' ? 'primary.light'
                            : 'warning.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {log.action === 'create' && <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />}
                        {log.action === 'approval' && <CheckCircleIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                        {log.action === 'update' && <WarningAmberIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
                      </Box>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontSize="0.8rem">
                          <strong>{log.user?.fullName || t('dashboard.system')}</strong>{' '}
                          {t(`dashboard.activityActions.${log.action}`, { defaultValue: log.action })}{' '}
                          {t(`dashboard.activityEntities.${log.entityType}`, { defaultValue: log.entityType })}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.createdAt).toLocaleString(dateLocale, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <EmptyState
                variant="empty"
                title={t('dashboard.noActivityYet')}
                description={t('dashboard.activityWillAppear')}
              />
            )}
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 1, sm: 0 }, mb: 2 }}>
              <Typography variant="h6" fontWeight={600} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('dashboard.teamOverview')}</Typography>
              <Button
                variant="tertiary"
                size="small"
                icon={<GroupIcon />}
                onClick={() => navigate('/team-workload')}
              >
                {t('dashboard.viewAll')}
              </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t('dashboard.activeTeamMembers')}
              </Typography>
              {teamMembers.length > 0 ? (
                <AvatarGroup
                  users={teamMembers.map(member => ({
                    name: member.user?.fullName || member.user?.email || t('common.unknown')
                  }))}
                  max={5}
                  size="medium"
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.noTeamMembers')}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                <ProgressBar
                  value={materials.length > 0 ? Math.round((materials.filter(m => m.status === 'approved').length / materials.length) * 100) : 0}
                  showValue={false}
                  size="small"
                  color="info"
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('dashboard.approvalsPending')}</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {approvals.length > 0 ? Math.round((pendingApprovals.length / approvals.length) * 100) : 0}%
                  </Typography>
                </Box>
                <ProgressBar
                  value={approvals.length > 0 ? Math.round((pendingApprovals.length / approvals.length) * 100) : 0}
                  showValue={false}
                  size="small"
                  color="warning"
                />
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}
