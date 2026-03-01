import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getBatchStatus, BatchUploadStatusResponse } from '../../api/batchUpload'
import { formatFileSize } from '../../utils/fileUtils'
import { CheckCircleIcon, InsertDriveFileIcon } from '@/icons'
import {
  Box,
  Typography,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Alert,
} from '@/mui'

interface BatchUploadProgressProps {
  projectId: string
  batchId: string
  onComplete: () => void
}

const POLL_INTERVAL = 2000

export function BatchUploadProgress({ projectId, batchId, onComplete }: BatchUploadProgressProps) {
  const { t } = useTranslation()
  const [batch, setBatch] = useState<BatchUploadStatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let active = true

    const poll = async () => {
      try {
        const status = await getBatchStatus(projectId, batchId)
        if (!active) return
        setBatch(status)

        if (status.status === 'completed' || status.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        }
      } catch {
        if (!active) return
        setError(t('batchUpload.statusError'))
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }

    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL)

    return () => {
      active = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [projectId, batchId, t])

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button onClick={onComplete}>{t('common.close')}</Button>
        </Box>
      </Box>
    )
  }

  if (!batch) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <LinearProgress />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {t('batchUpload.loading')}
        </Typography>
      </Box>
    )
  }

  const progress =
    batch.totalFiles > 0
      ? Math.round(((batch.processedFiles + batch.failedFiles) / batch.totalFiles) * 100)
      : 0
  const isFinished = batch.status === 'completed' || batch.status === 'failed'

  return (
    <Box sx={{ py: 1 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" fontWeight={600}>
            {t('batchUpload.processing')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {batch.processedFiles + batch.failedFiles} / {batch.totalFiles}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          color={batch.failedFiles > 0 ? 'warning' : 'primary'}
        />
      </Box>

      {batch.failedFiles > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('batchUpload.failedCount', { count: batch.failedFiles })}
        </Alert>
      )}

      {isFinished && batch.failedFiles === 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('batchUpload.allCompleted')}
        </Alert>
      )}

      {batch.files.length > 0 && (
        <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
          {batch.files.map((file) => (
            <ListItem key={file.id}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <InsertDriveFileIcon fontSize="small" color="action" />
              </ListItemIcon>
              <ListItemText
                primary={file.filename}
                secondary={file.fileSize ? formatFileSize(file.fileSize) : undefined}
                primaryTypographyProps={{ noWrap: true }}
              />
              <CheckCircleIcon fontSize="small" color="success" />
            </ListItem>
          ))}
        </List>
      )}

      {isFinished && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button variant="contained" onClick={onComplete}>
            {t('common.close')}
          </Button>
        </Box>
      )}
    </Box>
  )
}
