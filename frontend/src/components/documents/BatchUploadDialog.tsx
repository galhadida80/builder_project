import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../common/ToastProvider'
import { FileDropzone } from './FileDropzone'
import { BatchUploadProgress } from './BatchUploadProgress'
import { uploadBatch, BatchUploadResponse } from '../../api/batchUpload'
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  LinearProgress,
} from '@/mui'

interface BatchUploadDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
}

const CATEGORIES = [
  'drawings',
  'specifications',
  'reports',
  'permits',
  'contracts',
  'photos',
  'inspections',
  'other',
]

export function BatchUploadDialog({ open, onClose, projectId }: BatchUploadDialogProps) {
  const { t } = useTranslation()
  const { showSuccess, showError } = useToast()
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState('')
  const [uploading, setUploading] = useState(false)
  const [batchResult, setBatchResult] = useState<BatchUploadResponse | null>(null)

  const handleUpload = async () => {
    if (files.length === 0) return

    setUploading(true)
    try {
      const result = await uploadBatch(projectId, files, {
        category: category || undefined,
        building: building || undefined,
        floor: floor || undefined,
      })
      setBatchResult(result)
      showSuccess(t('batchUpload.uploadStarted'))
    } catch (error: any) {
      const message = error?.response?.data?.detail || t('batchUpload.uploadFailed')
      showError(message)
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (uploading && !batchResult) return
    setFiles([])
    setCategory('')
    setBuilding('')
    setFloor('')
    setUploading(false)
    setBatchResult(null)
    onClose()
  }

  const handleProcessingComplete = () => {
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('batchUpload.title')}</DialogTitle>
      <DialogContent>
        {batchResult ? (
          <BatchUploadProgress
            projectId={projectId}
            batchId={batchResult.id}
            onComplete={handleProcessingComplete}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FileDropzone files={files} onFilesChange={setFiles} />

            <FormControl size="small" fullWidth>
              <InputLabel>{t('batchUpload.category')}</InputLabel>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                label={t('batchUpload.category')}
              >
                <MenuItem value="">{t('batchUpload.noCategory')}</MenuItem>
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat} value={cat}>
                    {t(`batchUpload.categories.${cat}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              fullWidth
              label={t('batchUpload.building')}
              value={building}
              onChange={(e) => setBuilding(e.target.value)}
            />

            <TextField
              size="small"
              fullWidth
              label={t('batchUpload.floor')}
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
            />

            {uploading && <LinearProgress />}
          </Box>
        )}
      </DialogContent>
      {!batchResult && (
        <DialogActions>
          <Button onClick={handleClose} disabled={uploading}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {t('batchUpload.upload')}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  )
}
