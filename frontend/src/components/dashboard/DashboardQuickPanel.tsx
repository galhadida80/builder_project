import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { AvatarGroup } from '../ui/Avatar'
import { ProgressBar, CircularProgressDisplay } from '../ui/ProgressBar'
import { EmptyState } from '../ui/EmptyState'
import { BuildIcon, InventoryIcon, EventIcon, AssignmentIcon, GroupIcon } from '@/icons'
import { Box, Typography, Chip, List, ListItem, ListItemText, ListItemAvatar, Paper, alpha } from '@/mui'
import type { Equipment, Material, Meeting, TeamMember } from '../../types'

interface DashboardQuickPanelProps {
  upcomingMeetings: Meeting[]
  equipment: Equipment[]
  materials: Material[]
  equipmentPending: Equipment[]
  materialsPending: Material[]
  completionRate: number
  teamMembers: TeamMember[]
  selectedProjectId: string | undefined
  dateLocale: string
  onNavigate: (path: string) => void
  onShowWarning: (msg: string) => void
}

export default function DashboardQuickPanel({
  upcomingMeetings,
  equipment,
  materials,
  equipmentPending,
  materialsPending,
  completionRate,
  teamMembers,
  selectedProjectId,
  dateLocale,
  onNavigate,
  onShowWarning,
}: DashboardQuickPanelProps) {
  const { t } = useTranslation()

  const materialsApprovalRate = materials.length > 0
    ? Math.round((materials.filter(m => m.status === 'approved').length / materials.length) * 100)
    : 0

  const handleQuickAction = (path: string) => {
    if (selectedProjectId) {
      onNavigate(`/projects/${selectedProjectId}/${path}`)
    } else {
      onShowWarning(t('dashboard.selectProjectFirst'))
    }
  }

  return (
    <>
      {/* Meetings and Quick Actions */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 }, mb: { xs: 2.5, md: 3 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
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
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>{t('dashboard.quickActions')}</Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
              {[
                { icon: <BuildIcon />, label: t('dashboard.addEquipment'), path: 'equipment?action=add' },
                { icon: <InventoryIcon />, label: t('dashboard.addMaterial'), path: 'materials?action=add' },
                { icon: <EventIcon />, label: t('dashboard.scheduleMeeting'), path: 'meetings?action=add' },
                { icon: <AssignmentIcon />, label: t('dashboard.newInspection'), path: 'inspections?action=add' },
              ].map((action) => (
                <Button
                  key={action.path}
                  variant="secondary"
                  size="small"
                  icon={action.icon}
                  fullWidth
                  sx={{
                    justifyContent: 'flex-start',
                    px: 2,
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'scale(1.02)' },
                  }}
                  onClick={() => handleQuickAction(action.path)}
                >
                  {action.label}
                </Button>
              ))}
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Completion Rate and Team Overview */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.5, md: 2 } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
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
        </Paper>

        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={600}>{t('dashboard.teamOverview')}</Typography>
              <Button variant="tertiary" size="small" icon={<GroupIcon />} onClick={() => onNavigate('/team-workload')}>
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
                  <Typography variant="caption" fontWeight={600}>{materialsApprovalRate}%</Typography>
                </Box>
                <ProgressBar value={materialsApprovalRate} showValue={false} size="small" color="info" />
              </Box>
            </Box>
          </Box>
        </Paper>
      </Box>
    </>
  )
}
