import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { getDateLocale } from '../utils/dateLocale'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmModal } from '../components/ui/Modal'
import { bimApi } from '../api/bim'
import { formatFileSize } from '../utils/fileUtils'
import { useToast } from '../components/common/ToastProvider'
import ForgeViewer from '../components/bim/ForgeViewer'
import IFCViewer from '../components/bim/IFCViewer'
import BimImportWizard from '../components/bim/BimImportWizard'
import type { BimModel } from '../types'
import { ArrowBackIcon, CategoryIcon, CloudUploadIcon, DeleteIcon, DescriptionIcon, FullscreenIcon, RotateRightIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, IconButton, LinearProgress, CircularProgress } from '@/mui'

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  uploaded: 'default',
  translating: 'warning',
  complete: 'success',
  failed: 'error',
}

const FILE_TYPE_COLORS: Record<string, string> = {
  '.rvt': 'primary.main',
  '.ifc': 'info.main',
  '.nwc': 'warning.main',
  '.nwd': 'warning.main',
  '.dwg': 'secondary.main',
}

const FILE_TYPE_BG: Record<string, string> = {
  '.rvt': 'primary.light',
  '.ifc': 'info.light',
  '.nwc': 'warning.light',
  '.nwd': 'warning.light',
  '.dwg': 'secondary.light',
}

const FILE_FORMAT_LABEL: Record<string, string> = {
  '.rvt': 'REVIT',
  '.ifc': 'IFC',
  '.nwc': 'NWC',
  '.nwd': 'NWD',
  '.dwg': 'DWG',
}

