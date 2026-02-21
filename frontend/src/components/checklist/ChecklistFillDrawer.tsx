import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { StatusBadge } from '../ui/StatusBadge'
import { ChecklistSection } from './ChecklistSection'
import { checklistsApi } from '../../api/checklists'
import { filesApi } from '../../api/files'
import type { ChecklistTemplate, ChecklistInstance, ChecklistItemTemplate, ChecklistItemResponse } from '../../types'
import { useToast } from '../common/ToastProvider'
import { CloseIcon, CheckCircleIcon, PictureAsPdfIcon } from '@/icons'
import { Box, Typography, Chip, Drawer, LinearProgress, CircularProgress, IconButton } from '@/mui'

interface ChecklistFillDrawerProps {
  open: boolean
  onClose: () => void
  instance: ChecklistInstance | null
  template: ChecklistTemplate | null
  projectId: string
  onInstanceUpdate: (updated: ChecklistInstance) => void
}

export default function ChecklistFillDrawer({ open, onClose, instance, template, projectId, onInstanceUpdate }: ChecklistFillDrawerProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [localInstance, setLocalInstance] = useState<ChecklistInstance | null>(null)
  const [savingResponse, setSavingResponse] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [itemPhotos, setItemPhotos] = useState<Record<string, File[]>>({})
  const [itemSignature, setItemSignature] = useState<string | null>(user?.signatureUrl || null)

  const activeInstance = localInstance?.id === instance?.id ? localInstance : instance
  if (!activeInstance || !template) return null

  const getProgress = () => {
    const total = template.subsections.reduce((s, sub) => s + sub.items.length, 0)
    const completed = activeInstance.responses.filter((r) => r.status === 'approved' || r.status === 'not_applicable').length
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }
  const progress = getProgress()

  const handleStatusChange = async (item: ChecklistItemTemplate, status: string, notes?: string) => {
    if (!activeInstance || savingResponse) return
    setSavingResponse(true)
    try {
      const photoFiles = itemPhotos[item.id] || []
      const uploadedUrls: string[] = []
      for (const file of photoFiles) {
        const uploaded = await filesApi.upload(projectId, 'checklist_response', item.id, file)
        uploadedUrls.push(uploaded.storagePath)
      }

      const existingResponse = activeInstance.responses.find((r) => r.item_template_id === item.id)
      const existingUrls = existingResponse?.image_urls || []
      const imageUrls = [...existingUrls, ...uploadedUrls]

      let updatedResponse: ChecklistItemResponse
      if (existingResponse) {
        updatedResponse = await checklistsApi.updateResponse(activeInstance.id, existingResponse.id, {
          status, notes: notes || existingResponse.notes || undefined,
          signature_url: itemSignature || existingResponse.signature_url || undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })
      } else {
        updatedResponse = await checklistsApi.createResponse(activeInstance.id, {
          item_template_id: item.id, status, notes: notes || undefined,
          signature_url: itemSignature || undefined,
          image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        })
      }

      if (photoFiles.length > 0) {
        setItemPhotos(prev => { const next = { ...prev }; delete next[item.id]; return next })
      }

      const updated = {
        ...activeInstance,
        responses: existingResponse
          ? activeInstance.responses.map((r) => (r.id === updatedResponse.id ? updatedResponse : r))
          : [...activeInstance.responses, updatedResponse],
      }
      setLocalInstance(updated)
      onInstanceUpdate(updated)
    } catch { showError(t('checklists.failedToSave')) } finally { setSavingResponse(false) }
  }

  const handleComplete = async () => {
    if (!activeInstance) return
    try {
      const updated = await checklistsApi.updateInstance(projectId, activeInstance.id, { status: 'completed' })
      setLocalInstance(updated)
      onInstanceUpdate(updated)
      showSuccess(t('checklists.checklistCompleted'))
      onClose()
    } catch { showError(t('checklists.failedToUpdate')) }
  }

  const handleExportPdf = async () => {
    if (!activeInstance || exportingPdf) return
    setExportingPdf(true)
    try {
      const blob = await checklistsApi.exportPdf(projectId, activeInstance.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url
      a.download = `checklist_${activeInstance.unit_identifier}.pdf`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { showError(t('checklists.failedToLoad')) } finally { setExportingPdf(false) }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} sx={{ zIndex: 1400 }}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 540 }, maxWidth: '100vw' } }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" fontWeight={600}>{template.name}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Chip size="small" label={activeInstance.unit_identifier} variant="outlined" />
                <StatusBadge status={activeInstance.status} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton aria-label={t('checklists.exportPdf')} onClick={handleExportPdf} disabled={exportingPdf}
                sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
              >
                {exportingPdf ? <CircularProgress size={24} /> : <PictureAsPdfIcon />}
              </IconButton>
              <IconButton aria-label={t('common.close')} onClick={onClose}
                sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">{t('checklists.overallProgress')}</Typography>
              <Typography variant="caption" fontWeight={600}>
                {t('checklists.itemsCompleted', { completed: progress.completed, total: progress.total })}
              </Typography>
            </Box>
            <LinearProgress variant="determinate" value={progress.percent} sx={{
              height: 8, borderRadius: 4, bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: progress.percent === 100 ? 'success.main' : 'primary.main' },
            }} />
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {template.subsections.slice().sort((a, b) => a.order - b.order).map((section) => (
            <ChecklistSection key={section.id} section={section} responses={activeInstance.responses} defaultExpanded
              onStatusChange={handleStatusChange}
              onPhotosChange={(item, files) => setItemPhotos(prev => ({ ...prev, [item.id]: files }))}
              onSignatureChange={(_item, sig) => setItemSignature(sig)}
              savingResponse={savingResponse}
              readOnly={activeInstance.status === 'completed'}
            />
          ))}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button variant="primary" fullWidth icon={<CheckCircleIcon />} onClick={handleComplete}
            disabled={activeInstance.status === 'completed' || progress.completed < progress.total}
          >
            {t('checklists.completeChecklist')}
          </Button>
          {progress.completed < progress.total && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              {t('checklists.allItemsRequired')}
            </Typography>
          )}
        </Box>
      </Box>
    </Drawer>
  )
}
