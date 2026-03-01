import { useTranslation } from 'react-i18next'
import { CheckCircleIcon, ErrorIcon, CloudQueueIcon } from '@/icons'
import { Chip, CircularProgress } from '@/mui'

export type SyncStatusType = 'idle' | 'syncing' | 'synced' | 'error'

interface SyncStatusProps {
  status: SyncStatusType
  size?: 'small' | 'medium'
}

const statusColorMap: Record<SyncStatusType, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  idle: 'default',
  syncing: 'info',
  synced: 'success',
  error: 'error',
}

const statusLabelKeyMap: Record<SyncStatusType, string> = {
  idle: 'sync.idle',
  syncing: 'sync.syncing',
  synced: 'sync.synced',
  error: 'sync.syncError',
}

export default function SyncStatus({ status, size = 'small' }: SyncStatusProps) {
  const { t } = useTranslation()
  const iconSize = size === 'small' ? 16 : 20

  const getIcon = () => {
    switch (status) {
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
      label={t(statusLabelKeyMap[status])}
      color={statusColorMap[status]}
      size={size}
      icon={getIcon()}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
