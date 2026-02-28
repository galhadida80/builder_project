import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { formatFileSize } from '@/utils/fileUtils'
import { CloudUploadIcon, DeleteIcon, InsertDriveFileIcon, ErrorIcon } from '@/icons'
import { Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText, IconButton, Alert, styled, alpha } from '@/mui'

interface FileDropzoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  disabled?: boolean
  maxFiles?: number
  maxSize?: number
  accept?: Record<string, string[]>
}

const StyledDropzone = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive' && prop !== 'isDisabled' && prop !== 'hasError',
})<{ isDragActive?: boolean; isDisabled?: boolean; hasError?: boolean }>(({ theme, isDragActive, isDisabled, hasError }) => ({
  border: `2px dashed ${
    hasError ? theme.palette.error.main : isDragActive ? theme.palette.primary.main : theme.palette.divider
  }`,
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
    borderColor: hasError ? theme.palette.error.main : theme.palette.primary.main,
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

const FileListContainer = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(3),
  maxHeight: 300,
  overflowY: 'auto',
}))

const FileListItem = styled(ListItem)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.primary.main, 0.04),
  borderRadius: 8,
  marginBottom: theme.spacing(1),
  '&:last-child': {
    marginBottom: 0,
  },
}))

export function FileDropzone({
  files,
  onFilesChange,
  disabled = false,
  maxFiles = 100,
  maxSize = 1024 * 1024 * 1024, // 1GB default
  accept = {
    'application/pdf': ['.pdf'],
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
  },
}: FileDropzoneProps) {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<string[]>([])

  const handleDrop = (acceptedFiles: File[], rejectedFiles: any[]) => {
    const newErrors: string[] = []

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach((rejection) => {
        const file = rejection.file
        const fileErrors = rejection.errors

        if (fileErrors.some((e: any) => e.code === 'file-too-large')) {
          newErrors.push(t('batchUpload.fileTooLarge', { name: file.name, maxSize: formatFileSize(maxSize) }))
        } else if (fileErrors.some((e: any) => e.code === 'file-invalid-type')) {
          newErrors.push(t('batchUpload.invalidType', { name: file.name }))
        } else if (fileErrors.some((e: any) => e.code === 'too-many-files')) {
          newErrors.push(t('batchUpload.tooManyFiles', { maxFiles }))
        } else {
          newErrors.push(t('batchUpload.invalidFile', { name: file.name }))
        }
      })
    }

    // Check total file count
    const totalFiles = files.length + acceptedFiles.length
    if (totalFiles > maxFiles) {
      newErrors.push(t('batchUpload.maxFilesExceeded', { maxFiles }))
      setErrors(newErrors)
      return
    }

    // Calculate total size
    const totalSize = [...files, ...acceptedFiles].reduce((sum, file) => sum + file.size, 0)
    if (totalSize > maxSize) {
      newErrors.push(t('batchUpload.maxSizeExceeded', { maxSize: formatFileSize(maxSize) }))
      setErrors(newErrors)
      return
    }

    // Add accepted files
    if (acceptedFiles.length > 0) {
      onFilesChange([...files, ...acceptedFiles])
      setErrors([])
    } else {
      setErrors(newErrors)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index)
    onFilesChange(newFiles)
    setErrors([])
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    disabled,
    maxSize,
    accept,
    multiple: true,
  })

  const totalSize = files.reduce((sum, file) => sum + file.size, 0)

  return (
    <Box>
      <StyledDropzone
        {...getRootProps()}
        isDragActive={isDragActive}
        isDisabled={disabled}
        hasError={errors.length > 0}
        elevation={0}
      >
        <input {...getInputProps()} />

        <IconWrapper>
          <CloudUploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        </IconWrapper>

        <Typography variant="h6" fontWeight={600} color="text.primary" gutterBottom>
          {isDragActive ? t('batchUpload.dropHere') : t('batchUpload.dragAndDrop')}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('batchUpload.orClickBrowse')}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block">
          {t('batchUpload.acceptedTypes')}
        </Typography>

        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {t('batchUpload.limits', { maxFiles, maxSize: formatFileSize(maxSize) })}
        </Typography>
      </StyledDropzone>

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
          {errors.map((error, index) => (
            <Typography key={index} variant="body2">
              {error}
            </Typography>
          ))}
        </Alert>
      )}

      {files.length > 0 && (
        <FileListContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 2 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {t('batchUpload.selectedFiles', { count: files.length })}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('batchUpload.totalSize', { size: formatFileSize(totalSize) })}
            </Typography>
          </Box>

          <List sx={{ p: 0 }}>
            {files.map((file, index) => (
              <FileListItem key={`${file.name}-${index}`}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <InsertDriveFileIcon sx={{ color: 'text.secondary' }} />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                  primaryTypographyProps={{
                    variant: 'body2',
                    fontWeight: 500,
                    sx: {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    },
                  }}
                  secondaryTypographyProps={{
                    variant: 'caption',
                  }}
                />
                <IconButton
                  edge="end"
                  aria-label={t('batchUpload.removeFile', { name: file.name })}
                  onClick={() => removeFile(index)}
                  disabled={disabled}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </FileListItem>
            ))}
          </List>
        </FileListContainer>
      )}
    </Box>
  )
}
