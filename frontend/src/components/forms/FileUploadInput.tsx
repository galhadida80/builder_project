import { useState } from 'react'
import { Box, FormControl, FormHelperText, Typography, IconButton, Chip } from '@mui/material'
import { styled } from '@mui/material'
import { useDropzone, FileRejection, Accept } from 'react-dropzone'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import DeleteIcon from '@mui/icons-material/Delete'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { FileUploadInputBaseProps, FileInputValue } from './types'

export interface FileUploadInputProps extends FileUploadInputBaseProps {
  /**
   * Maximum file size in bytes (default: 5MB)
   */
  maxSize?: number
}

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  width: '100%',
}))

const DropzoneContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isDragActive' && prop !== 'error' && prop !== 'disabled',
})<{ isDragActive?: boolean; error?: boolean; disabled?: boolean }>(({ theme, isDragActive, error, disabled }) => ({
  border: `2px dashed ${
    error ? theme.palette.error.main : isDragActive ? theme.palette.primary.main : theme.palette.divider
  }`,
  borderRadius: 8,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'border-color 200ms ease-out, background-color 200ms ease-out',
  backgroundColor: isDragActive
    ? theme.palette.action.hover
    : disabled
    ? theme.palette.action.disabledBackground
    : 'transparent',
  opacity: disabled ? 0.6 : 1,
  '&:hover': {
    borderColor: disabled ? undefined : theme.palette.primary.main,
    backgroundColor: disabled ? undefined : theme.palette.action.hover,
  },
}))

const FileList = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
}))

const FileItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: 8,
  backgroundColor: theme.palette.action.hover,
  transition: 'background-color 200ms ease-out',
}))

/**
 * FileUploadInput component for file uploads with drag-and-drop support
 *
 * Uses react-dropzone for drag-and-drop functionality and file validation.
 * Supports single and multiple file uploads with file type and size constraints.
 */
export function FileUploadInput({
  label,
  value,
  onChange,
  error,
  helperText,
  required = false,
  disabled = false,
  accept,
  multiple = false,
  maxSize = 5 * 1024 * 1024, // 5MB default
  id,
  name,
  className,
}: FileUploadInputProps) {
  // Convert accept prop to react-dropzone Accept format
  const acceptConfig: Accept | undefined = accept
    ? typeof accept === 'string'
      ? { [accept]: [] }
      : accept.reduce((acc, curr) => ({ ...acc, [curr]: [] }), {})
    : undefined

  const [rejectionError, setRejectionError] = useState<string | null>(null)

  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (disabled) return
    setRejectionError(null)

    if (fileRejections.length > 0) {
      const messages = fileRejections.map((r) =>
        r.errors.map((e) => `${r.file.name}: ${e.message}`).join(', ')
      )
      setRejectionError(messages.join('; '))
      return
    }

    if (multiple) {
      // Append to existing files or replace
      const currentFiles = Array.isArray(value) ? value : value ? [value] : []
      onChange([...currentFiles, ...acceptedFiles])
    } else {
      // Single file mode - take the first file
      onChange(acceptedFiles[0] || null)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptConfig,
    multiple,
    maxSize,
    disabled,
  })

  const removeFile = (index: number) => {
    if (disabled) return

    if (multiple && Array.isArray(value)) {
      const newFiles = value.filter((_, i) => i !== index)
      onChange(newFiles.length > 0 ? newFiles : null)
    } else {
      onChange(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const files = value ? (Array.isArray(value) ? value : [value]) : []

  return (
    <StyledFormControl
      error={!!error}
      required={required}
      disabled={disabled}
      className={className}
    >
      {label && (
        <Typography
          variant="body2"
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            mb: 1,
            color: error ? 'error.main' : 'text.primary',
          }}
        >
          {label}
          {required && ' *'}
        </Typography>
      )}

      <DropzoneContainer
        {...getRootProps()}
        isDragActive={isDragActive}
        error={!!error}
        disabled={disabled}
      >
        <input {...getInputProps()} id={id} name={name} />
        <CloudUploadIcon
          sx={{
            fontSize: 48,
            color: error ? 'error.main' : isDragActive ? 'primary.main' : 'text.secondary',
            mb: 1,
          }}
        />
        <Typography variant="body2" sx={{ fontSize: '0.875rem', mb: 0.5 }}>
          {isDragActive ? (
            'Drop files here'
          ) : (
            <>
              Drag and drop {multiple ? 'files' : 'a file'} here, or{' '}
              <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>
                click to browse
              </Box>
            </>
          )}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {accept && `Accepted types: ${Array.isArray(accept) ? accept.join(', ') : accept}`}
          {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
        </Typography>
      </DropzoneContainer>

      {files.length > 0 && (
        <FileList>
          {files.map((file, index) => (
            <FileItem key={`${file.name}-${index}`}>
              <InsertDriveFileIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(file.size)}
                </Typography>
              </Box>
              <IconButton
                size="small"
                aria-label={`Remove ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile(index)
                }}
                disabled={disabled}
                sx={{ ml: 'auto' }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </FileItem>
          ))}
        </FileList>
      )}

      {(error || rejectionError || helperText) && (
        <FormHelperText error={!!(error || rejectionError)}>{error || rejectionError || helperText}</FormHelperText>
      )}
    </StyledFormControl>
  )
}
