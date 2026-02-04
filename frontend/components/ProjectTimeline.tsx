import { Box, Typography, Avatar, Chip } from '@mui/material'
import { styled, alpha } from '@mui/material/styles'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ConstructionIcon from '@mui/icons-material/Construction'
import InventoryIcon from '@mui/icons-material/Inventory'
import EventIcon from '@mui/icons-material/Event'
import AssignmentIcon from '@mui/icons-material/Assignment'
import InfoIcon from '@mui/icons-material/Info'

export interface TimelineEvent {
  id: string
  date: string | Date
  title: string
  description?: string
  eventType: string
  entityId?: string
  entityType?: string
  userName?: string
  metadata?: Record<string, any>
}

interface ProjectTimelineProps {
  events: TimelineEvent[]
  maxEvents?: number
  emptyMessage?: string
}

const TimelineContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  paddingLeft: theme.spacing(3),
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 19,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor:
      theme.palette.mode === 'dark'
        ? alpha(theme.palette.divider, 0.3)
        : theme.palette.divider,
  },
}))

const TimelineItem = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  gap: theme.spacing(2),
  paddingBottom: theme.spacing(2),
}))

const TimelineDot = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: -24,
  top: 0,
  zIndex: 1,
}))

const TimelineContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
}))

const getEventIcon = (eventType: string) => {
  const iconProps = { sx: { fontSize: 16 } }
  switch (eventType.toLowerCase()) {
    case 'inspection':
      return <AssignmentIcon {...iconProps} />
    case 'equipment':
      return <ConstructionIcon {...iconProps} />
    case 'material':
      return <InventoryIcon {...iconProps} />
    case 'meeting':
      return <EventIcon {...iconProps} />
    case 'milestone':
      return <CheckCircleIcon {...iconProps} />
    default:
      return <InfoIcon {...iconProps} />
  }
}

const getEventColor = (eventType: string): 'primary' | 'success' | 'warning' | 'info' | 'error' | 'default' => {
  switch (eventType.toLowerCase()) {
    case 'inspection':
      return 'primary'
    case 'equipment':
      return 'warning'
    case 'material':
      return 'info'
    case 'meeting':
      return 'success'
    case 'milestone':
      return 'success'
    default:
      return 'default'
  }
}

const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      return minutes <= 1 ? 'Just now' : `${minutes} minutes ago`
    }
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return `${days} days ago`
  } else if (days < 30) {
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
  } else {
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
}

const formatTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function ProjectTimeline({
  events = [],
  maxEvents,
  emptyMessage = 'No timeline events yet',
}: ProjectTimelineProps) {
  const displayEvents = maxEvents ? events.slice(0, maxEvents) : events

  if (displayEvents.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          px: 3,
        }}
      >
        <AccessTimeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="body1" color="text.secondary" textAlign="center">
          {emptyMessage}
        </Typography>
      </Box>
    )
  }

  return (
    <TimelineContainer>
      {displayEvents.map((event, index) => {
        const color = getEventColor(event.eventType)
        const icon = getEventIcon(event.eventType)

        return (
          <TimelineItem key={event.id || index}>
            <TimelineDot>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: `${color}.main`,
                  color: `${color}.contrastText`,
                }}
              >
                {icon}
              </Avatar>
            </TimelineDot>

            <TimelineContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  color="text.primary"
                  sx={{ flex: 1 }}
                >
                  {event.title}
                </Typography>
                <Chip
                  label={event.eventType}
                  size="small"
                  color={color}
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>

              {event.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {event.description}
                </Typography>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTimeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(event.date)}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                    {formatTime(event.date)}
                  </Typography>
                </Box>

                {event.userName && (
                  <Typography variant="caption" color="text.secondary">
                    by {event.userName}
                  </Typography>
                )}
              </Box>
            </TimelineContent>
          </TimelineItem>
        )
      })}
    </TimelineContainer>
  )
}