export default function BIMPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
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

  const getFormatBadge = (model: BimModel) => {
    const ext = getFileExtension(model.filename)
    const label = FILE_FORMAT_LABEL[ext] || ext.toUpperCase().replace('.', '')
    const size = model.fileSize ? formatFileSize(model.fileSize) : ''
    return size ? `${label} | ${size}` : label
  }

  const otherModels = selectedModel
    ? models.filter((m) => m.id !== selectedModel.id)
    : models

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3, mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden', pb: 3 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".rvt,.ifc,.nwd,.nwc,.dwg"
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      {/* Sticky Header */}
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          bgcolor: 'background.default',
          borderBottom: 1,
          borderColor: 'divider',
          px: { xs: 1.5, sm: 2, md: 3 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={700}>
            {t('bim.modelTitle', 'BIM Model')}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen()
            } else {
              document.documentElement.requestFullscreen()
            }
          }}
        >
          <FullscreenIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pt: 2 }}>
        {/* Viewer Area with format badge */}
        {selectedModel && (
          <>
            <Box sx={{ position: 'relative', mb: 2, borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ height: { xs: '45vh', md: '55vh' }, bgcolor: 'background.paper', borderRadius: 3 }}>
                {isIfc(selectedModel.filename) ? (
                  <IFCViewer projectId={projectId!} modelId={selectedModel.id} filename={selectedModel.filename} />
                ) : selectedModel.urn ? (
                  <ForgeViewer urn={selectedModel.urn} getToken={getViewerToken} />
                ) : null}
              </Box>
              {/* Format badge in top-right corner */}
              <Chip
                label={getFormatBadge(selectedModel)}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  bgcolor: 'action.hover',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  backdropFilter: 'blur(8px)',
                  height: 24,
                }}
              />
            </Box>

            {/* Model Info Bar */}
            <Box
              sx={{
                bgcolor: 'background.paper',
                p: 2,
                borderRadius: 3,
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: FILE_TYPE_BG[getFileExtension(selectedModel.filename)] || 'primary.light',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <DescriptionIcon
                  sx={{
                    color: FILE_TYPE_COLORS[getFileExtension(selectedModel.filename)] || 'primary.main',
                    fontSize: 24,
                  }}
                />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {selectedModel.filename}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(selectedModel.createdAt).toLocaleDateString(getDateLocale())} {getFileExtension(selectedModel.filename)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                {selectedModel.translationStatus === 'complete' && (
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                      },
                    }}
                  />
                )}
                <Chip
                  label={t(`bim.status.${selectedModel.translationStatus}`)}
                  color={STATUS_COLORS[selectedModel.translationStatus] || 'default'}
                  size="small"
                  sx={{ height: 24, fontSize: '0.7rem' }}
                />
                {selectedModel.translationStatus === 'complete' && (
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setImportModel(selectedModel)}
                  >
                    <CategoryIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleteModel(selectedModel)}
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Box>
          </>
        )}

        {/* Models list */}
        {models.length === 0 ? (
          <EmptyState
            icon={<DescriptionIcon sx={{ color: 'text.secondary' }} />}
            title={t('bim.noModels')}
            description={t('bim.noModelsDescription')}
            action={{ label: t('bim.upload'), onClick: () => fileInputRef.current?.click() }}
          />
        ) : (
          <>
            {/* Section header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="body2" fontWeight={700}>
                {selectedModel
                  ? t('bim.additionalModels', 'Additional Models')
                  : `${models.length} ${t('bim.title')}`
                }
              </Typography>
              {selectedModel && otherModels.length > 3 && (
                <Typography
                  variant="caption"
                  color="primary.main"
                  fontWeight={600}
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setSelectedModel(null)}
                >
                  {t('bim.viewAll', 'View All')}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {(selectedModel ? otherModels : models).map((model) => {
                const isSelected = selectedModel?.id === model.id
                const viewable = canView(model)
                const ext = getFileExtension(model.filename)

                return (
                  <Box
                    key={model.id}
                    onClick={() => handleModelClick(model)}
                    sx={{
                      bgcolor: 'background.paper',
                      borderRadius: 3,
                      p: 2,
                      cursor: viewable ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                      ...(isSelected && { border: '2px solid', borderColor: 'primary.main' }),
                      ...(viewable && {
                        '&:hover': { bgcolor: 'action.hover' },
                        '&:active': { transform: 'scale(0.98)' },
                      }),
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: FILE_TYPE_BG[ext] || 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <DescriptionIcon
                          sx={{
                            color: FILE_TYPE_COLORS[ext] || 'text.secondary',
                            fontSize: 20,
                          }}
                        />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {model.filename}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {FILE_FORMAT_LABEL[ext] || ext} {model.fileSize ? `| ${formatFileSize(model.fileSize)}` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        {model.translationStatus === 'translating' ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" fontWeight={700} color="primary.main">
                              {model.translationProgress}%
                            </Typography>
                            <CircularProgress size={16} sx={{ color: 'primary.main' }} />
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {model.translationStatus === 'complete' && (
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: '50%',
                                  bgcolor: 'success.main',
                                  animation: 'pulse 2s ease-in-out infinite',
                                  '@keyframes pulse': {
                                    '0%, 100%': { opacity: 1 },
                                    '50%': { opacity: 0.5 },
                                  },
                                }}
                              />
                            )}
                            <Chip
                              label={t(`bim.status.${model.translationStatus}`)}
                              color={STATUS_COLORS[model.translationStatus] || 'default'}
                              size="small"
                              sx={{ height: 22, fontSize: '0.65rem' }}
                            />
                          </Box>
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
                )
              })}
            </Box>
          </>
        )}

        {/* Upload button at bottom - full width */}
        <Box
          onClick={() => !uploading && fileInputRef.current?.click()}
          sx={{
            mt: 3,
            py: 2,
            borderRadius: 3,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: uploading ? 'default' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            transition: 'all 0.2s ease',
            ...(!uploading && {
              '&:hover': { opacity: 0.9 },
              '&:active': { transform: 'scale(0.98)' },
            }),
          }}
        >
          {uploading ? (
            <>
              <CircularProgress size={20} sx={{ color: 'inherit' }} />
              <Typography fontWeight={700}>{t('bim.uploading')}</Typography>
            </>
          ) : (
            <>
              <CloudUploadIcon />
              <Typography fontWeight={700}>{t('bim.upload')}</Typography>
            </>
          )}
        </Box>

        {/* Supported formats text */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
        >
          {t('bim.supportedFormats', 'Supported formats')}: .rvt, .ifc, .nwd, .nwc, .dwg
        </Typography>
      </Box>

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
