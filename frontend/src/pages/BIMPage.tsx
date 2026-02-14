import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { ConfirmModal } from '../components/ui/Modal'
import { StatusBadge } from '../components/ui/StatusBadge'
import { bimApi } from '../api/bim'
import { formatFileSize } from '../utils/fileUtils'
import { useToast } from '../components/common/ToastProvider'
import ForgeViewer from '../components/bim/ForgeViewer'
import IFCViewer from '../components/bim/IFCViewer'
import type { BimModel } from '../types'
import { CloudUploadIcon, DeleteIcon, DescriptionIcon, RotateRightIcon } from '@/icons'
import {
  Box,
  Typography,
  Skeleton,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  LinearProgress,
  Tooltip,
  CircularProgress,
} from '@/mui'

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
      for (const modelId of pollingIds) {
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
      }
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
    try {
      await bimApi.delete(projectId, deleteModel.id)
      setModels((prev) => prev.filter((m) => m.id !== deleteModel.id))
      if (selectedModel?.id === deleteModel.id) setSelectedModel(null)
      showSuccess(t('bim.deleteSuccess'))
    } catch {
      showError(t('bim.deleteFailed'))
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
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
            <Chip
              icon={<CloudUploadIcon />}
              label={uploading ? t('bim.uploading') : t('bim.upload')}
              color="primary"
              onClick={() => !uploading && fileInputRef.current?.click()}
              disabled={uploading}
              sx={{ cursor: 'pointer', fontWeight: 600 }}
            />
          </Box>
        }
      />

      {models.length === 0 ? (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 10,
            color: 'text.secondary',
          }}
        >
          <DescriptionIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">{t('bim.noModels')}</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {t('bim.noModelsDescription')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 2 }}>
          {models.map((model) => (
            <Card
              key={model.id}
              sx={{
                cursor: canView(model) ? 'pointer' : 'default',
                border: selectedModel?.id === model.id ? 2 : 1,
                borderColor: selectedModel?.id === model.id ? 'primary.main' : 'divider',
                transition: 'border-color 0.2s',
                '&:hover': canView(model) ? { borderColor: 'primary.light' } : {},
              }}
              onClick={() => handleModelClick(model)}
            >
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="subtitle1" fontWeight={600} noWrap sx={{ flex: 1, mr: 1 }}>
                    {model.filename}
                  </Typography>
                  <Chip
                    label={t(`bim.status.${model.translationStatus}`)}
                    color={STATUS_COLORS[model.translationStatus] || 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {model.fileSize ? formatFileSize(model.fileSize) : '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(model.createdAt).toLocaleDateString()}
                </Typography>

                {canView(model) && selectedModel?.id !== model.id && (
                  <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                    {t('bim.clickToView')}
                  </Typography>
                )}

                {model.translationStatus === 'translating' && (
                  <Box sx={{ mt: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={model.translationProgress}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      {t('bim.translating')} {model.translationProgress}%
                    </Typography>
                  </Box>
                )}
              </CardContent>
              <CardActions sx={{ pt: 0, px: 2, pb: 1, justifyContent: 'flex-end' }}>
                {model.translationStatus === 'uploaded' && model.urn && (
                  <Tooltip title={t('bim.translate')}>
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
                      <RotateRightIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title={t('common.delete')}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteModel(model)
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {selectedModel && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('bim.viewer')} — {selectedModel.filename}
          </Typography>
          {isIfc(selectedModel.filename) ? (
            <IFCViewer projectId={projectId!} modelId={selectedModel.id} filename={selectedModel.filename} />
          ) : selectedModel.urn ? (
            <ForgeViewer urn={selectedModel.urn} getToken={getViewerToken} />
          ) : null}
        </Box>
      )}

      <ConfirmModal
        open={!!deleteModel}
        onClose={() => setDeleteModel(null)}
        onConfirm={handleDelete}
        title={t('bim.deleteConfirmation')}
        message={t('bim.deleteConfirmationMessage', { name: deleteModel?.filename })}
        variant="danger"
      />
    </Box>
  )
}
