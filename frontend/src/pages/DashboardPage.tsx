import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import IconButton from '@mui/material/IconButton'
import BuildIcon from '@mui/icons-material/Build'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EventIcon from '@mui/icons-material/Event'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupIcon from '@mui/icons-material/Group'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import { Card, KPICard } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'
import { ProgressBar, CircularProgressDisplay } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import type { Equipment, Material, Meeting, ApprovalRequest, AuditLog } from '../types'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import { approvalsApi } from '../api/approvals'
import { auditApi } from '../api/audit'
import { useToast } from '../components/common/ToastProvider'

export default function DashboardPage() {
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const [equipmentData, materialsData, meetingsData, approvalsData, auditData] = await Promise.all([
        equipmentApi.list(),
        materialsApi.list(),
        meetingsApi.list(),
        approvalsApi.list(),
        auditApi.listAll({ limit: 10 })
      ])
      setEquipment(equipmentData)
      setMaterials(materialsData)
      setMeetings(meetingsData)
      setApprovals(approvalsData)
      setAuditLogs(auditData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      showError('Failed to load dashboard data. Please refresh the page.')
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
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={400} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your construction operations
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
          title="Equipment Items"
          value={equipment.length}
          trend={12}
          trendLabel="vs last month"
          icon={<BuildIcon />}
          color="primary"
        />
        <KPICard
          title="Materials"
          value={materials.length}
          trend={-3}
          trendLabel="vs last month"
          icon={<InventoryIcon />}
          color="warning"
        />
        <KPICard
          title="Pending Approvals"
          value={pendingApprovals.length}
          icon={<CheckCircleIcon />}
          color="success"
        />
        <KPICard
          title="Upcoming Meetings"
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
        <Card>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={600}>Pending Approvals</Typography>
                <Typography variant="caption" color="text.secondary">
                  Items awaiting your review
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  label={`${pendingApprovals.length} pending`}
                  size="small"
                  color="warning"
                  sx={{ fontWeight: 600 }}
                />
                <IconButton size="small">
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {pendingApprovals.length > 0 ? (
              <>
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
                          <Avatar
                            name={entity?.name || 'Item'}
                            color={approval.entityType === 'equipment' ? 'primary' : 'warning'}
                          />
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight={500}>
                                {entity?.name || 'Unknown Item'}
                              </Typography>
                              <StatusBadge status={approval.currentStatus} size="small" />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                Step {completedSteps + 1} of {totalSteps}
                              </Typography>
                              <ProgressBar value={progress} showValue={false} size="small" />
                            </Box>
                          }
                        />
                        <Button variant="tertiary" size="small" icon={<ArrowForwardIcon />} iconPosition="end">
                          Review
                        </Button>
                      </ListItem>
                    )
                  })}
                </List>
                {pendingApprovals.length > 5 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button variant="tertiary" size="small">
                      View all {pendingApprovals.length} approvals
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <EmptyState
                title="All caught up!"
                description="No pending approvals at this time."
                icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
              />
            )}
          </Box>
        </Card>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card>
            <Box sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                Completion Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <CircularProgressDisplay
                  value={completionRate}
                  size={100}
                  thickness={6}
                  color="success"
                />
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {equipment.filter(e => e.status === 'approved').length} of {equipment.length} approved
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Equipment</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {equipmentPending.length} pending
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Materials</Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {materialsPending.length} pending
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Card>

          <Card>
            <Box sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>Quick Actions</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<BuildIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                >
                  Add Equipment
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<InventoryIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                >
                  Add Material
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<EventIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                >
                  Schedule Meeting
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  icon={<AssignmentIcon />}
                  fullWidth
                  sx={{ justifyContent: 'flex-start', px: 2 }}
                >
                  New Inspection
                </Button>
              </Box>
            </Box>
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
        <Card>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="h6" fontWeight={600}>Upcoming Meetings</Typography>
                <Typography variant="caption" color="text.secondary">
                  Next 7 days
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
              <EmptyState
                variant="empty"
                title="No meetings scheduled"
                description="Schedule your first meeting to get started."
              />
            )}
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>Recent Activity</Typography>
              <IconButton size="small">
                <MoreVertIcon fontSize="small" />
              </IconButton>
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
              <EmptyState
                variant="empty"
                title="No activity yet"
                description="Activity will appear here as changes are made."
              />
            )}
          </Box>
        </Card>

        <Card>
          <Box sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>Team Overview</Typography>
              <Button variant="tertiary" size="small" icon={<GroupIcon />}>
                View All
              </Button>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Active Team Members
              </Typography>
              <AvatarGroup
                users={[
                  { name: 'John Smith' },
                  { name: 'Sarah Johnson' },
                  { name: 'Mike Wilson' },
                  { name: 'Emily Brown' },
                  { name: 'David Lee' },
                ]}
                max={5}
                size="medium"
              />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Tasks Completed</Typography>
                  <Typography variant="caption" fontWeight={600}>78%</Typography>
                </Box>
                <ProgressBar value={78} showValue={false} size="small" color="success" />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Inspections Done</Typography>
                  <Typography variant="caption" fontWeight={600}>65%</Typography>
                </Box>
                <ProgressBar value={65} showValue={false} size="small" color="info" />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">Approvals Pending</Typography>
                  <Typography variant="caption" fontWeight={600}>23%</Typography>
                </Box>
                <ProgressBar value={23} showValue={false} size="small" color="warning" />
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  )
}
