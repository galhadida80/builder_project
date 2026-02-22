import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Typography, IconButton, Chip, Tooltip } from '@/mui'
import { SyncIcon, CloudQueueIcon } from '@/icons'
import { offlineQueue } from '../../services/offlineQueue'

export function OfflineQueueIndicator() {
  const { t } = useTranslation()
  const [count, setCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const refreshCount = useCallback(async () => {
    const c = await offlineQueue.count()
    setCount(c)
  }, [])

  useEffect(() => {
    refreshCount()
    const handler = () => refreshCount()
    window.addEventListener('offline-queue-change', handler)
    return () => window.removeEventListener('offline-queue-change', handler)
  }, [refreshCount])

  const handleSync = async () => {
    setSyncing(true)
    await offlineQueue.syncAll()
    await refreshCount()
    setSyncing(false)
  }

  if (count === 0) return null

  return (
    <Box sx={{
      position: 'fixed', bottom: 80, right: 16, zIndex: 1200,
      display: 'flex', alignItems: 'center', gap: 1,
      bgcolor: 'warning.main', color: 'warning.contrastText',
      px: 2, py: 1, borderRadius: 2, boxShadow: 3,
    }}>
      <CloudQueueIcon fontSize="small" />
      <Typography variant="body2" fontWeight={600}>
        {t('offline.pendingActions', { count })}
      </Typography>
      <Tooltip title={t('offline.syncNow')}>
        <IconButton
          size="small"
          onClick={handleSync}
          disabled={syncing}
          sx={{ color: 'inherit' }}
        >
          <SyncIcon fontSize="small" sx={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
