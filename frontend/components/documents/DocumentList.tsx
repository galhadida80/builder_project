'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import ImageIcon from '@mui/icons-material/Image'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import DescriptionIcon from '@mui/icons-material/Description'
import TableChartIcon from '@mui/icons-material/TableChart'
import { FileRecord } from '@/lib/api/files'
import { formatFileSize, getFileTypeCategory } from '@/lib/utils/file'

interface DocumentListProps {
  files: FileRecord[]
  onView: (file: FileRecord) => void
  onDownload: (file: FileRecord) => void
  onDelete?: (file: FileRecord) => void
  onAnalyze?: (file: FileRecord) => void
}

function getFileIcon(fileType: string) {
  const category = getFileTypeCategory(fileType)
  switch (category) {
    case 'pdf': return <PictureAsPdfIcon sx={{ color: '#ef4444' }} />
    case 'image': return <ImageIcon sx={{ color: '#3b82f6' }} />
    case 'document': return <DescriptionIcon sx={{ color: '#2563eb' }} />
    case 'spreadsheet': return <TableChartIcon sx={{ color: '#16a34a' }} />
    default: return <InsertDriveFileIcon sx={{ color: '#64748b' }} />
  }
}

export default function DocumentList({ files, onView, onDownload, onDelete, onAnalyze }: DocumentListProps) {
  if (files.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <InsertDriveFileIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">No documents uploaded yet</Typography>
      </Box>
    )
  }

  return (
    <List disablePadding>
      {files.map((file) => (
        <ListItem
          key={file.id}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            mb: 1,
            '&:last-child': { mb: 0 },
            pr: 1,
          }}
          secondaryAction={
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="View">
                <IconButton size="small" onClick={() => onView(file)}>
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download">
                <IconButton size="small" onClick={() => onDownload(file)}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {onAnalyze && (
                <Tooltip title="Analyze">
                  <IconButton size="small" onClick={() => onAnalyze(file)} sx={{ color: '#8b5cf6' }}>
                    <AutoFixHighIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onDelete && (
                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete(file)} sx={{ color: 'error.main' }}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          }
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            {getFileIcon(file.fileType)}
          </ListItemIcon>
          <ListItemText
            primary={
              <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: '60%' }}>
                {file.filename}
              </Typography>
            }
            secondary={
              <Typography variant="caption" color="text.secondary">
                {formatFileSize(file.fileSize)} &middot; {new Date(file.uploadedAt).toLocaleDateString()}
              </Typography>
            }
          />
        </ListItem>
      ))}
    </List>
  )
}
