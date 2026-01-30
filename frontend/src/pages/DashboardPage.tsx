import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemAvatar from '@mui/material/ListItemAvatar'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
// LinearProgress import removed - unused
import CircularProgress from '@mui/material/CircularProgress'
import BuildIcon from '@mui/icons-material/Build'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EventIcon from '@mui/icons-material/Event'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningIcon from '@mui/icons-material/Warning'
import StatusBadge from '../components/common/StatusBadge'
import type { Equipment, Material, Meeting, ApprovalRequest, AuditLog } from '../types'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import { approvalsApi } from '../api/approvals'
import { auditApi } from '../api/audit'
import { useToast } from '../components/common/ToastProvider'

interface StatCardProps {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: string
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  )
}

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
        equipmentApi.list().catch(() => []),
        materialsApi.list().catch(() => []),
        meetingsApi.list().catch(() => []),
        approvalsApi.list().catch(() => []),
        auditApi.listAll({ limit: 10 }).catch(() => [])
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    )
  }

  const pendingApprovals = approvals.filter(a => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected')
  const upcomingMeetings = meetings.filter(m => m.status === 'scheduled' || m.status === 'invitations_sent')
  const equipmentPending = equipment.filter(e => e.status !== 'approved' && e.status !== 'draft')
  const materialsPending = materials.filter(m => m.status !== 'approved' && m.status !== 'draft')

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Overview of your construction projects
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Equipment Items"
            value={equipment.length}
            subtitle={`${equipmentPending.length} pending approval`}
            icon={<BuildIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Materials"
            value={materials.length}
            subtitle={`${materialsPending.length} pending approval`}
            icon={<InventoryIcon />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approvals"
            value={pendingApprovals.length}
            subtitle="Requires your attention"
            icon={<CheckCircleIcon />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Upcoming Meetings"
            value={upcomingMeetings.length}
            subtitle="In the next 7 days"
            icon={<EventIcon />}
            color="#9c27b0"
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Pending Approvals</Typography>
                <Chip label={pendingApprovals.length} size="small" color="warning" />
              </Box>
              <List disablePadding>
                {pendingApprovals.slice(0, 4).map((approval) => {
                  const entity = approval.entityType === 'equipment'
                    ? equipment.find(e => e.id === approval.entityId)
                    : materials.find(m => m.id === approval.entityId)
                  return (
                    <ListItem key={approval.id} divider sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: approval.entityType === 'equipment' ? 'primary.light' : 'secondary.light' }}>
                          {approval.entityType === 'equipment' ? <BuildIcon /> : <InventoryIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={entity?.name || 'Unknown'}
                        secondary={`${approval.entityType.charAt(0).toUpperCase() + approval.entityType.slice(1)} - Step ${approval.steps?.filter(s => s.status === 'approved').length || 0 + 1} of ${approval.steps?.length || 0}`}
                      />
                      <StatusBadge status={approval.currentStatus} />
                    </ListItem>
                  )
                })}
              </List>
              {pendingApprovals.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                  <Typography color="text.secondary">All caught up!</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Upcoming Meetings</Typography>
                <Chip label={upcomingMeetings.length} size="small" color="primary" />
              </Box>
              <List disablePadding>
                {upcomingMeetings.slice(0, 4).map((meeting) => (
                  <ListItem key={meeting.id} divider sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: 'info.light' }}>
                        <EventIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={meeting.title}
                      secondary={new Date(meeting.scheduledDate).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    />
                    <Chip
                      label={meeting.meetingType?.replace('_', ' ')}
                      size="small"
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </ListItem>
                ))}
              </List>
              {upcomingMeetings.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <EventIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No upcoming meetings</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Project Progress</Typography>
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">Select a project to view progress</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Activity</Typography>
              <List disablePadding>
                {auditLogs.slice(0, 5).map((log) => (
                  <ListItem key={log.id} sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.200' }}>
                        {log.action === 'create' && <TrendingUpIcon fontSize="small" color="success" />}
                        {log.action === 'approval' && <CheckCircleIcon fontSize="small" color="primary" />}
                        {log.action === 'update' && <WarningIcon fontSize="small" color="warning" />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body2">
                          {log.user?.fullName || 'Unknown'} {log.action}d {log.entityType}
                        </Typography>
                      }
                      secondary={new Date(log.createdAt).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
              {auditLogs.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">No recent activity</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
