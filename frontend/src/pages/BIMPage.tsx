import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmModal } from '../components/ui/Modal'
import { bimApi } from '../api/bim'
import { formatFileSize } from '../utils/fileUtils'
import { useToast } from '../components/common/ToastProvider'
import ForgeViewer from '../components/bim/ForgeViewer'
import IFCViewer from '../components/bim/IFCViewer'
import BimImportWizard from '../components/bim/BimImportWizard'
import type { BimModel } from '../types'
import { CategoryIcon, CloudUploadIcon, DeleteIcon, DescriptionIcon, RotateRightIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, IconButton, LinearProgress, CircularProgress } from '@/mui'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  uploaded: 'default',
  translating: 'warning',
  complete: 'success',
  failed: 'error',
}

export default function BIMPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<BimModel[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<BimModel | null>(null)
  const [deleteModel, setDeleteModel] = useState<BimModel | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importModel, setImportModel] = useState<BimModel | null>(null)
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set())

  const loadModels = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await bimApi.list(projectId)
      setModels(data)
      const translating = new Set<string>()
      data.forEach((m) => {
        if (m.translationStatus === 'translating') translating.add(m.id)
      })
      setPollingIds(translating)
    } catch {
      showError(t('bim.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [projectId, showError, t])

  useEffect(() => {
    loadModels()
  }, [loadModels])

  useEffect(() => {
    if (pollingIds.size === 0 || !projectId) return
    const interval = setInterval(async () => {
      await Promise.all([...pollingIds].map(async (modelId) => {
        try {
          const status = await bimApi.getStatus(projectId, modelId)
          setModels((prev) =>
            prev.map((m) =>
              m.id === modelId
                ? { ...m, translationStatus: status.translationStatus as BimModel['translationStatus'], translationProgress: status.translationProgress }
                : m
            )
          )
          if (status.translationStatus === 'complete' || status.translationStatus === 'failed') {
            setPollingIds((prev) => {
              const next = new Set(prev)
              next.delete(modelId)
              return next
            })
            if (status.translationStatus === 'complete') {
              showSuccess(t('bim.translationComplete'))
            }
          }
        } catch {
          // silent polling failure
        }
      }))
    }, 5000)
    return () => clearInterval(interval)
  }, [pollingIds, projectId, showSuccess, t])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !projectId) return
    e.target.value = ''

    setUploading(true)
    try {
      const model = await bimApi.upload(projectId, file)
      setModels((prev) => [model, ...prev])
      showSuccess(t('bim.uploadSuccess'))

      if (model.urn) {
        try {
          await bimApi.translate(projectId, model.id)
          setModels((prev) =>
            prev.map((m) => (m.id === model.id ? { ...m, translationStatus: 'translating' } : m))
          )
          setPollingIds((prev) => new Set(prev).add(model.id))
        } catch {
          showError(t('bim.translateFailed'))
        }
      }
    } catch {
      showError(t('bim.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModel || !projectId) return
    setDeleting(true)
    try {
      await withMinDuration(bimApi.delete(projectId, deleteModel.id))
      setModels((prev) => prev.filter((m) => m.id !== deleteModel.id))
      if (selectedModel?.id === deleteModel.id) setSelectedModel(null)
      showSuccess(t('bim.deleteSuccess'))
    } catch {
      showError(t('bim.deleteFailed'))
    } finally {
      setDeleting(false)
    }
    setDeleteModel(null)
  }

  const isIfc = (filename: string) => filename.toLowerCase().endsWith('.ifc')
  const canView = (model: BimModel) => isIfc(model.filename) || model.translationStatus === 'complete'

  const handleModelClick = (model: BimModel) => {
    if (canView(model)) {
      setSelectedModel(selectedModel?.id === model.id ? null : model)
    }
  }

  const getViewerToken = useCallback(async (): Promise<string> => {
    if (!projectId || !selectedModel) return ''
    const data = await bimApi.getViewerToken(projectId, selectedModel.id)
    return data.accessToken
  }, [projectId, selectedModel])

  const getFileExtension = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    return ext ? `.${ext}` : ''
  }

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
      <Skeleton variant="text" width={250} height={24} sx={{ mb: 3 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".rvt,.ifc,.nwd,.nwc,.dwg"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      <PageHeader
        title={t('bim.title')}
        subtitle={t('bim.subtitle')}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {uploading && <CircularProgress size={20} />}
            <Button
              variant="primary"
              icon={<CloudUploadIcon />}
              onClick={() => !uploading && fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? t('bim.uploading') : t('bim.upload')}
            </Button>
          </Box>
        }
      />

      {selectedModel && (
        <Card sx={{ mb: 2, overflow: 'hidden' }}>
          <Box sx={{ height: { xs: '45vh', md: '55vh' }, bgcolor: 'background.default' }}>
            {isIfc(selectedModel.filename) ? (
              <IFCViewer projectId={projectId!} modelId={selectedModel.id} filename={selectedModel.filename} />
            ) : selectedModel.urn ? (
              <ForgeViewer urn={selectedModel.urn} getToken={getViewerToken} />
            ) : null}
          </Box>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DescriptionIcon sx={{ color: 'primary.main' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700} noWrap>{selectedModel.filename}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(selectedModel.createdAt).toLocaleDateString(getDateLocale())} {getFileExtension(selectedModel.filename)}
              </Typography>
            </Box>
            <Chip
              label={t(`bim.status.${selectedModel.translationStatus}`)}
              color={STATUS_COLORS[selectedModel.translationStatus] || 'default'}
              size="small"
            />
          </Box>
        </Card>
      )}

      {models.length === 0 ? (
        <EmptyState
          icon={<DescriptionIcon sx={{ color: 'text.secondary' }} />}
          title={t('bim.noModels')}
          description={t('bim.noModelsDescription')}
          action={{ label: t('bim.upload'), onClick: () => fileInputRef.current?.click() }}
        />
      ) : (
        <>
          {!selectedModel && (
            <Typography variant="body2" fontWeight={700} sx={{ mb: 1.5 }}>
              {models.length} {t('bim.title')}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {models.map((model) => {
              const isSelected = selectedModel?.id === model.id
              const viewable = canView(model)

              return (
                <Card
                  key={model.id}
                  hoverable={viewable}
                  onClick={() => handleModelClick(model)}
                  sx={{
                    ...(isSelected && { border: '2px solid', borderColor: 'primary.main' }),
                    cursor: viewable ? 'pointer' : 'default',
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{
                        width: 40, height: 40, borderRadius: 2,
                        bgcolor: isSelected ? 'primary.light' : 'action.hover',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: isSelected ? 'primary.main' : 'text.secondary',
                      }}>
                        <DescriptionIcon />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>{model.filename}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getFileExtension(model.filename)} {model.fileSize ? `| ${formatFileSize(model.fileSize)}` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        {model.translationStatus === 'translating' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" fontWeight={700} color="primary.main">{model.translationProgress}%</Typography>
                            <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                          </Box>
                        ) : (
                          <Chip
                            label={t(`bim.status.${model.translationStatus}`)}
                            color={STATUS_COLORS[model.translationStatus] || 'default'}
                            size="small"
                            sx={{ height: 22, fontSize: '0.65rem' }}
                          />
                        )}
                      </Box>
                    </Box>

                    {model.translationStatus === 'translating' && (
                      <LinearProgress
                        variant="determinate"
                        value={model.translationProgress}
                        sx={{ height: 4, borderRadius: 2, mt: 1.5 }}
                      />
                    )}

                    <Box sx={{ display: 'flex', gap: 0.5, mt: 1.5, justifyContent: 'flex-end' }}>
                      {model.translationStatus === 'uploaded' && model.urn && (
                        <IconButton
                          size="small"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (!projectId) return
                            try {
                              await bimApi.translate(projectId, model.id)
                              setModels((prev) =>
                                prev.map((m) =>
                                  m.id === model.id ? { ...m, translationStatus: 'translating' } : m
                                )
                              )
                              setPollingIds((prev) => new Set(prev).add(model.id))
                            } catch {
                              showError(t('bim.translateFailed'))
                            }
                          }}
                        >
                          <RotateRightIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                      {model.translationStatus === 'complete' && (
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={(e) => { e.stopPropagation(); setImportModel(model) }}
                        >
                          <CategoryIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => { e.stopPropagation(); setDeleteModel(model) }}
                      >
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              )
            })}
          </Box>
        </>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3 }}>
        .rvt, .ifc, .nwd, .nwc, .dwg
      </Typography>

      {importModel && (
        <BimImportWizard
          open={!!importModel}
          onClose={() => setImportModel(null)}
          projectId={projectId!}
          model={importModel}
        />
      )}

      <ConfirmModal
        open={!!deleteModel}
        onClose={() => setDeleteModel(null)}
        onConfirm={handleDelete}
        title={t('bim.deleteConfirmation')}
        message={t('bim.deleteConfirmationMessage', { name: deleteModel?.filename })}
        variant="danger"
        loading={deleting}
      />
    </Box>
  )
}
