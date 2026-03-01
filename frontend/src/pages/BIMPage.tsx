import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { withMinDuration } from '../utils/async'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmModal } from '../components/ui/Modal'
import { bimApi } from '../api/bim'
import { useToast } from '../components/common/ToastProvider'
import BimImportWizard from '../components/bim/BimImportWizard'
import BimDataSidebar from '../components/bim/BimDataSidebar'
import BimViewerPanel from '../components/bim/BimViewerPanel'
import BimModelCard from '../components/bim/BimModelCard'
import BimUploadButton from '../components/bim/BimUploadButton'
import { isIfc } from '../components/bim/bimConstants'
import type { BimModel } from '../types'
import { ArrowBackIcon, DescriptionIcon, FullscreenIcon, ViewColumnIcon } from '@/icons'
import { Box, Typography, Skeleton, IconButton, Drawer, useTheme, useMediaQuery } from '@/mui'

export default function BIMPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { showError, showSuccess } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<BimModel[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<BimModel | null>(null)
  const [deleteModel, setDeleteModel] = useState<BimModel | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importModel, setImportModel] = useState<BimModel | null>(null)
  const [pollingIds, setPollingIds] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedBimObjectIds, setSelectedBimObjectIds] = useState<string[]>([])
  const [isolationMode, setIsolationMode] = useState(false)

  const loadModels = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await bimApi.list(projectId)
      setModels(data)
      const translating = new Set<string>()
      data.forEach((m) => { if (m.translationStatus === 'translating') translating.add(m.id) })
      setPollingIds(translating)
    } catch {
      showError(t('bim.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [projectId, showError, t])

  useEffect(() => { loadModels() }, [loadModels])

  useEffect(() => {
    if (pollingIds.size === 0 || !projectId) return
    const interval = setInterval(async () => {
      await Promise.all([...pollingIds].map(async (modelId) => {
        try {
          const status = await bimApi.getStatus(projectId, modelId)
          setModels((prev) => prev.map((m) =>
            m.id === modelId ? { ...m, translationStatus: status.translationStatus as BimModel['translationStatus'], translationProgress: status.translationProgress } : m
          ))
          if (status.translationStatus === 'complete' || status.translationStatus === 'failed') {
            setPollingIds((prev) => { const next = new Set(prev); next.delete(modelId); return next })
            if (status.translationStatus === 'complete') showSuccess(t('bim.translationComplete'))
          }
        } catch { /* silent polling failure */ }
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
          setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, translationStatus: 'translating' } : m)))
          setPollingIds((prev) => new Set(prev).add(model.id))
        } catch { showError(t('bim.translateFailed')) }
      }
    } catch { showError(t('bim.uploadFailed')) }
    finally { setUploading(false) }
  }

  const handleDelete = async () => {
    if (!deleteModel || !projectId) return
    setDeleting(true)
    try {
      await withMinDuration(bimApi.delete(projectId, deleteModel.id))
      setModels((prev) => prev.filter((m) => m.id !== deleteModel.id))
      if (selectedModel?.id === deleteModel.id) setSelectedModel(null)
      showSuccess(t('bim.deleteSuccess'))
    } catch { showError(t('bim.deleteFailed')) }
    finally { setDeleting(false) }
    setDeleteModel(null)
  }

  const canView = (model: BimModel) => isIfc(model.filename) || model.translationStatus === 'complete'

  const handleModelClick = (model: BimModel) => {
    if (canView(model)) {
      setSelectedModel(selectedModel?.id === model.id ? null : model)
      setSelectedBimObjectIds([])
    }
  }

  const handleEntityClick = useCallback((bimObjectId: string | undefined, multiSelect?: boolean) => {
    if (!bimObjectId) { setSelectedBimObjectIds([]); return }
    setSelectedBimObjectIds((prev) => {
      if (multiSelect) {
        return prev.includes(bimObjectId) ? prev.filter((id) => id !== bimObjectId) : [...prev, bimObjectId]
      }
      return [bimObjectId]
    })
  }, [])

  const handleTranslate = useCallback((model: BimModel) => {
    setModels((prev) => prev.map((m) => (m.id === model.id ? { ...m, translationStatus: 'translating' } : m)))
    setPollingIds((prev) => new Set(prev).add(model.id))
  }, [])

  const getViewerToken = useCallback(async (): Promise<string> => {
    if (!projectId || !selectedModel) return ''
    const data = await bimApi.getViewerToken(projectId, selectedModel.id)
    return data.accessToken
  }, [projectId, selectedModel])

  const otherModels = selectedModel ? models.filter((m) => m.id !== selectedModel.id) : models

  if (loading) return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
      <Skeleton variant="rounded" height={240} sx={{ borderRadius: 3, mb: 2 }} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: 2 }} />)}
      </Box>
    </Box>
  )

  return (
    <Box sx={{ maxWidth: '100%', overflow: 'hidden', pb: 3 }}>
      <input ref={fileInputRef} type="file" accept=".rvt,.ifc,.nwd,.nwc,.dwg" style={{ display: 'none' }} onChange={handleUpload} />

      <Box sx={{ position: 'sticky', top: 0, zIndex: 20, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider', px: { xs: 1.5, sm: 2, md: 3 }, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={() => navigate(-1)}><ArrowBackIcon /></IconButton>
          <Typography variant="h6" fontWeight={700}>{t('bim.modelTitle', 'BIM Model')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {isMobile && selectedModel && (
            <IconButton size="small" onClick={() => setSidebarOpen(true)} color="primary"><ViewColumnIcon /></IconButton>
          )}
          <IconButton size="small" onClick={() => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen() }}><FullscreenIcon /></IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: selectedModel ? 'row' : 'column' }, gap: { md: 2 }, px: { xs: 1.5, sm: 2, md: 3 }, pt: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {selectedModel && (
            <BimViewerPanel model={selectedModel} projectId={projectId!} selectedBimObjectIds={selectedBimObjectIds} isolationMode={isolationMode} onElementClick={handleEntityClick} onImport={setImportModel} onDelete={setDeleteModel} getViewerToken={getViewerToken} />
          )}

          {models.length === 0 ? (
            <EmptyState icon={<DescriptionIcon sx={{ color: 'text.secondary' }} />} title={t('bim.noModels')} description={t('bim.noModelsDescription')} action={{ label: t('bim.upload'), onClick: () => fileInputRef.current?.click() }} />
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" fontWeight={700}>
                  {selectedModel ? t('bim.additionalModels', 'Additional Models') : `${models.length} ${t('bim.title')}`}
                </Typography>
                {selectedModel && otherModels.length > 3 && (
                  <Typography variant="caption" color="primary.main" fontWeight={600} sx={{ cursor: 'pointer' }} onClick={() => setSelectedModel(null)}>
                    {t('bim.viewAll', 'View All')}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {(selectedModel ? otherModels : models).map((model) => (
                  <BimModelCard key={model.id} model={model} projectId={projectId!} isSelected={selectedModel?.id === model.id} onModelClick={handleModelClick} onDelete={setDeleteModel} onImport={setImportModel} onTranslate={handleTranslate} />
                ))}
              </Box>
            </>
          )}

          <BimUploadButton uploading={uploading} onClick={() => fileInputRef.current?.click()} />
        </Box>

        {!isMobile && selectedModel && (
          <Box sx={{ width: 360, flexShrink: 0, height: 'calc(100vh - 120px)', position: 'sticky', top: 80 }}>
            <BimDataSidebar projectId={projectId!} modelId={selectedModel.id} selectedBimObjectIds={selectedBimObjectIds} isolationMode={isolationMode} onEntityClick={handleEntityClick} onIsolationModeChange={setIsolationMode} />
          </Box>
        )}
      </Box>

      {isMobile && (
        <Drawer anchor="right" open={sidebarOpen} onClose={() => setSidebarOpen(false)} sx={{ '& .MuiDrawer-paper': { width: '85vw', maxWidth: 400 } }}>
          <Box sx={{ height: '100%' }}>
            <BimDataSidebar projectId={projectId!} modelId={selectedModel?.id} selectedBimObjectIds={selectedBimObjectIds} isolationMode={isolationMode} onEntityClick={handleEntityClick} onIsolationModeChange={setIsolationMode} />
          </Box>
        </Drawer>
      )}

      {importModel && <BimImportWizard open={!!importModel} onClose={() => setImportModel(null)} projectId={projectId!} model={importModel} />}

      <ConfirmModal open={!!deleteModel} onClose={() => setDeleteModel(null)} onConfirm={handleDelete} title={t('bim.deleteConfirmation')} message={t('bim.deleteConfirmationMessage', { name: deleteModel?.filename })} variant="danger" loading={deleting} />
    </Box>
  )
}
