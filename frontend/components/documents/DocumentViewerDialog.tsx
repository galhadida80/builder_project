'use client'

import { useState, useEffect } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile'
import { FileRecord, filesApi } from '@/lib/api/files'
import { getFileTypeCategory } from '@/lib/utils/file'

interface DocumentViewerDialogProps {
  open: boolean
  file: FileRecord | null
  projectId: string
  onClose: () => void
}

export default function DocumentViewerDialog({ open, file, projectId, onClose }: DocumentViewerDialogProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && file) {
      setLoading(true)
      setDownloadUrl(null)
      filesApi.getDownloadUrl(projectId, file.id)
        .then((url) => setDownloadUrl(url))
        .catch(() => setDownloadUrl(null))
        .finally(() => setLoading(false))
    }
  }, [open, file, projectId])

  if (!file) return null

  const category = getFileTypeCategory(file.fileType)
  const canPreview = category === 'pdf' || category === 'image'

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth sx={{ '& .MuiDialog-paper': { height: '85vh' } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={600} noWrap sx={{ flex: 1, mr: 2 }}>
          {file.filename}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            disabled={!downloadUrl}
          >
            Download
          </Button>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
        {loading ? (
          <CircularProgress />
        ) : !downloadUrl ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <InsertDriveFileIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">Failed to load file</Typography>
          </Box>
        ) : category === 'pdf' ? (
          <iframe
            src={downloadUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title={file.filename}
          />
        ) : category === 'image' ? (
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
            <img
              src={downloadUrl}
              alt={file.filename}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <InsertDriveFileIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Preview not available
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              This file type cannot be previewed in the browser.
            </Typography>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload}>
              Download File
            </Button>
          </Box>
        )}
      </DialogContent>
      {!canPreview && !loading && downloadUrl && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
