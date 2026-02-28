import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './Button'
import { filesApi } from '../../api/files'
import { formatFileSize } from '../../utils/fileUtils'
import { useToast } from '../common/ToastProvider'
import type { FileRecord } from '../../api/files'
import { DescriptionIcon, CloudUploadIcon, DownloadIcon, DeleteOutlineIcon, InsertDriveFileIcon } from '@/icons'
import { Box, Typography, List, ListItem, ListItemText, ListItemIcon, CircularProgress, IconButton, Tooltip, Chip } from '@/mui'

interface FileAttachmentPanelProps {
  projectId: string
  entityType: string
  entityId: string
  title?: string
  readOnly?: boolean
  maxFiles?: number
  acceptedTypes?: string
  onFilesChange?: (files: FileRecord[]) => void
}

export default function FileAttachmentPanel({
  projectId,
  entityType,
  entityId,
  title,
  readOnly = false,
  maxFiles,
  acceptedTypes,
  onFilesChange,
}: FileAttachmentPanelProps) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadFiles = useCallback(async () => {
    if (!projectId || !entityId) {
      setFiles([])
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await filesApi.list(projectId, entityType, entityId)
      setFiles(data)
      onFilesChange?.(data)
    } catch {
      setError(t('fileAttachment.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [projectId, entityType, entityId, t, onFilesChange])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleUpload = async () => {
    if (!projectId || !entityId) return
    if (maxFiles && files.length >= maxFiles) {
      showError(t('fileAttachment.maxFilesReached', { max: maxFiles }))
      return
    }

    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    if (acceptedTypes) input.accept = acceptedTypes

    input.onchange = async (e) => {
      const selectedFiles = Array.from((e.target as HTMLInputElement).files || [])
      if (!selectedFiles.length) return

      const remaining = maxFiles ? maxFiles - files.length : selectedFiles.length
      const filesToUpload = selectedFiles.slice(0, remaining)

      setUploading(true)
      try {
        for (const file of filesToUpload) {
          await filesApi.upload(projectId, entityType, entityId, file)
        }
        const data = await filesApi.list(projectId, entityType, entityId)
        setFiles(data)
        onFilesChange?.(data)
        showSuccess(t('fileAttachment.uploadSuccess', { count: filesToUpload.length }))
      } catch {
        showError(t('fileAttachment.uploadFailed'))
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleDownload = async (file: FileRecord) => {
    try {
      const blobUrl = await filesApi.getFileBlob(projectId, file.id)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(blobUrl)
    } catch {
      showError(t('fileAttachment.downloadFailed'))
    }
  }

  const handlePreview = async (file: FileRecord) => {
    try {
      const blobUrl = await filesApi.getFileBlob(projectId, file.id)
      window.open(blobUrl, '_blank')
    } catch {
      showError(t('fileAttachment.previewFailed'))
    }
  }

  const handleDelete = async (file: FileRecord) => {
    try {
      setDeletingId(file.id)
      await filesApi.delete(projectId, file.id)
      const updated = files.filter(f => f.id !== file.id)
      setFiles(updated)
      onFilesChange?.(updated)
      showSuccess(t('fileAttachment.deleteSuccess'))
    } catch {
      showError(t('fileAttachment.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <InsertDriveFileIcon color="success" />
    if (fileType === 'application/pdf') return <DescriptionIcon color="error" />
    return <DescriptionIcon color="primary" />
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {title || t('fileAttachment.title')}
        </Typography>
        {files.length > 0 && (
          <Chip label={files.length} size="small" color="default" sx={{ height: 20, fontSize: 11 }} />
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Typography color="error" variant="body2">{error}</Typography>
      ) : files.length === 0 ? (
        <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
          <Typography color="text.secondary" variant="body2">
            {t('fileAttachment.noFiles')}
          </Typography>
        </Box>
      ) : (
        <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 0.5 }}>
          {files.map((file) => (
            <ListItem
              key={file.id}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title={t('common.download')}>
                    <IconButton edge="end" size="small" onClick={() => handleDownload(file)} aria-label={t('common.download')}>
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {!readOnly && (
                    <Tooltip title={t('common.delete')}>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id}
                        aria-label={t('common.delete')}
                      >
                        {deletingId === file.id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteOutlineIcon fontSize="small" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              }
              sx={{
                cursor: 'pointer',
                '&:hover': { bgcolor: 'action.selected' },
                borderRadius: 1,
                pr: readOnly ? 6 : 10,
              }}
              onClick={() => handlePreview(file)}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getFileIcon(file.fileType)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {file.filename}
                  </Typography>
                }
                secondary={`${file.fileType.split('/').pop()?.toUpperCase() || file.fileType} - ${formatFileSize(file.fileSize)}`}
              />
            </ListItem>
          ))}
        </List>
      )}

      {!readOnly && (
        <Button
          variant="tertiary"
          size="small"
          icon={uploading ? undefined : <CloudUploadIcon />}
          loading={uploading}
          sx={{ mt: 1 }}
          onClick={handleUpload}
          disabled={!!(maxFiles && files.length >= maxFiles)}
        >
          {t('fileAttachment.upload')}
        </Button>
      )}
    </Box>
  )
}
