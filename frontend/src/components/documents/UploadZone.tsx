import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { useToast } from '../common/ToastProvider'
import { ProgressBar } from '../ui/ProgressBar'
import { formatFileSize } from '../../utils/fileUtils'
import { CloudUploadIcon } from '@/icons'
import { Box, Typography, Paper, CircularProgress, styled, alpha } from '@/mui'

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>
  disabled?: boolean
  maxSize?: number
  accept?: Record<string, string[]>
}

const StyledDropzone = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive' && prop !== 'isDisabled',
})<{ isDragActive?: boolean; isDisabled?: boolean }>(({ theme, isDragActive, isDisabled }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 12,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: isDisabled ? 'not-allowed' : 'pointer',
  backgroundColor: isDragActive
    ? alpha(theme.palette.primary.main, 0.08)
    : theme.palette.background.paper,
  transition: 'all 200ms ease-out',
  opacity: isDisabled ? 0.6 : 1,
  '&:hover': !isDisabled && {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}))

const IconWrapper = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 64,
  height: 64,
  borderRadius: '50%',
  backgroundColor: alpha(theme.palette.primary.main, 0.1),
  marginBottom: theme.spacing(2),
}))

export function UploadZone({
  onUpload,
  disabled = false,
  maxSize = 100 * 1024 * 1024, // 100MB default
  accept,
}: UploadZoneProps) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
  const [uploadQueue, setUploadQueue] = useState<File[]>([])
  const [uploadedCount, setUploadedCount] = useState(0)

  const handleDrop = async (acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((rejection) => {
        const file = rejection.file
        const errors = rejection.errors

        if (errors.some((e: any) => e.code === 'file-too-large')) {
          showError(t('upload.fileTooLarge', { name: file.name, size: maxSize / (1024 * 1024) }))
        } else if (errors.some((e: any) => e.code === 'file-invalid-type')) {
          showError(t('upload.invalidType', { name: file.name }))
        } else {
          showError(t('upload.uploadFailed', { name: file.name }))
        }
      })
    }

    // Handle accepted files
    if (acceptedFiles.length === 0) return

    setUploadQueue(acceptedFiles)
    setUploadedCount(0)
    setUploading(true)

    // Upload files sequentially
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i]
      setCurrentFileName(file.name)
      setUploadProgress(0)

      try {
        await onUpload(file)
        setUploadedCount(i + 1)
        // Parent component handles success notification
      } catch (error) {
        showError(t('upload.uploadFailed', { name: file.name }))
      }
    }

    // Reset state after all uploads complete
    setUploading(false)
    setUploadProgress(0)
    setCurrentFileName('')
    setUploadQueue([])
    setUploadedCount(0)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    disabled: disabled || uploading,
    maxSize,
    accept,
    multiple: true,
  })

  return (
    <Box>
      <StyledDropzone
        {...getRootProps()}
        isDragActive={isDragActive}
        isDisabled={disabled || uploading}
        elevation={0}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <CircularProgress size={40} />
            </Box>
            <Typography variant="body1" fontWeight={600} color="text.primary" gutterBottom>
              {t('upload.uploading', { name: currentFileName })}
            </Typography>
            {uploadQueue.length > 1 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('upload.filesUploaded', { current: uploadedCount, total: uploadQueue.length })}
              </Typography>
            )}
            <Box sx={{ mt: 2, px: 4 }}>
              <ProgressBar value={uploadProgress} showValue={false} />
            </Box>
          </Box>
        ) : (
          <>
            <IconWrapper>
              <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            </IconWrapper>
            <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
              {isDragActive ? t('upload.dropHere') : t('upload.dragAndDrop')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t('upload.orClickBrowse')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('upload.maxFileSize', { size: formatFileSize(maxSize) })}
            </Typography>
          </>
        )}
      </StyledDropzone>
    </Box>
  )
}
