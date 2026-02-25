import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import {
  Box, Typography, Paper, CircularProgress, Chip, IconButton,
  Skeleton, alpha, styled,
} from '@/mui'
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'
import {
  CloudUploadIcon, DeleteIcon, RefreshIcon, ExpandMoreIcon,
  ArchitectureIcon, DownloadIcon,
} from '@/icons'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmModal } from '../components/ui/Modal'
import { useToast } from '../components/common/ToastProvider'
import { blueprintsApi } from '../api/blueprints'
import type { BlueprintExtractionListItem, BlueprintExtractionDetail } from '../api/blueprints'
import BlueprintImportWizard from '../components/blueprints/BlueprintImportWizard'
import { bimApi } from '../api/bim'

const ForgeViewer = lazy(() => import('../components/bim/ForgeViewer'))
const IFCViewer = lazy(() => import('../components/bim/IFCViewer'))

const MAX_FILE_SIZE = 100 * 1024 * 1024

const ACCEPTED_EXTENSIONS = {
  'application/pdf': ['.pdf'],
  'application/octet-stream': ['.ifc', '.rvt', '.nwd', '.nwc', '.dwg'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
}

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending: 'default',
  processing: 'warning',
  completed: 'success',
  failed: 'error',
}

const StyledDropzone = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'isDragActive',
})<{ isDragActive?: boolean }>(({ theme, isDragActive }) => ({
  border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
  borderRadius: 12,
  padding: theme.spacing(3),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragActive
    ? alpha(theme.palette.primary.main, 0.08)
    : theme.palette.background.paper,
  transition: 'all 200ms ease-out',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
}))

