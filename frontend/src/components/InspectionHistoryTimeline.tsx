import { Box, Typography, Chip, Skeleton } from '@mui/material'
import AddCircleIcon from '@mui/icons-material/AddCircle'
import EditIcon from '@mui/icons-material/Edit'
import WarningIcon from '@mui/icons-material/Warning'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SyncIcon from '@mui/icons-material/Sync'
import DeleteIcon from '@mui/icons-material/Delete'
import CancelIcon from '@mui/icons-material/Cancel'
import HistoryIcon from '@mui/icons-material/History'
import { Avatar } from './ui/Avatar'
import { EmptyState } from './ui/EmptyState'
import type { InspectionHistoryEvent } from '../types'

const eventConfig: Record<string, { icon: React.ReactNode; color: 'success' | 'info' | 'error' | 'warning' | 'default' | 'primary'; bg: string }> = {
  create: { icon: <AddCircleIcon sx={{ fontSize: 18 }} />, color: 'primary', bg: 'primary.light' },
  update: { icon: <EditIcon sx={{ fontSize: 18 }} />, color: 'info', bg: 'info.light' },
  delete: { icon: <DeleteIcon sx={{ fontSize: 18 }} />, color: 'error', bg: 'error.light' },
  status_change: { icon: <SyncIcon sx={{ fontSize: 18 }} />, color: 'info', bg: 'info.light' },
  finding_added: { icon: <WarningIcon sx={{ fontSize: 18 }} />, color: 'warning', bg: 'warning.light' },
  completed: { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: 'success', bg: 'success.light' },
  approval: { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: 'success', bg: 'success.light' },
  rejection: { icon: <CancelIcon sx={{ fontSize: 18 }} />, color: 'error', bg: 'error.light' },
}

interface InspectionHistoryTimelineProps {
  events: InspectionHistoryEvent[]
  loading?: boolean
}

export function InspectionHistoryTimeline({ events, loading = false }: InspectionHistoryTimelineProps) {
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Box sx={{ minWidth: 140 }}>
              <Skeleton width={100} height={20} />
              <Skeleton width={80} height={16} sx={{ mt: 0.5 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Skeleton width={60} height={28} sx={{ mb: 1 }} />
              <Skeleton width="80%" height={20} />
              <Skeleton width="60%" height={20} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  if (events.length === 0) {
    return (
      <EmptyState
        variant="no-data"
        icon={<HistoryIcon />}
        title="No history available"
        description="There are no recorded events for this inspection yet."
      />
    )
  }

  const formatChanges = (oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>): string => {
    if (!oldValues && !newValues) return ''

    const changes: string[] = []
    const allKeys = new Set([...Object.keys(oldValues || {}), ...Object.keys(newValues || {})])

    allKeys.forEach(key => {
      const oldVal = oldValues?.[key]
      const newVal = newValues?.[key]
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        if (oldVal === undefined) {
          changes.push(`Added ${key}: ${String(newVal)}`)
        } else if (newVal === undefined) {
          changes.push(`Removed ${key}`)
        } else {
          changes.push(`Changed ${key} from "${String(oldVal)}" to "${String(newVal)}"`)
        }
      }
    })

    return changes.join(', ')
  }

  const getEventDescription = (event: InspectionHistoryEvent): string => {
    const changes = formatChanges(event.oldValues, event.newValues)

    if (event.action === 'create') {
      return 'Inspection created'
    } else if (event.action === 'status_change') {
      return changes || 'Status changed'
    } else if (event.action === 'update') {
      return changes || 'Inspection updated'
    } else if (event.action === 'delete') {
      return 'Inspection deleted'
    } else if (event.action === 'approval') {
      return 'Inspection approved'
    } else if (event.action === 'rejection') {
      return 'Inspection rejected'
    }

    return changes || event.action.replace('_', ' ')
  }

  return (
    <Box sx={{ p: 3 }}>
      {events.map((event, index) => {
        const config = eventConfig[event.action] || eventConfig.update
        const isLast = index === events.length - 1

        return (
          <Box
            key={event.id}
            sx={{
              display: 'flex',
              gap: 3,
              pb: isLast ? 0 : 3,
              position: 'relative',
            }}
          >
            {/* Timestamp - Left Side */}
            <Box sx={{ minWidth: 140, pt: 0.5 }}>
              <Typography variant="body2" fontWeight={500} sx={{ color: 'text.primary' }}>
                {new Date(event.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(event.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
            </Box>

            {/* Timeline Connector */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              {/* Icon Dot */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  bgcolor: config.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: `${config.color}.main`,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {config.icon}
              </Box>

              {/* Vertical Line */}
              {!isLast && (
                <Box
                  sx={{
                    width: 2,
                    flex: 1,
                    bgcolor: 'divider',
                    mt: 1,
                    mb: 1,
                  }}
                />
              )}
            </Box>

            {/* Event Content - Right Side */}
            <Box sx={{ flex: 1, pt: 0.5, pb: isLast ? 0 : 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={event.action.replace('_', ' ')}
                  size="small"
                  color={config.color}
                  sx={{
                    textTransform: 'capitalize',
                    fontWeight: 500,
                    height: 24,
                  }}
                />
              </Box>

              <Typography
                variant="body2"
                sx={{
                  color: 'text.primary',
                  mb: 1,
                  lineHeight: 1.5,
                }}
              >
                {getEventDescription(event)}
              </Typography>

              {/* User Attribution */}
              {event.user && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar name={event.user.fullName || 'Unknown'} size="small" />
                  <Typography variant="caption" color="text.secondary">
                    {event.user.fullName || 'Unknown User'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
