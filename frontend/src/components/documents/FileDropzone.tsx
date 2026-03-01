import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslation } from 'react-i18next'
import { useToast } from '../common/ToastProvider'
import { formatFileSize } from '../../utils/fileUtils'
import { CloudUploadIcon, CloseIcon, InsertDriveFileIcon } from '@/icons'
import {
  Box,
  Typography,
  Paper,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  styled,
  alpha,
} from '@/mui'

interface FileDropzoneProps {
  files: File[]
  onFilesChange: (files: File[]) => void
  maxFiles?: number
  maxTotalSize?: number
}

const MAX_FILES_DEFAULT = 100
const MAX_TOTAL_SIZE_DEFAULT = 1024 * 1024 * 1024 // 1 GB

const DropArea = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive',
})<{ isDragActive?: boolean }>(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 12,
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragActive
    ? alpha(theme.palette.primary.main, 0.08)
    : theme.palette.background.paper,
  transition: 'all 200ms ease-out',
  '&:hover': {
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

export function FileDropzone({
  files,
  onFilesChange,
  maxFiles = MAX_FILES_DEFAULT,
  maxTotalSize = MAX_TOTAL_SIZE_DEFAULT,
}: FileDropzoneProps) {
  const { t } = useTranslation()
  const { showError } = useToast()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const combined = [...files, ...acceptedFiles]
      if (combined.length > maxFiles) {
        showError(t('batchUpload.maxFilesError', { max: maxFiles }))
        return
      }
      const totalSize = combined.reduce((sum, f) => sum + f.size, 0)
      if (totalSize > maxTotalSize) {
        showError(t('batchUpload.maxSizeError', { max: formatFileSize(maxTotalSize) }))
        return
      }
      onFilesChange(combined)
    },
    [files, maxFiles, maxTotalSize, onFilesChange, showError, t],
  )

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    onFilesChange(updated)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)

  return (
    <Box>
      <DropArea {...getRootProps()} isDragActive={isDragActive} elevation={0}>
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
        <Typography variant="caption" color="text.secondary">
          {t('batchUpload.limits', {
            maxFiles,
            maxSize: formatFileSize(maxTotalSize),
          })}
        </Typography>
      </DropArea>

      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t('batchUpload.selectedFiles', { count: files.length })} ({formatFileSize(totalSize)})
          </Typography>
          <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
            {files.map((file, index) => (
              <ListItem key={`${file.name}-${index}`}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <InsertDriveFileIcon fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={formatFileSize(file.size)}
                  primaryTypographyProps={{ noWrap: true }}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" size="small" onClick={() => removeFile(index)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Box>
  )
}