export default function BlueprintsPage() {
  const { projectId } = useParams()
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()

  const [extractions, setExtractions] = useState<BlueprintExtractionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedDetail, setSelectedDetail] = useState<BlueprintExtractionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<BlueprintExtractionListItem | null>(null)
  const [importTarget, setImportTarget] = useState<BlueprintExtractionDetail | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [viewerBimModel, setViewerBimModel] = useState<{ urn?: string; filename?: string } | null>(null)

  const loadExtractions = useCallback(async () => {
    if (!projectId) return
    try {
      const data = await blueprintsApi.list(projectId)
      setExtractions(data)
    } catch {
      showError(t('blueprints.extractionFailed'))
    } finally {
      setLoading(false)
    }
  }, [projectId, t, showError])

  useEffect(() => {
    loadExtractions()
  }, [loadExtractions])

  const handleUpload = useCallback(async (files: File[]) => {
    if (!projectId || files.length === 0) return
    const file = files[0]
    if (file.size > MAX_FILE_SIZE) {
      showError(t('blueprints.maxSize'))
      return
    }

    setUploading(true)
    try {
      const result = await blueprintsApi.upload(projectId, file)
      showSuccess(t('blueprints.uploadSuccess'))

      if (result.status === 'completed') {
        await loadExtractions()
        const detail = await blueprintsApi.get(projectId, result.id)
        setSelectedDetail(detail)
      } else if (result.status === 'processing') {
        await loadExtractions()
      } else {
        await loadExtractions()
      }
    } catch {
      showError(t('blueprints.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }, [projectId, t, showError, showSuccess, loadExtractions])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: ACCEPTED_EXTENSIONS,
    maxFiles: 1,
    disabled: uploading,
  })

  const handleViewDetail = async (ext: BlueprintExtractionListItem) => {
    if (!projectId) return
    setDetailLoading(true)
    try {
      const detail = await blueprintsApi.get(projectId, ext.id)
      setSelectedDetail(detail)
      setShowViewer(false)
    } catch {
      showError(t('blueprints.extractionFailed'))
    } finally {
      setDetailLoading(false)
    }
  }

  const handleReExtract = async () => {
    if (!projectId || !selectedDetail) return
    try {
      const detail = await blueprintsApi.reExtract(projectId, selectedDetail.id)
      setSelectedDetail(detail)
      showSuccess(t('blueprints.reExtractSuccess'))
      loadExtractions()
    } catch {
      showError(t('blueprints.extractionFailed'))
    }
  }

  const handleDelete = async () => {
    if (!projectId || !deleteTarget) return
    try {
      await blueprintsApi.delete(projectId, deleteTarget.id)
      showSuccess(t('blueprints.deleteSuccess'))
      if (selectedDetail?.id === deleteTarget.id) {
        setSelectedDetail(null)
      }
      setDeleteTarget(null)
      loadExtractions()
    } catch {
      showError(t('blueprints.deleteFailed'))
    }
  }

  const handleOpenImport = () => {
    if (selectedDetail) setImportTarget(selectedDetail)
  }

  const handleToggleViewer = async () => {
    if (showViewer) {
      setShowViewer(false)
      return
    }
    if (!projectId || !selectedDetail?.bimModelId) return
    try {
      const model = await bimApi.get(projectId, selectedDetail.bimModelId)
      setViewerBimModel({ urn: model.urn, filename: model.filename })
      setShowViewer(true)
    } catch {
      showError(t('bim.viewerLoadError'))
    }
  }

  const getViewerToken = async (): Promise<string> => {
    if (!projectId || !selectedDetail?.bimModelId) return ''
    const res = await bimApi.getViewerToken(projectId, selectedDetail.bimModelId)
    return res.accessToken
  }

  const isPdf = (source: string) => source === 'pdf_quantity'
  const isIfc = (source: string) => source === 'bim_ifc'

  const renderUploadZone = () => (
    <StyledDropzone {...getRootProps()} isDragActive={isDragActive}>
      <input {...getInputProps()} />
      {uploading ? (
        <Box sx={{ py: 2 }}>
          <CircularProgress size={36} />
          <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">
            {t('blueprints.processing')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ py: 1 }}>
          <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
          <Typography variant="body1" fontWeight={600}>{t('blueprints.upload')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('blueprints.dropHere')}</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            {t('blueprints.acceptedFormats')} &bull; {t('blueprints.maxSize')}
          </Typography>
        </Box>
      )}
    </StyledDropzone>
  )

  const renderExtractionCard = (ext: BlueprintExtractionListItem) => (
    <Card
      key={ext.id}
      sx={{
        p: { xs: 1.5, sm: 2 },
        cursor: 'pointer',
        border: selectedDetail?.id === ext.id ? 2 : 1,
        borderColor: selectedDetail?.id === ext.id ? 'primary.main' : 'divider',
        '&:hover': { borderColor: 'primary.light' },
        transition: 'border-color 200ms',
      }}
      onClick={() => handleViewDetail(ext)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap>
            {ext.filename || 'Unknown'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={t(`blueprints.source.${ext.extractionSource}`)}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
            <Chip
              label={t(`blueprints.status.${ext.status}`)}
              size="small"
              color={STATUS_COLORS[ext.status] || 'default'}
              sx={{ fontSize: '0.7rem' }}
            />
            {ext.version > 1 && (
              <Chip label={`v${ext.version}`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
            )}
          </Box>
          {ext.summary && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {Object.entries(ext.summary).slice(0, 3).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' | ')}
            </Typography>
          )}
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.25, display: 'block' }}>
            {new Date(ext.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
        <IconButton
          size="small"
          color="error"
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(ext) }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Card>
  )

  const renderDetail = () => {
    if (!selectedDetail) return null
    const data = selectedDetail.extractedData || {}
    const floors = data.floors || []
    const areas = data.areas || []
    const equipment = data.equipment || []
    const materials = data.materials || []
    const hasBimData = areas.length > 0 || equipment.length > 0 || materials.length > 0
    const canView3d = !isPdf(selectedDetail.extractionSource) && selectedDetail.bimModelId

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6">{selectedDetail.filename}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canView3d && (
              <Button size="small" variant="secondary" onClick={handleToggleViewer}>
                {t('blueprints.view3d')}
              </Button>
            )}
            <Button size="small" variant="secondary" startIcon={<RefreshIcon />} onClick={handleReExtract}>
              {t('blueprints.reExtract')}
            </Button>
            {selectedDetail.status === 'completed' && (
              <Button size="small" variant="primary" startIcon={<DownloadIcon />} onClick={handleOpenImport}>
                {t('blueprints.import.title')}
              </Button>
            )}
          </Box>
        </Box>

        {selectedDetail.errorMessage && (
          <Typography color="error" variant="body2">{selectedDetail.errorMessage}</Typography>
        )}

        {selectedDetail.summary && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5 }}>
            {Object.entries(selectedDetail.summary).map(([key, val]) => (
              <Paper key={key} sx={{ p: 1.5, textAlign: 'center', borderRadius: 2 }} elevation={0} variant="outlined">
                <Typography variant="h6">{val as number}</Typography>
                <Typography variant="caption" color="text.secondary">{key.replace(/_/g, ' ')}</Typography>
              </Paper>
            ))}
          </Box>
        )}

        {showViewer && canView3d && selectedDetail.bimModelId && viewerBimModel && (
          <Paper sx={{ height: 400, overflow: 'hidden', borderRadius: 2 }} variant="outlined">
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}>
              {isIfc(selectedDetail.extractionSource) ? (
                <IFCViewer projectId={projectId!} modelId={selectedDetail.bimModelId} filename={viewerBimModel.filename || ''} />
              ) : viewerBimModel.urn ? (
                <ForgeViewer urn={viewerBimModel.urn} getToken={getViewerToken} />
              ) : null}
            </Suspense>
          </Paper>
        )}

        {floors.length > 0 && floors.map((floor, idx) => (
          <Accordion key={idx} defaultExpanded={idx === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography fontWeight={600}>
                  {floor.floorName || `Floor ${floor.floorNumber}`}
                </Typography>
                <Chip label={`${floor.rooms?.length || 0} ${t('blueprints.import.rooms')}`} size="small" />
                {floor.totalAreaSqm && (
                  <Chip label={`${floor.totalAreaSqm} m²`} size="small" variant="outlined" />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                {(floor.rooms || []).map((room, rIdx) => (
                  <Paper key={rIdx} sx={{ p: 1.5, borderRadius: 2 }} variant="outlined">
                    <Typography variant="subtitle2">{room.name}</Typography>
                    {room.roomType && (
                      <Typography variant="caption" color="text.secondary">{room.roomType}</Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                      {room.areaSqm && <Chip label={`${room.areaSqm} m²`} size="small" variant="outlined" />}
                      {room.doors?.length > 0 && <Chip label={`${room.doors.reduce((s, d) => s + (d.quantity || 1), 0)} doors`} size="small" />}
                      {room.windows?.length > 0 && <Chip label={`${room.windows.reduce((s, w) => s + (w.quantity || 1), 0)} windows`} size="small" />}
                    </Box>
                    {room.finishes && (
                      <Box sx={{ mt: 0.5 }}>
                        {room.finishes.floorMaterial && <Typography variant="caption" display="block">{t('quantityExtraction.floorMaterial')}: {room.finishes.floorMaterial}</Typography>}
                        {room.finishes.wallMaterial && <Typography variant="caption" display="block">{t('quantityExtraction.wallMaterial')}: {room.finishes.wallMaterial}</Typography>}
                      </Box>
                    )}
                  </Paper>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}

        {hasBimData && (
          <>
            {areas.length > 0 && (
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={600}>{t('blueprints.import.areas')} ({areas.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 1 }}>
                    {areas.map(a => (
                      <Paper key={a.bimObjectId} sx={{ p: 1, borderRadius: 1 }} variant="outlined">
                        <Typography variant="subtitle2">{a.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{a.areaType || '-'}</Typography>
                      </Paper>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
            {equipment.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={600}>{t('blueprints.import.equipment')} ({equipment.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1 }}>
                    {equipment.map(e => (
                      <Paper key={e.bimObjectId} sx={{ p: 1, borderRadius: 1 }} variant="outlined">
                        <Typography variant="subtitle2">{e.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{e.equipmentType || '-'} {e.manufacturer ? `| ${e.manufacturer}` : ''}</Typography>
                      </Paper>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
            {materials.length > 0 && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography fontWeight={600}>{t('blueprints.import.materials')} ({materials.length})</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1 }}>
                    {materials.map(m => (
                      <Paper key={m.bimObjectId} sx={{ p: 1, borderRadius: 1 }} variant="outlined">
                        <Typography variant="subtitle2">{m.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{m.materialType || '-'} {m.manufacturer ? `| ${m.manufacturer}` : ''}</Typography>
                      </Paper>
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>
            )}
          </>
        )}

        {selectedDetail.processingTimeMs && (
          <Typography variant="caption" color="text.disabled">
            {t('blueprints.processingTime')}: {(selectedDetail.processingTimeMs / 1000).toFixed(1)} {t('blueprints.seconds')}
          </Typography>
        )}
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <PageHeader title={t('blueprints.title')} subtitle={t('blueprints.subtitle')} />

      {renderUploadZone()}

      <Box sx={{ mt: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: selectedDetail ? '320px 1fr' : '1fr' }, gap: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {extractions.length === 0 ? (
            <EmptyState
              icon={<ArchitectureIcon sx={{ fontSize: 48 }} />}
              title={t('blueprints.noExtractions')}
              description={t('blueprints.noExtractionsDescription')}
            />
          ) : (
            extractions.map(renderExtractionCard)
          )}
        </Box>

        {selectedDetail && !detailLoading && (
          <Paper sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2 }} variant="outlined">
            {renderDetail()}
          </Paper>
        )}

        {detailLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <CircularProgress />
          </Box>
        )}
      </Box>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t('blueprints.deleteConfirmation')}
        message={t('blueprints.deleteConfirmationMessage', { name: deleteTarget?.filename })}
      />

      {importTarget && (
        <BlueprintImportWizard
          open={!!importTarget}
          onClose={() => setImportTarget(null)}
          projectId={projectId!}
          extraction={importTarget}
        />
      )}
    </Box>
  )
}
