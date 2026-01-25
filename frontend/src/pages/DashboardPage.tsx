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
import LinearProgress from '@mui/material/LinearProgress'
import BuildIcon from '@mui/icons-material/Build'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import EventIcon from '@mui/icons-material/Event'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import WarningIcon from '@mui/icons-material/Warning'
import { mockEquipment, mockMaterials, mockMeetings, mockApprovals, mockAuditLogs } from '../mocks/data'
import StatusBadge from '../components/common/StatusBadge'

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
  const pendingApprovals = mockApprovals.filter(a => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected')
  const upcomingMeetings = mockMeetings.filter(m => m.status === 'scheduled' || m.status === 'invitations_sent')
  const equipmentPending = mockEquipment.filter(e => e.status !== 'approved' && e.status !== 'draft')
  const materialsPending = mockMaterials.filter(m => m.status !== 'approved' && m.status !== 'draft')

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
            value={mockEquipment.length}
            subtitle={`${equipmentPending.length} pending approval`}
            icon={<BuildIcon />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Materials"
            value={mockMaterials.length}
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
                    ? mockEquipment.find(e => e.id === approval.entityId)
                    : mockMaterials.find(m => m.id === approval.entityId)
                  return (
                    <ListItem key={approval.id} divider sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: approval.entityType === 'equipment' ? 'primary.light' : 'secondary.light' }}>
                          {approval.entityType === 'equipment' ? <BuildIcon /> : <InventoryIcon />}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={entity?.name || 'Unknown'}
                        secondary={`${approval.entityType.charAt(0).toUpperCase() + approval.entityType.slice(1)} - Step ${approval.steps.filter(s => s.status === 'approved').length + 1} of ${approval.steps.length}`}
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
                      secondary={new Date(meeting.startTime).toLocaleString('en-US', {
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
              <Box sx={{ mt: 2 }}>
                {['Foundation', 'Structure', 'MEP Systems', 'Finishing'].map((phase, index) => {
                  const progress = [100, 75, 45, 10][index]
                  return (
                    <Box key={phase} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{phase}</Typography>
                        <Typography variant="body2" color="text.secondary">{progress}%</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 8, borderRadius: 4 }}
                        color={progress === 100 ? 'success' : progress > 50 ? 'primary' : 'warning'}
                      />
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Activity</Typography>
              <List disablePadding>
                {mockAuditLogs.slice(0, 5).map((log) => (
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
                          {log.user?.fullName} {log.action}d {log.entityType}
                        </Typography>
                      }
                      secondary={new Date(log.createdAt).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
