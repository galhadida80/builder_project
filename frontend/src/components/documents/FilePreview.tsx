import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '../ui/EmptyState'
import type { FileRecord } from '../../types'
import { filesApi } from '../../api/files'
import { formatFileSize } from '../../utils/fileUtils'
import { DownloadIcon, CloseIcon, PictureAsPdfIcon, ImageIcon, InsertDriveFileIcon } from '@/icons'
import { Box, Typography, IconButton, CircularProgress, Paper, styled } from '@/mui'

interface FilePreviewProps {
  file: FileRecord | null
  projectId: string
  onClose?: () => void
  onDownload?: (file: FileRecord) => void
}

const PreviewContainer = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
}))

const PreviewHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper,
}))

const PreviewContent = styled(Box)({
  flex: 1,
  overflow: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f5f5f5',
})

const ImagePreview = styled('img')({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  padding: '16px',
})

const PDFPreview = styled('iframe')({
  width: '100%',
  height: '100%',
  border: 'none',
})

/**
 * Get appropriate icon based on file type
 */
const getFileIcon = (fileType: string) => {
  if (fileType === 'application/pdf') {
    return <PictureAsPdfIcon sx={{ fontSize: 48, color: 'error.main' }} />
  }
  if (fileType.startsWith('image/')) {
    return <ImageIcon sx={{ fontSize: 48, color: 'info.main' }} />
  }
  return <InsertDriveFileIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
}

/**
 * Check if file type can be previewed
 */
const isPreviewable = (fileType: string): boolean => {
  return fileType === 'application/pdf' || fileType.startsWith('image/')
}

export function FilePreview({ file, projectId, onClose, onDownload }: FilePreviewProps) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let currentUrl = ''
    let mounted = true

    const load = async () => {
      if (!file || !mounted) {
        setPreviewUrl('')
        setError(false)
        return
      }

      try {
        setLoading(true)
        setError(false)
        const blobUrl = await filesApi.getFileBlob(projectId, file.id)
        if (mounted) {
          currentUrl = blobUrl
          setPreviewUrl(blobUrl)
        }
      } catch (err) {
        if (mounted) {
          setError(true)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl)
      }
    }
  }, [file?.id, projectId])

  const handleDownload = () => {
    if (file && onDownload) {
      onDownload(file)
    } else if (file && previewUrl) {
      const link = document.createElement('a')
      link.href = previewUrl
      link.download = file.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const loadPreview = () => {
    if (!file) return

    setError(false)
    setLoading(true)

    filesApi.getFileBlob(projectId, file.id)
      .then(blobUrl => {
        setPreviewUrl(blobUrl)
        setError(false)
      })
      .catch(() => {
        setError(true)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  if (!file) {
    return (
      <PreviewContainer elevation={0}>
        <EmptyState
          variant="no-data"
          title={t('documents.noFileSelected')}
          description={t('documents.selectFileToPreview')}
          icon={<InsertDriveFileIcon />}
        />
      </PreviewContainer>
    )
  }

  return (
    <PreviewContainer elevation={1}>
      <PreviewHeader>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            {getFileIcon(file.fileType)}
            <Typography
              variant="subtitle1"
              fontWeight={600}
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {file.filename}
            </Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(file.fileSize)} • {file.fileType}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton size="small" onClick={handleDownload} aria-label={t('documents.downloadFile')}>
            <DownloadIcon fontSize="small" />
          </IconButton>
          {onClose && (
            <IconButton size="small" onClick={onClose} aria-label={t('documents.closePreview')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </PreviewHeader>

      <PreviewContent>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Loading preview...
            </Typography>
          </Box>
        )}

        {error && (
          <EmptyState
            variant="error"
            title={t('documents.failedToLoadPreview')}
            description={t('documents.unableToLoadPreview')}
            action={{
              label: 'Download File',
              onClick: handleDownload,
            }}
            secondaryAction={{
              label: 'Try Again',
              onClick: loadPreview,
            }}
          />
        )}

        {!loading && !error && previewUrl && isPreviewable(file.fileType) && (
          <>
            {file.fileType.startsWith('image/') && (
              <ImagePreview src={previewUrl} alt={file.filename} />
            )}

            {file.fileType === 'application/pdf' && <PDFPreview src={previewUrl} title={file.filename} />}
          </>
        )}

        {!loading && !error && !isPreviewable(file.fileType) && (
          <EmptyState
            title={t('documents.previewNotAvailable')}
            description={t('documents.cannotPreviewFileType')}
            icon={getFileIcon(file.fileType)}
            action={{
              label: 'Download File',
              onClick: handleDownload,
            }}
          />
        )}
      </PreviewContent>
    </PreviewContainer>
  )
}
