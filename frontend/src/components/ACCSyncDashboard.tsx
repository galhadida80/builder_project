import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { useToast } from './common/ToastProvider'
import { SyncIcon, CheckCircleIcon, WarningAmberIcon, ErrorOutlineIcon } from '@/icons'
import { Box, Typography, Chip, Alert, Skeleton, alpha } from '@/mui'

interface ACCSyncStatus {
  lastSyncedAt?: string
  syncHealth: 'ok' | 'warning' | 'error'
  conflictCount: number
  totalSynced: number
  isSyncing: boolean
}

export default function ACCSyncDashboard() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [status, setStatus] = useState<ACCSyncStatus>({
    syncHealth: 'ok',
    conflictCount: 0,
    totalSynced: 0,
    isSyncing: false,
  })

  useEffect(() => {
    loadSyncStatus()
  }, [projectId])

  const loadSyncStatus = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      // TODO: Replace with actual API call when backend endpoint is ready
      // const response = await rfiApi.getAccSyncStatus(projectId)
      // Mock data for now
      const mockStatus: ACCSyncStatus = {
        lastSyncedAt: new Date(Date.now() - 3600000).toISOString(),
        syncHealth: 'ok',
        conflictCount: 0,
        totalSynced: 12,
        isSyncing: false,
      }
      setStatus(mockStatus)
    } catch (error) {
      console.error('Failed to load ACC sync status:', error)
      showError(t('acc.sync.failedToLoadStatus', { defaultValue: 'Failed to load sync status' }))
    } finally {
      setLoading(false)
    }
  }

  const handleManualSync = async () => {
    if (!projectId) return
    try {
      setSyncing(true)
      // TODO: Replace with actual API call when backend endpoint is ready
      // await rfiApi.triggerAccSync(projectId)

      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000))

      showSuccess(t('acc.sync.syncTriggered', { defaultValue: 'Sync started successfully' }))
      await loadSyncStatus()
    } catch (error) {
      console.error('Failed to trigger sync:', error)
      showError(t('acc.sync.failedToTrigger', { defaultValue: 'Failed to trigger sync' }))
    } finally {
      setSyncing(false)
    }
  }

  const getHealthIcon = () => {
    switch (status.syncHealth) {
      case 'ok':
        return <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
      case 'warning':
        return <WarningAmberIcon sx={{ fontSize: 20, color: 'warning.main' }} />
      case 'error':
        return <ErrorOutlineIcon sx={{ fontSize: 20, color: 'error.main' }} />
      default:
        return <SyncIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
    }
  }

  const getHealthColor = (): 'success' | 'warning' | 'error' => {
    switch (status.syncHealth) {
      case 'ok':
        return 'success'
      case 'warning':
        return 'warning'
      case 'error':
        return 'error'
      default:
        return 'success'
    }
  }

  const formatLastSyncTime = (dateStr?: string) => {
    if (!dateStr) return t('acc.sync.neverSynced', { defaultValue: 'Never' })
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return t('acc.sync.justNow', { defaultValue: 'Just now' })
    if (diffMins < 60) return t('acc.sync.minutesAgo', { count: diffMins, defaultValue: `${diffMins}m ago` })
    if (diffHours < 24) return t('acc.sync.hoursAgo', { count: diffHours, defaultValue: `${diffHours}h ago` })
    return t('acc.sync.daysAgo', { count: diffDays, defaultValue: `${diffDays}d ago` })
  }

  if (loading) {
    return (
      <Card>
        <Box sx={{ p: 2 }}>
          <Skeleton variant="text" width={200} height={24} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={80} sx={{ borderRadius: 2 }} />
          </Box>
          <Skeleton variant="rectangular" width={120} height={36} sx={{ borderRadius: 1 }} />
        </Box>
      </Card>
    )
  }

  return (
    <Card>
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            {t('acc.sync.title', { defaultValue: 'ACC Sync' })}
          </Typography>
          <Chip
            icon={getHealthIcon()}
            label={t(`acc.sync.status.${status.syncHealth}`, { defaultValue: status.syncHealth })}
            color={getHealthColor()}
            size="small"
            sx={{ fontWeight: 600 }}
          />
        </Box>

        {status.syncHealth === 'error' && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {t('acc.sync.errorMessage', { defaultValue: 'Sync encountered errors. Please check the logs.' })}
          </Alert>
        )}

        {status.conflictCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: '0.875rem' }}>
            {t('acc.sync.conflictsDetected', { count: status.conflictCount, defaultValue: `${status.conflictCount} conflict(s) detected` })}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('acc.sync.lastSync', { defaultValue: 'Last Sync' })}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatLastSyncTime(status.lastSyncedAt)}
            </Typography>
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              bgcolor: (theme) => alpha(theme.palette.info.main, 0.08),
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('acc.sync.totalSynced', { defaultValue: 'Total Synced' })}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {status.totalSynced}
            </Typography>
          </Box>
        </Box>

        <Button
          variant="primary"
          icon={<SyncIcon />}
          onClick={handleManualSync}
          loading={syncing || status.isSyncing}
          disabled={syncing || status.isSyncing}
          fullWidth
        >
          {t('acc.sync.trigger', { defaultValue: 'Sync Now' })}
        </Button>
      </Box>
    </Card>
  )
}
