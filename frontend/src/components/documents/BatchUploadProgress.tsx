import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ProgressBar } from '../ui/ProgressBar'
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  styled,
  alpha,
} from '@/mui'
import {
  CheckCircleIcon,
  ErrorIcon,
  HourglassEmptyIcon,
  PendingIcon,
  RefreshIcon,
  InsertDriveFileIcon,
} from '@/icons'

interface ProcessingTask {
  id: string
  batchUploadId: string
  fileId: string
  taskType: string
  status: string
  progressPercent: number | null
  errorMessage: string | null
  celeryTaskId: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

interface BatchUpload {
  id: string
  projectId: string
  userId: string
  totalFiles: number
  completedFiles: number
  failedFiles: number
  status: string
  createdAt: string
  updatedAt: string
  processingTasks: ProcessingTask[]
}

interface BatchUploadProgressProps {
  batchId: string
  onComplete?: () => void
  onError?: (error: string) => void
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: 12,
}))

const TaskListItem = styled(ListItem)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.default, 0.5),
  borderRadius: 8,
  marginBottom: theme.spacing(1),
  '&:last-child': {
    marginBottom: 0,
  },
}))

const StatusChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'statusColor',
})<{ statusColor: 'success' | 'error' | 'warning' | 'info' | 'default' }>(({ theme, statusColor }) => ({
  fontSize: '0.75rem',
  height: 24,
  ...(statusColor === 'success' && {
    backgroundColor: alpha(theme.palette.success.main, 0.1),
    color: theme.palette.success.main,
  }),
  ...(statusColor === 'error' && {
    backgroundColor: alpha(theme.palette.error.main, 0.1),
    color: theme.palette.error.main,
  }),
  ...(statusColor === 'warning' && {
    backgroundColor: alpha(theme.palette.warning.main, 0.1),
    color: theme.palette.warning.main,
  }),
  ...(statusColor === 'info' && {
    backgroundColor: alpha(theme.palette.info.main, 0.1),
    color: theme.palette.info.main,
  }),
}))

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon sx={{ fontSize: 20, color: 'success.main' }} />
    case 'failed':
      return <ErrorIcon sx={{ fontSize: 20, color: 'error.main' }} />
    case 'processing':
      return <HourglassEmptyIcon sx={{ fontSize: 20, color: 'info.main' }} />
    case 'pending':
      return <PendingIcon sx={{ fontSize: 20, color: 'warning.main' }} />
    default:
      return <InsertDriveFileIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
  }
}

const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' | 'default' => {
  switch (status) {
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    case 'processing':
      return 'info'
    case 'pending':
      return 'warning'
    default:
      return 'default'
  }
}

export function BatchUploadProgress({
  batchId,
  onComplete,
  onError,
}: BatchUploadProgressProps) {
  const { t } = useTranslation()
  const [batchUpload, setBatchUpload] = useState<BatchUpload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!batchId) return

    const fetchBatchStatus = async () => {
      try {
        // TODO: Replace with actual API call when files.ts is extended (subtask-5-4)
        // For now, this is a placeholder
        // const response = await getBatchUploadStatus(batchId)
        // setBatchUpload(response)

        // Placeholder response for development
        const mockBatch: BatchUpload = {
          id: batchId,
          projectId: 'mock-project',
          userId: 'mock-user',
          totalFiles: 5,
          completedFiles: 3,
          failedFiles: 1,
          status: 'processing',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          processingTasks: [
            {
              id: '1',
              batchUploadId: batchId,
              fileId: 'file-1',
              taskType: 'upload',
              status: 'completed',
              progressPercent: 100,
              errorMessage: null,
              celeryTaskId: null,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: '2',
              batchUploadId: batchId,
              fileId: 'file-2',
              taskType: 'upload',
              status: 'processing',
              progressPercent: 60,
              errorMessage: null,
              celeryTaskId: null,
              startedAt: new Date().toISOString(),
              completedAt: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            {
              id: '3',
              batchUploadId: batchId,
              fileId: 'file-3',
              taskType: 'upload',
              status: 'failed',
              progressPercent: 0,
              errorMessage: 'File type not supported',
              celeryTaskId: null,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        }
        setBatchUpload(mockBatch)
        setLoading(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch batch status'
        setError(errorMessage)
        setLoading(false)
        if (onError) {
          onError(errorMessage)
        }
      }
    }

    // Initial fetch
    fetchBatchStatus()

    // Poll every 2 seconds
    const pollInterval = setInterval(() => {
      fetchBatchStatus()
    }, 2000)

    // Cleanup interval on unmount
    return () => {
      clearInterval(pollInterval)
    }
  }, [batchId, onError])

  // Check if batch is complete
  useEffect(() => {
    if (batchUpload && batchUpload.status === 'completed' && onComplete) {
      onComplete()
    }
  }, [batchUpload, onComplete])

  if (loading) {
    return (
      <StyledPaper>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <RefreshIcon sx={{ animation: 'spin 1s linear infinite' }} />
          <Typography variant="body2" color="text.secondary">
            {t('common.loading')}
          </Typography>
        </Box>
      </StyledPaper>
    )
  }

  if (error) {
    return (
      <StyledPaper>
        <Alert severity="error" icon={<ErrorIcon />}>
          {error}
        </Alert>
      </StyledPaper>
    )
  }

  if (!batchUpload) {
    return null
  }

  const progressPercent = batchUpload.totalFiles > 0
    ? Math.round((batchUpload.completedFiles / batchUpload.totalFiles) * 100)
    : 0

  const isComplete = batchUpload.status === 'completed'
  const hasFailed = batchUpload.failedFiles > 0

  return (
    <StyledPaper>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          {t('batchUpload.uploadProgress')}
        </Typography>

        <ProgressBar
          value={progressPercent}
          label={t('batchUpload.overallProgress')}
          color={hasFailed ? 'warning' : isComplete ? 'success' : 'primary'}
          size="medium"
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('batchUpload.filesCompleted', {
              completed: batchUpload.completedFiles,
              total: batchUpload.totalFiles,
            })}
          </Typography>
          {hasFailed && (
            <Typography variant="body2" color="error.main" fontWeight={500}>
              {t('batchUpload.someFilesFailed', { failed: batchUpload.failedFiles })}
            </Typography>
          )}
        </Box>

        {isComplete && !hasFailed && (
          <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircleIcon />}>
            {t('batchUpload.allFilesCompleted')}
          </Alert>
        )}
      </Box>

      {batchUpload.processingTasks.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5 }}>
            {t('batchUpload.processingFiles')}
          </Typography>

          <List sx={{ p: 0 }}>
            {batchUpload.processingTasks.map((task) => (
              <TaskListItem key={task.id}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getStatusIcon(task.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={500}>
                        {task.taskType}
                      </Typography>
                      <StatusChip
                        label={t(`batchUpload.status${task.status.charAt(0).toUpperCase() + task.status.slice(1)}`)}
                        statusColor={getStatusColor(task.status)}
                        size="small"
                      />
                    </Box>
                  }
                  secondary={
                    task.errorMessage ? (
                      <Typography variant="caption" color="error.main">
                        {task.errorMessage}
                      </Typography>
                    ) : task.progressPercent !== null ? (
                      <Typography variant="caption" color="text.secondary">
                        {task.progressPercent}%
                      </Typography>
                    ) : null
                  }
                />
              </TaskListItem>
            ))}
          </List>
        </Box>
      )}
    </StyledPaper>
  )
}
