import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import CloudQueueIcon from '@mui/icons-material/CloudQueue'

export type SyncStatusType = 'idle' | 'syncing' | 'synced' | 'error'

interface SyncStatusProps {
  status: SyncStatusType
  size?: 'small' | 'medium'
}

const statusConfig: Record<
  SyncStatusType,
  {
    label: string
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'
    iconType: 'idle' | 'syncing' | 'synced' | 'error'
  }
> = {
  idle: {
    label: 'Idle',
    color: 'default',
    iconType: 'idle',
  },
  syncing: {
    label: 'Syncing',
    color: 'info',
    iconType: 'syncing',
  },
  synced: {
    label: 'Synced',
    color: 'success',
    iconType: 'synced',
  },
  error: {
    label: 'Sync Error',
    color: 'error',
    iconType: 'error',
  },
}

export default function SyncStatus({ status, size = 'small' }: SyncStatusProps) {
  const config = statusConfig[status]
  const iconSize = size === 'small' ? 16 : 20

  const getIcon = () => {
    switch (config.iconType) {
      case 'idle':
        return <CloudQueueIcon sx={{ fontSize: iconSize }} />
      case 'syncing':
        return <CircularProgress size={iconSize} color="inherit" />
      case 'synced':
        return <CheckCircleIcon sx={{ fontSize: iconSize }} />
      case 'error':
        return <ErrorIcon sx={{ fontSize: iconSize }} />
    }
  }

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      icon={getIcon()}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
