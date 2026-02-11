import { PersonIcon } from '@/icons'
import { Card as MuiCard, CardContent, Avatar, Typography, Chip, Box, SxProps, Theme, styled } from '@/mui'

export interface TeamMember {
  id: string
  name: string
  email?: string
  avatar?: string
  roles: string[]
}

interface TeamMemberCardProps {
  member: TeamMember
  onClick?: () => void
  sx?: SxProps<Theme>
}

const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'clickable',
})<{ clickable?: boolean }>(({ theme, clickable }) => ({
  borderRadius: 12,
  transition: 'all 200ms ease-out',
  cursor: clickable ? 'pointer' : 'default',
  ...(clickable && {
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: theme.shadows[4],
    },
  }),
}))

export function TeamMemberCard({ member, onClick, sx }: TeamMemberCardProps) {
  return (
    <StyledCard clickable={!!onClick} onClick={onClick} sx={sx}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <Avatar
            src={member.avatar}
            sx={{
              width: 64,
              height: 64,
              mb: 1.5,
              bgcolor: 'primary.main',
            }}
          >
            {!member.avatar && <PersonIcon sx={{ fontSize: 32 }} />}
          </Avatar>

          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 0.5,
            }}
          >
            {member.name}
          </Typography>

          {member.email && (
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                fontSize: '0.85rem',
                mb: 1.5,
              }}
            >
              {member.email}
            </Typography>
          )}

          {member.roles && member.roles.length > 0 && (
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 0.5,
                justifyContent: 'center',
                mt: 1,
              }}
            >
              {member.roles.map((role) => (
                <Chip
                  key={role}
                  label={role}
                  size="small"
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    bgcolor: 'primary.main',
                    color: 'white',
                  }}
                />
              ))}
            </Box>
          )}
        </Box>
      </CardContent>
    </StyledCard>
  )
}
