'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'

import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import BuildIcon from '@mui/icons-material/Build'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EventIcon from '@mui/icons-material/Event'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupIcon from '@mui/icons-material/Group'

import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { useProject } from '@/lib/contexts/ProjectContext'
import { useAuth } from '@/lib/contexts/AuthContext'
import { apiClient } from '@/lib/api/client'

interface Equipment {
  id: string
  name: string
  status: string
}

interface Material {
  id: string
  name: string
  status: string
}

interface Meeting {
  id: string
  title: string
  scheduledDate: string
  meetingType: string
  status: string
}

interface ApprovalRequest {
  id: string
  entityType: string
  entityId: string
  currentStatus: string
  steps?: Array<{ status: string }>
}

interface AuditLog {
  id: string
  action: string
  entityType: string
  createdAt: string
  user?: { fullName: string }
}

interface TeamMember {
  user?: { fullName: string; email: string }
}

export default function DashboardPage() {
  const t = useTranslations()
  const router = useRouter()
  const { selectedProjectId } = useProject()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [selectedProjectId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [equipmentRes, materialsRes, meetingsRes, approvalsRes, auditRes, teamRes] = await Promise.allSettled([
        apiClient.get(selectedProjectId ? `/equipment?project_id=${selectedProjectId}` : '/equipment'),
        apiClient.get(selectedProjectId ? `/materials?project_id=${selectedProjectId}` : '/materials'),
        apiClient.get(selectedProjectId ? `/meetings?project_id=${selectedProjectId}` : '/meetings'),
        apiClient.get(selectedProjectId ? `/approvals?project_id=${selectedProjectId}` : '/approvals'),
        apiClient.get('/audit?limit=10' + (selectedProjectId ? `&project_id=${selectedProjectId}` : '')),
        apiClient.get('/team-members'),
      ])

      if (equipmentRes.status === 'fulfilled') setEquipment(equipmentRes.value.data || [])
      if (materialsRes.status === 'fulfilled') setMaterials(materialsRes.value.data || [])
      if (meetingsRes.status === 'fulfilled') setMeetings(meetingsRes.value.data || [])
      if (approvalsRes.status === 'fulfilled') setApprovals(approvalsRes.value.data || [])
      if (auditRes.status === 'fulfilled') setAuditLogs(auditRes.value.data || [])
      if (teamRes.status === 'fulfilled') setTeamMembers(teamRes.value.data || [])
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const pendingApprovals = approvals.filter(a => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected')
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'invitations_sent')
  const equipmentPending = equipment.filter(e => e.status !== 'approved' && e.status !== 'draft')
  const materialsPending = materials.filter(m => m.status !== 'approved' && m.status !== 'draft')
  const completionRate = equipment.length > 0
    ? Math.round((equipment.filter(e => e.status === 'approved').length / equipment.length) * 100)
    : 0

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 3 }}>
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
        </Box>
      </Box>
    )
  }

  const KPICard = ({ title, value, trend, trendLabel, icon, color }: {
    title: string
    value: number
    trend?: number
    trendLabel?: string
    icon: React.ReactNode
    color: string
  }) => (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              bgcolor: `${color}.light`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
          {trend !== undefined && (
            <Chip
              label={`${trend > 0 ? '+' : ''}${trend}%`}
              size="small"
              color={trend >= 0 ? 'success' : 'error'}
              sx={{ fontWeight: 600, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        {trendLabel && (
          <Typography variant="caption" color="text.disabled">
            {trendLabel}
          </Typography>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('dashboard.subtitle')}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 3,
          mb: 3,
        }}
      >
        <KPICard
          title={t('dashboard.equipmentItems')}
          value={equipment.length}
          icon={<BuildIcon />}
          color="primary"
        />
        <KPICard
          title={t('materials.title')}
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

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
          gap: 3,
          mb: 3,
        }}
      >
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={600}>{t('dashboard.pendingApprovals')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.itemsAwaitingReview')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${pendingApprovals.length} ${t('dashboard.pending')}`}
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Box>

            {pendingApprovals.length > 0 ? (
              <List disablePadding>
                {pendingApprovals.slice(0, 5).map((approval, index) => {
                  const entity = approval.entityType === 'equipment'
                    ? equipment.find(e => e.id === approval.entityId)
                    : materials.find(m => m.id === approval.entityId)
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
                        <Avatar sx={{ bgcolor: approval.entityType === 'equipment' ? 'primary.light' : 'warning.light' }}>
                          {(entity?.name || 'I')[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={500}>
                              {entity?.name || 'Unknown Item'}
                            </Typography>
                            <Chip label={approval.currentStatus} size="small" variant="outlined" />
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                              {t('dashboard.stepOfTotal', { current: completedSteps + 1, total: totalSteps })}
                            </Typography>
                            <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
                          </Box>
                        }
                      />
                      <Button size="small" endIcon={<ArrowForwardIcon />} onClick={() => { if (selectedProjectId) router.push(`/projects/${selectedProjectId}/approvals`) }}>
                        {t('dashboard.review')}
                      </Button>
                    </ListItem>
                  )
                })}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" fontWeight={600}>
                  {t('dashboard.allCaughtUp')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.noPendingApprovals')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {t('dashboard.completionRate')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                  <Box
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: '50%',
                      bgcolor: 'success.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {completionRate}%
                    </Typography>
                  </Box>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {equipment.filter(e => e.status === 'approved').length} {t('dashboard.of')} {equipment.length} {t('dashboard.approved')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{t('equipment.title')}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {equipmentPending.length} {t('dashboard.pending')}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{t('materials.title')}</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {materialsPending.length} {t('dashboard.pending')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                {t('dashboard.quickActions')}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<BuildIcon />}
                  fullWidth
                  disabled={!selectedProjectId}
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      router.push(`/projects/${selectedProjectId}/equipment?action=add`)
                    }
                  }}
                >
                  {t('equipment.addEquipment')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<InventoryIcon />}
                  fullWidth
                  disabled={!selectedProjectId}
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      router.push(`/projects/${selectedProjectId}/materials?action=add`)
                    }
                  }}
                >
                  {t('materials.addMaterial')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EventIcon />}
                  fullWidth
                  disabled={!selectedProjectId}
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      router.push(`/projects/${selectedProjectId}/meetings?action=add`)
                    }
                  }}
                >
                  {t('meetings.scheduleMeeting')}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AssignmentIcon />}
                  fullWidth
                  disabled={!selectedProjectId}
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                  onClick={() => {
                    if (selectedProjectId) {
                      router.push(`/projects/${selectedProjectId}/inspections?action=add`)
                    }
                  }}
                >
                  {t('dashboard.newInspection')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: 3,
        }}
      >
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={600}>{t('dashboard.upcomingMeetings')}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('dashboard.next7Days')}
                </Typography>
              </Box>
              <Chip label={upcomingMeetings.length} size="small" color="primary" />
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
                          {new Date(meeting.scheduledDate).toLocaleDateString('en-US', { day: '2-digit' })}
                        </Typography>
                        <Typography variant="caption" sx={{ lineHeight: 1, fontSize: '0.6rem', textTransform: 'uppercase' }}>
                          {new Date(meeting.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}
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
                          {new Date(meeting.scheduledDate).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      }
                    />
                    <Chip
                      label={meeting.meetingType?.replace('_', ' ')}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'capitalize', fontSize: '0.65rem' }}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" fontWeight={600}>
                  {t('dashboard.noMeetingsScheduled')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.scheduleFirstMeeting')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
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
                          <strong>{log.user?.fullName || 'System'}</strong> {log.action}d {log.entityType}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.createdAt).toLocaleString('en-US', {
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
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" fontWeight={600}>
                  {t('dashboard.noActivityYet')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.activityWillAppear')}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>{t('dashboard.teamOverview')}</Typography>
              <Button size="small" startIcon={<GroupIcon />} onClick={() => router.push('/team-workload')}>
                {t('dashboard.viewAll')}
              </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {t('dashboard.activeTeamMembers')}
              </Typography>
              {teamMembers.length > 0 ? (
                <Box sx={{ display: 'flex', ml: 1 }}>
                  {teamMembers.slice(0, 5).map((member, i) => (
                    <Avatar
                      key={i}
                      sx={{
                        width: 36,
                        height: 36,
                        ml: i > 0 ? -1 : 0,
                        border: 2,
                        borderColor: 'background.paper',
                        bgcolor: `hsl(${(i * 60) % 360}, 70%, 50%)`,
                        fontSize: '0.875rem',
                      }}
                    >
                      {(member.user?.fullName || member.user?.email || 'U')[0].toUpperCase()}
                    </Avatar>
                  ))}
                  {teamMembers.length > 5 && (
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        ml: -1,
                        border: 2,
                        borderColor: 'background.paper',
                        bgcolor: 'grey.500',
                        fontSize: '0.75rem',
                      }}
                    >
                      +{teamMembers.length - 5}
                    </Avatar>
                  )}
                </Box>
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
                <LinearProgress variant="determinate" value={completionRate} color="success" sx={{ height: 6, borderRadius: 3 }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('dashboard.inspectionsDone')}</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {materials.length > 0 ? Math.round((materials.filter(m => m.status === 'approved').length / materials.length) * 100) : 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={materials.length > 0 ? Math.round((materials.filter(m => m.status === 'approved').length / materials.length) * 100) : 0}
                  color="info"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('dashboard.approvalsPending')}</Typography>
                  <Typography variant="caption" fontWeight={600}>
                    {approvals.length > 0 ? Math.round((pendingApprovals.length / approvals.length) * 100) : 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={approvals.length > 0 ? Math.round((pendingApprovals.length / approvals.length) * 100) : 0}
                  color="warning"
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )
}
