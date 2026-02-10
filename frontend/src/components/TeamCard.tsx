import { Card as MuiCard, CardContent, CardHeader, Box, Typography, Chip } from '@mui/material'
import { styled } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarGroup } from './ui/Avatar'
import { TeamMember } from '../types'
import { getWorkloadColor } from '../utils/workloadCalculation'

interface TeamCardProps {
  teamName: string
  members: TeamMember[]
  onClick?: () => void
  showDetails?: boolean
}

const StyledCard = styled(MuiCard)(({ theme }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}))

const MemberRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1.5),
  borderRadius: 8,
  marginBottom: theme.spacing(1),
  transition: 'background-color 150ms ease-out',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&:last-child': {
    marginBottom: 0,
  },
}))

export function TeamCard({ teamName, members, onClick, showDetails = false }: TeamCardProps) {
  const { t } = useTranslation()
  const avgWorkload = members.length > 0
    ? members.reduce((sum, m) => sum + m.workloadPercent, 0) / members.length
    : 0

  return (
    <StyledCard onClick={onClick}>
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {teamName}
          </Typography>
        }
        subheader={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {t('teamCard.memberCount', { count: members.length })}
            </Typography>
            <Chip
              label={`${Math.round(avgWorkload)}% ${t('teamCard.avg')}`}
              size="small"
              color={getWorkloadColor(avgWorkload)}
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          </Box>
        }
        avatar={
          !showDetails && members.length > 0 ? (
            <AvatarGroup users={members.map(m => ({ name: m.user.fullName || m.user.email, src: undefined }))} max={3} size="small" />
          ) : undefined
        }
        sx={{ pb: 1 }}
      />
      <CardContent sx={{ pt: 0 }}>
        {showDetails ? (
          <Box>
            {members.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                {t('teamCard.noMembers')}
              </Typography>
            ) : (
              members.map((member) => (
                <MemberRow key={member.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                    <Avatar name={member.user.fullName || member.user.email} size="small" />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {member.user.fullName || member.user.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(`roles.${member.role}`, { defaultValue: member.role.replace('_', ' ') })}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 45, textAlign: 'right' }}>
                      {Math.round(member.workloadPercent)}%
                    </Typography>
                    <Chip
                      label={`${member.assignedHours}/${member.availableHours}h`}
                      size="small"
                      color={getWorkloadColor(member.workloadPercent)}
                      sx={{ height: 24, fontSize: '0.7rem', minWidth: 70 }}
                    />
                  </Box>
                </MemberRow>
              ))
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('teamCard.teamCapacity')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('teamCard.assigned')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {members.reduce((sum, m) => sum + m.assignedHours, 0)}h
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('teamCard.available')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {members.reduce((sum, m) => sum + m.availableHours, 0)}h
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('teamCard.utilization')}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: getWorkloadColor(avgWorkload) }}>
                  {Math.round(avgWorkload)}%
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </CardContent>
    </StyledCard>
  )
}
