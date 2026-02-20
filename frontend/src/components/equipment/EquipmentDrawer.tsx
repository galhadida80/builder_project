import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { ApprovalStepper } from '../ui/Stepper'
import { filesApi } from '../../api/files'
import { formatFileSize } from '../../utils/fileUtils'
import type { Equipment } from '../../types'
import type { FileRecord } from '../../api/files'
import { useToast } from '../common/ToastProvider'
import { CloseIcon, DescriptionIcon, SendIcon, BuildIcon, CloudUploadIcon, DownloadIcon } from '@/icons'
import { Box, Typography, Drawer, Divider, List, ListItem, ListItemText, ListItemIcon, Chip, CircularProgress, IconButton } from '@/mui'

interface EquipmentDrawerProps {
  open: boolean
  onClose: () => void
  equipment: Equipment | null
  projectId: string
  onEdit: (eq: Equipment) => void
  onSubmitForApproval: () => void
  submitting: boolean
}

export default function EquipmentDrawer({ open, onClose, equipment, projectId, onEdit, onSubmitForApproval, submitting }: EquipmentDrawerProps) {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const [files, setFiles] = useState<FileRecord[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [filesError, setFilesError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const loadFiles = async () => {
      if (!open || !equipment || !projectId) {
        setFiles([])
        setFilesError(null)
        return
      }
      try {
        setFilesLoading(true)
        setFilesError(null)
        const data = await filesApi.list(projectId, 'equipment', equipment.id)
        setFiles(data)
      } catch {
        setFilesError(t('equipment.failedToLoadFiles'))
      } finally {
        setFilesLoading(false)
      }
    }
    loadFiles()
  }, [open, equipment, projectId])

  const handleFileUpload = async () => {
    if (!projectId || !equipment) return
    const input = document.createElement('input')
    input.type = 'file'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        await filesApi.upload(projectId, 'equipment', equipment.id, file)
        const data = await filesApi.list(projectId, 'equipment', equipment.id)
        setFiles(data)
        showSuccess(t('equipment.fileUploadedSuccessfully'))
      } catch {
        showError(t('equipment.failedToUploadFile'))
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1400 }}
      PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, borderRadius: '16px 0 0 16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
    >
      {equipment && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: { xs: 1.5, sm: 2, md: 3 }, pb: 0, position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.default' }}>
            <Typography variant="h6" fontWeight={600}>{t('equipment.details')}</Typography>
            <IconButton aria-label={t('common.close')} onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, pt: 1.5, overflowY: 'auto', flex: 1 }}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <BuildIcon sx={{ fontSize: 28, color: 'primary.main' }} />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{equipment.name}</Typography>
                  <StatusBadge status={equipment.status} />
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('equipment.details')}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3, p: { xs: 1.5, sm: 2 }, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.type')}</Typography>
                <Typography variant="body2" fontWeight={500}>{equipment.equipmentType || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.manufacturer')}</Typography>
                <Typography variant="body2" fontWeight={500}>{equipment.manufacturer || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.model')}</Typography>
                <Typography variant="body2" fontWeight={500}>{equipment.modelNumber || '-'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">{t('equipment.serialNumber')}</Typography>
                <Typography variant="body2" fontWeight={500}>{equipment.serialNumber || '-'}</Typography>
              </Box>
              {equipment.notes && (
                <Box sx={{ gridColumn: '1 / -1' }}>
                  <Typography variant="caption" color="text.secondary">{t('common.notes')}</Typography>
                  <Typography variant="body2">{equipment.notes}</Typography>
                </Box>
              )}
            </Box>

            {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
                  {t('keyValueEditor.title')}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(equipment.specifications).map(([key, value]) => (
                    <Chip key={key} label={`${key}: ${value}`} size="small" variant="outlined" sx={{ fontWeight: 500 }} />
                  ))}
                </Box>
              </>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('equipment.documents')}
            </Typography>
            {filesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : filesError ? (
              <Typography color="error" variant="body2">{filesError}</Typography>
            ) : files.length === 0 ? (
              <Box sx={{ py: 2, px: 2, bgcolor: 'action.hover', borderRadius: 2, textAlign: 'center' }}>
                <Typography color="text.secondary" variant="body2">{t('equipment.noDocumentsAttached')}</Typography>
              </Box>
            ) : (
              <List dense sx={{ bgcolor: 'action.hover', borderRadius: 2 }}>
                {files.map((file) => (
                  <ListItem
                    key={file.id}
                    secondaryAction={
                      <IconButton
                        edge="end"
                        size="small"
                        aria-label={t('buttons.download')}
                        onClick={async () => {
                          try {
                            const blobUrl = await filesApi.getFileBlob(projectId, file.id)
                            const link = document.createElement('a')
                            link.href = blobUrl
                            link.download = file.filename
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                            URL.revokeObjectURL(blobUrl)
                          } catch {
                            showError(t('equipment.failedToDownloadFile'))
                          }
                        }}
                      >
                        <DownloadIcon fontSize="small" />
                      </IconButton>
                    }
                    sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.selected' }, borderRadius: 1 }}
                    onClick={async () => {
                      try {
                        const blobUrl = await filesApi.getFileBlob(projectId, file.id)
                        window.open(blobUrl, '_blank')
                      } catch {
                        showError(t('equipment.failedToOpenFile'))
                      }
                    }}
                  >
                    <ListItemIcon><DescriptionIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary={<Typography variant="body2" fontWeight={500}>{file.filename}</Typography>}
                      secondary={`${file.fileType.toUpperCase()} - ${formatFileSize(file.fileSize)}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            <Button variant="tertiary" size="small" icon={uploading ? undefined : <CloudUploadIcon />} loading={uploading} sx={{ mt: 1 }} onClick={handleFileUpload}>
              {t('equipment.addDocument')}
            </Button>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              {t('equipment.approvalTimeline')}
            </Typography>
            <ApprovalStepper status={(equipment.status === 'revision_requested' ? 'rejected' : equipment.status) as 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'} />

            <Box sx={{ mt: 3, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
              {equipment.status === 'draft' && (
                <Button variant="primary" icon={submitting ? undefined : <SendIcon />} loading={submitting} fullWidth onClick={onSubmitForApproval}>
                  {t('equipment.submitForApproval')}
                </Button>
              )}
              <Button variant="secondary" fullWidth onClick={() => onEdit(equipment)}>
                {t('equipment.editEquipment')}
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  )
}
