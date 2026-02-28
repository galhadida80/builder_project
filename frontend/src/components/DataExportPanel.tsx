import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../utils/dateLocale'
import { EmptyState } from './ui/EmptyState'
import {
  CloudQueueIcon,
  FileDownloadIcon,
  InsertDriveFileIcon,
  FolderIcon,
  CheckCircleIcon,
  ErrorIcon,
  HourglassBottomIcon,
  DownloadIcon,
} from '@/icons'
import { Box, Typography, Button, Card, CardContent, Chip, LinearProgress, SxProps, Theme, Stack } from '@/mui'
import { exportsApi } from '../api/exports'
import type { ExportJob, ExportFormat, ExportStatus } from '../types/export'

interface DataExportPanelProps {
  projectId: string
  sx?: SxProps<Theme>
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  json: <InsertDriveFileIcon />,
  csv: <InsertDriveFileIcon />,
  zip: <FolderIcon />,
}

const STATUS_CONFIG: Record<ExportStatus, { icon: React.ReactNode; color: 'success' | 'error' | 'warning' | 'info' }> = {
  pending: {
    icon: <HourglassBottomIcon sx={{ fontSize: 18 }} />,
    color: 'info',
  },
  processing: {
    icon: <HourglassBottomIcon sx={{ fontSize: 18 }} />,
    color: 'warning',
  },
  completed: {
    icon: <CheckCircleIcon sx={{ fontSize: 18 }} />,
    color: 'success',
  },
  failed: {
    icon: <ErrorIcon sx={{ fontSize: 18 }} />,
    color: 'error',
  },
}

export function DataExportPanel({ projectId, sx }: DataExportPanelProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null)

  const formats: { format: ExportFormat; label: string; description: string }[] = [
    {
      format: 'json',
      label: t('projectSettings.exportPanel.formats.json'),
      description: t('projectSettings.exportPanel.formatDescriptions.json'),
    },
    {
      format: 'csv',
      label: t('projectSettings.exportPanel.formats.csv'),
      description: t('projectSettings.exportPanel.formatDescriptions.csv'),
    },
    {
      format: 'zip',
      label: t('projectSettings.exportPanel.formats.zip'),
      description: t('projectSettings.exportPanel.formatDescriptions.zip'),
    },
  ]

  const fetchExportJobs = async () => {
    try {
      setLoadingJobs(true)
      const jobs = await exportsApi.list(projectId)
      setExportJobs(jobs)
    } catch (error) {
      console.error('Failed to fetch export jobs:', error)
    } finally {
      setLoadingJobs(false)
    }
  }

  useEffect(() => {
    fetchExportJobs()
  }, [projectId])

  useEffect(() => {
    const hasActiveJobs = exportJobs.some(
      (job) => job.status === 'pending' || job.status === 'processing'
    )

    if (!hasActiveJobs) return

    const pollInterval = setInterval(() => {
      fetchExportJobs()
    }, 3000)

    return () => clearInterval(pollInterval)
  }, [exportJobs, projectId])

  const handleStartExport = async (format: ExportFormat) => {
    try {
      setLoading(true)
      setSelectedFormat(format)
      await exportsApi.create(projectId, {
        exportFormat: format,
        exportType: 'project',
        projectId,
      })
      await fetchExportJobs()
    } catch (error) {
      console.error('Failed to start export:', error)
    } finally {
      setLoading(false)
      setSelectedFormat(null)
    }
  }

  const handleDownload = async (job: ExportJob) => {
    try {
      const blob = await exportsApi.download(projectId, job.id)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `export-${job.exportFormat}-${new Date(job.createdAt).toISOString().split('T')[0]}.${job.exportFormat === 'zip' ? 'zip' : job.exportFormat}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download export:', error)
    }
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '-'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  return (
    <Box sx={sx}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        {t('projectSettings.exportPanel.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {t('projectSettings.exportPanel.description')}
      </Typography>

      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        {t('projectSettings.exportPanel.selectFormat')}
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 4 }}>
        {formats.map(({ format, label, description }) => (
          <Card
            key={format}
            sx={{
              flex: 1,
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
              border: '2px solid',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
            onClick={() => !loading && handleStartExport(format)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ color: 'primary.main' }}>{FORMAT_ICONS[format]}</Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {label}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {description}
              </Typography>
              <Button
                variant="contained"
                size="small"
                fullWidth
                disabled={loading}
                startIcon={loading && selectedFormat === format ? <HourglassBottomIcon /> : <CloudQueueIcon />}
              >
                {loading && selectedFormat === format
                  ? t('projectSettings.exportPanel.exporting')
                  : t('projectSettings.exportPanel.startExport')}
              </Button>
            </CardContent>
          </Card>
        ))}
      </Stack>

      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        {t('projectSettings.exportPanel.recentExports')}
      </Typography>

      {loadingJobs ? (
        <Box>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <LinearProgress />
            </Box>
          ))}
        </Box>
      ) : exportJobs.length === 0 ? (
        <EmptyState
          variant="no-data"
          icon={<CloudQueueIcon />}
          title={t('projectSettings.exportPanel.noExports')}
          description={t('projectSettings.exportPanel.noExportsDescription')}
        />
      ) : (
        <Stack spacing={2}>
          {exportJobs.map((job) => {
            const statusConfig = STATUS_CONFIG[job.status as ExportStatus]
            return (
              <Card key={job.id} variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ color: 'text.secondary' }}>{FORMAT_ICONS[job.exportFormat as ExportFormat]}</Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {job.exportFormat.toUpperCase()}
                      </Typography>
                    </Box>
                    <Chip
                      label={t(`projectSettings.exportPanel.status.${job.status}`)}
                      size="small"
                      color={statusConfig.color}
                      variant="outlined"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('projectSettings.exportPanel.createdAt')}:{' '}
                      {new Date(job.createdAt).toLocaleDateString(getDateLocale(), {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}{' '}
                      {new Date(job.createdAt).toLocaleTimeString(getDateLocale(), {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                    {job.fileSize && (
                      <Typography variant="caption" color="text.secondary">
                        {t('projectSettings.exportPanel.fileSize')}: {formatFileSize(job.fileSize)}
                      </Typography>
                    )}
                  </Box>

                  {(job.status === 'pending' || job.status === 'processing') && (
                    <Box sx={{ mt: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {t(`projectSettings.exportPanel.status.${job.status}`)}
                        </Typography>
                      </Box>
                      <LinearProgress />
                    </Box>
                  )}

                  {job.status === 'completed' && (
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => handleDownload(job)}
                      sx={{ mt: 1 }}
                    >
                      {t('projectSettings.exportPanel.download')}
                    </Button>
                  )}

                  {job.status === 'failed' && job.errorMessage && (
                    <Box
                      sx={{
                        p: 1.5,
                        bgcolor: 'error.light',
                        borderRadius: 1,
                        mt: 1,
                        borderLeft: '3px solid',
                        borderColor: 'error.main',
                      }}
                    >
                      <Typography variant="caption" color="error.dark">
                        {job.errorMessage}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
