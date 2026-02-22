import { Avatar as MuiAvatar, AvatarGroup as MuiAvatarGroup, Box, Typography, Tooltip, styled } from '@/mui'

interface AvatarProps {
  name?: string
  src?: string
  size?: 'small' | 'medium' | 'large' | 'xlarge'
  variant?: 'circular' | 'rounded' | 'square'
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  showTooltip?: boolean
}

const sizeMap = {
  small: 28,
  medium: 36,
  large: 48,
  xlarge: 64,
}

const fontSizeMap = {
  small: '0.75rem',
  medium: '0.875rem',
  large: '1rem',
  xlarge: '1.25rem',
}

const StyledAvatar = styled(MuiAvatar, {
  shouldForwardProp: (prop) => prop !== 'avatarSize' && prop !== 'avatarColor',
})<{ avatarSize: number; avatarColor?: string }>(({ theme, avatarSize, avatarColor }) => ({
  width: avatarSize,
  height: avatarSize,
  backgroundColor: avatarColor || theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: 600,
  transition: 'box-shadow 200ms ease-out',
}))

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function stringToColor(string: string): string {
  let hash = 0
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = ['#c8956a', '#0D9488', '#7C3AED', '#DB2777', '#EA580C', '#16A34A']
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({
  name,
  src,
  size = 'medium',
  variant = 'circular',
  color,
  showTooltip = false,
}: AvatarProps) {
  const avatarSize = sizeMap[size]
  const bgColor = color ? undefined : name ? stringToColor(name) : undefined

  const avatar = (
    <StyledAvatar
      src={src}
      alt={name || ''}
      variant={variant}
      avatarSize={avatarSize}
      avatarColor={bgColor}
      sx={{
        fontSize: fontSizeMap[size],
        ...(color && { bgcolor: `${color}.main` }),
      }}
    >
      {!src && name && getInitials(name)}
    </StyledAvatar>
  )

  if (showTooltip && name) {
    return <Tooltip title={name}>{avatar}</Tooltip>
  }

  return avatar
}

interface AvatarGroupProps {
  users: Array<{ name: string; src?: string }>
  max?: number
  size?: 'small' | 'medium' | 'large'
  showTooltip?: boolean
}

export function AvatarGroup({ users, max = 4, size = 'medium', showTooltip = true }: AvatarGroupProps) {
  return (
    <MuiAvatarGroup max={max} sx={{ '& .MuiAvatar-root': { width: sizeMap[size], height: sizeMap[size] } }}>
      {users.map((user, index) => (
        <Avatar
          key={`${index}-${user.name}`}
          name={user.name}
          src={user.src}
          size={size}
          showTooltip={showTooltip}
        />
      ))}
    </MuiAvatarGroup>
  )
}

interface UserChipProps {
  name: string
  role?: string
  src?: string
  size?: 'small' | 'medium'
}

export function UserChip({ name, role, src, size = 'medium' }: UserChipProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Avatar name={name} src={src} size={size} />
      <Box>
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, lineHeight: 1.2, fontSize: size === 'small' ? '0.8rem' : '0.875rem' }}
        >
          {name}
        </Typography>
        {role && (
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
            {role}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
