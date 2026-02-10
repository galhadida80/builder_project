import { Box, Typography, IconButton } from '@mui/material'
import { useTranslation } from 'react-i18next'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ImageIcon from '@mui/icons-material/Image'
import DescriptionIcon from '@mui/icons-material/Description'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { DataTable, Column } from '../ui/DataTable'
import type { FileRecord } from '../../types'
import { formatFileSize } from '../../utils/fileUtils'

interface FileListProps {
  files: FileRecord[]
  loading?: boolean
  onFileClick?: (file: FileRecord) => void
  onDownload?: (file: FileRecord) => void
  onDelete?: (file: FileRecord) => void
  emptyMessage?: string
}

/**
 * Get appropriate icon based on file type
 */
const getFileIcon = (fileType: string) => {
  if (fileType === 'application/pdf') {
    return <PictureAsPdfIcon sx={{ fontSize: 20, color: 'error.main' }} />
  }
  if (fileType.startsWith('image/')) {
    return <ImageIcon sx={{ fontSize: 20, color: 'info.main' }} />
  }
  if (
    fileType === 'application/msword' ||
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'text/plain'
  ) {
    return <DescriptionIcon sx={{ fontSize: 20, color: 'primary.main' }} />
  }
  return <InsertDriveFileIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
}

/**
 * Get file extension from filename
 */
const getFileExtension = (filename: string): string => {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE'
}

/**
 * Format date to readable string
 */
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function FileList({
  files,
  loading = false,
  onFileClick,
  onDownload,
  onDelete,
  emptyMessage = 'No files in this folder',
}: FileListProps) {
  const { t } = useTranslation()
  const columns: Column<FileRecord>[] = [
    {
      id: 'filename',
      label: 'Name',
      minWidth: 300,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'grey.100',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {getFileIcon(row.fileType)}
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.filename}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getFileExtension(row.filename)}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'fileType',
      label: 'Type',
      minWidth: 140,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.fileType.split('/')[1]?.toUpperCase() || t('common.unknown')}
        </Typography>
      ),
    },
    {
      id: 'fileSize',
      label: 'Size',
      minWidth: 100,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {formatFileSize(row.fileSize)}
        </Typography>
      ),
    },
    {
      id: 'uploadedAt',
      label: 'Uploaded',
      minWidth: 120,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(row.uploadedAt)}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 120,
      align: 'right',
      render: (row) => (
        <Box
          sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}
          onClick={(e) => e.stopPropagation()}
        >
          {onFileClick && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onFileClick(row)
              }}
              title={t('documents.previewFile')}
            >
              <VisibilityIcon fontSize="small" />
            </IconButton>
          )}
          {onDownload && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(row)
              }}
              title={t('documents.downloadFile')}
            >
              <DownloadIcon fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row)
              }}
              title={t('documents.deleteFile')}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={files}
      getRowId={(row) => row.id}
      onRowClick={onFileClick}
      loading={loading}
      emptyMessage={emptyMessage}
      pagination={true}
      pageSize={10}
    />
  )
}
