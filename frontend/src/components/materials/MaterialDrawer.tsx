import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { ApprovalStepper } from '../ui/Stepper'
import { filesApi } from '../../api/files'
import { formatFileSize } from '../../utils/fileUtils'
import { getDateLocale } from '../../utils/dateLocale'
import type { Material } from '../../types'
import type { FileRecord } from '../../api/files'
import { useToast } from '../common/ToastProvider'
import { CloseIcon, DescriptionIcon, SendIcon, InventoryIcon, CloudUploadIcon, DownloadIcon } from '@/icons'
import { Box, Typography, Drawer, Divider, List, ListItem, ListItemText, ListItemIcon, Chip, CircularProgress, IconButton } from '@/mui'

interface MaterialDrawerProps {
  open: boolean
  onClose: () => void
  material: Material | null
  projectId: string
  onEdit: (m: Material) => void
  onSubmitForApproval: () => void
  submitting: boolean
}

export default function MaterialDrawer({ open, onClose, material, projectId, onEdit, onSubmitForApproval, submitting }: MaterialDrawerProps) {
  const { t } = useTranslation()
  const dateLocale = getDateLocale()
  const { showError, showSuccess } = useToast()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadFiles = async () => {
      if (!open || !material || !projectId) { setFiles([]); setFilesError(null); return }
      try {
        setFilesLoading(true); setFilesError(null)
        const data = await filesApi.list(projectId, 'material', material.id)
        setFiles(data)
      } catch { setFilesError(t('materials.failedToLoadFiles')) } finally { setFilesLoading(false) }
    }
    loadFiles()
  }, [open, material, projectId])

  const handleFileUpload = async () => {
    if (!projectId || !material) return
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        await filesApi.upload(projectId, 'material', material.id, file)
        const data = await filesApi.list(projectId, 'material', material.id)
        setFiles(data); showSuccess(t('materials.fileUploadedSuccessfully'))
      } catch { showError(t('materials.failedToUploadFile')) } finally { setUploading(false) }
    }
    input.click()
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1400 }} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, borderRadius: '16px 0 0 16px' } }}>
      {material && (
        <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, overflowY: 'auto', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={600}>{t('materials.details')}</Typography>
            <IconButton aria-label={t('common.close')} onClick={onClose} size="small"><CloseIcon /></IconButton>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'warning.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <InventoryIcon sx={{ fontSize: 28, color: 'warning.main' }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700}>{material.name}</Typography>
                <StatusBadge status={material.status} />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>{t('materials.details')}</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Box><Typography variant="caption" color="text.secondary">{t('materials.type')}</Typography><Typography variant="body2" fontWeight={500}>{material.materialType || '-'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">{t('materials.manufacturer')}</Typography><Typography variant="body2" fontWeight={500}>{material.manufacturer || '-'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">{t('materials.model')}</Typography><Typography variant="body2" fontWeight={500}>{material.modelNumber || '-'}</Typography></Box>
            <Box><Typography variant="caption" color="text.secondary">{t('materials.quantity')}</Typography><Typography variant="body2" fontWeight={500}>{material.quantity ? `${Number(material.quantity).toLocaleString()} ${material.unit || ''}` : '-'}</Typography></Box>
            {material.expectedDelivery && (
              <Box><Typography variant="caption" color="text.secondary">{t('materials.deliveryDate')}</Typography><Typography variant="body2" fontWeight={500}>{new Date(material.expectedDelivery).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}</Typography></Box>
            )}
            {material.storageLocation && (
              <Box><Typography variant="caption" color="text.secondary">{t('materials.storageLocation')}</Typography><Typography variant="body2" fontWeight={500}>{material.storageLocation}</Typography></Box>
            )}
            {material.notes && (
              <Box sx={{ gridColumn: '1 / -1' }}><Typography variant="caption" color="text.secondary">{t('common.notes')}</Typography><Typography variant="body2">{material.notes}</Typography></Box>
            )}
          </Box>

          {material.specifications && Object.keys(material.specifications).length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>{t('keyValueEditor.title')}</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(material.specifications).map(([key, value]) => (
                  <Chip key={key} label={`${key}: ${value}`} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                ))}
              </Box>
            </>
          )}

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>{t('materials.documents')}</Typography>
          {filesLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
          ) : filesError ? (
            <Typography color="error" variant="body2">{filesError}</Typography>
          ) : files.length === 0 ? (
            <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
              <Typography color="text.secondary" variant="body2">{t('materials.noDocumentsAttached')}</Typography>
            </Box>
          ) : (
            <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
              {files.map((file) => (
                <ListItem key={file.id} secondaryAction={
                  <IconButton edge="end" size="small" onClick={async () => {
                    try { const blobUrl = await filesApi.getFileBlob(projectId, file.id); const link = document.createElement('a'); link.href = blobUrl; link.download = file.filename; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(blobUrl) } catch { showError(t('materials.failedToDownloadFile')) }
                  }}><DownloadIcon fontSize="small" /></IconButton>
                } sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' }, borderRadius: 1 }} onClick={async () => {
                  try { const blobUrl = await filesApi.getFileBlob(projectId, file.id); window.open(blobUrl, '_blank') } catch { showError(t('materials.failedToOpenFile')) }
                }}>
                  <ListItemIcon><DescriptionIcon color="primary" /></ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" fontWeight={500}>{file.filename}</Typography>} secondary={`${file.fileType.toUpperCase()} - ${formatFileSize(file.fileSize)}`} />
                </ListItem>
              ))}
            </List>
          )}
          <Button variant="tertiary" size="small" icon={uploading ? undefined : <CloudUploadIcon />} loading={uploading} sx={{ mt: 1 }} onClick={handleFileUpload}>{t('materials.uploadDocument')}</Button>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>{t('materials.approvalTimeline')}</Typography>
          <ApprovalStepper status={(material.status === 'revision_requested' ? 'rejected' : material.status) as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'} />

          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {material.status === 'draft' && (
              <Button variant="primary" icon={submitting ? undefined : <SendIcon />} loading={submitting} fullWidth onClick={onSubmitForApproval}>{t('materials.submitForApproval')}</Button>
            )}
            <Button variant="secondary" fullWidth onClick={() => onEdit(material)}>{t('materials.editMaterial')}</Button>
          </Box>
        </Box>
      )}
    </Drawer>
  )
}
