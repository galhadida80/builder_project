'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CloseIcon from '@mui/icons-material/Close'
import InventoryIcon from '@mui/icons-material/Inventory'
import TuneIcon from '@mui/icons-material/Tune'
import FolderIcon from '@mui/icons-material/Folder'
import { apiClient } from '@/lib/api/client'
import { filesApi, FileRecord } from '@/lib/api/files'
import DocumentList from '@/components/documents/DocumentList'
import DocumentViewerDialog from '@/components/documents/DocumentViewerDialog'
import FileUploadButton from '@/components/documents/FileUploadButton'
import AnalysisResultDialog from '@/components/documents/AnalysisResultDialog'

interface Material {
  id: string
  name: string
  materialType: string
  manufacturer: string
  modelNumber?: string
  quantity: number
  unit: string
  specifications?: Record<string, string | number | boolean | null>
  status: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

const STATUS_CHIP: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  pending_review: 'warning',
  approved: 'success',
  rejected: 'error',
}

export default function MaterialDetailPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()!
  const projectId = params.projectId as string
  const materialId = params.materialId as string

  const [material, setMaterial] = useState<Material | null>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewerFile, setViewerFile] = useState<FileRecord | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [analysisFile, setAnalysisFile] = useState<FileRecord | null>(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', manufacturer: '', modelNumber: '', quantity: '', unit: '', notes: '' })

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [matRes, filesRes] = await Promise.allSettled([
        apiClient.get(`/projects/${projectId}/materials/${materialId}`),
        filesApi.list(projectId, 'material', materialId),
      ])
      if (matRes.status === 'fulfilled') setMaterial(matRes.value.data)
      else setError(t('materials.failedToLoadMaterials'))
      if (filesRes.status === 'fulfilled') setFiles(filesRes.value)
    } catch {
      setError(t('materials.failedToLoadMaterials'))
    } finally {
      setLoading(false)
    }
  }, [projectId, materialId])

  useEffect(() => { loadData() }, [loadData])

  const handleView = (file: FileRecord) => {
    setViewerFile(file)
    setViewerOpen(true)
  }

  const handleDownload = async (file: FileRecord) => {
    try {
      const url = await filesApi.getDownloadUrl(projectId, file.id)
      window.open(url, '_blank')
    } catch { /* noop */ }
  }

  const handleDelete = async (file: FileRecord) => {
    try {
      await filesApi.delete(projectId, file.id)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch { /* noop */ }
  }

  const handleAnalyze = (file: FileRecord) => {
    setAnalysisFile(file)
    setAnalysisOpen(true)
  }

  const handleUploadComplete = (uploaded: FileRecord) => {
    setFiles((prev) => [uploaded, ...prev])
  }

  const startEditing = () => {
    if (!material) return
    setEditForm({
      name: material.name || '',
      manufacturer: material.manufacturer || '',
      modelNumber: material.modelNumber || '',
      quantity: String(material.quantity || ''),
      unit: material.unit || '',
      notes: material.notes || '',
    })
    setEditing(true)
  }

  const cancelEditing = () => { setEditing(false) }

  const saveEditing = async () => {
    try {
      setSaving(true)
      await apiClient.put(`/projects/${projectId}/materials/${materialId}`, {
        name: editForm.name,
        manufacturer: editForm.manufacturer,
        model_number: editForm.modelNumber || undefined,
        quantity: Number(editForm.quantity) || 0,
        unit: editForm.unit,
        notes: editForm.notes || undefined,
      })
      await loadData()
      setEditing(false)
    } catch {
      setError(t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, width: '100%' }}>
        <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
        <Skeleton variant="text" width={300} height={48} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  if (error || !material) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/projects/${projectId}/materials`)} sx={{ mb: 2 }}>
          {t('materials.title')}
        </Button>
        <Alert severity="error">{error || 'Material not found'}</Alert>
      </Box>
    )
  }

  const specs = material.specifications ? Object.entries(material.specifications) : []

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(`/projects/${projectId}/materials`)}
        sx={{ mb: 2, textTransform: 'none' }}
      >
        {t('materials.title')}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <InventoryIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700}>{material.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              {material.materialType && (
                <Chip label={material.materialType.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
              )}
              <Chip
                label={(material.status || 'draft').replace('_', ' ')}
                size="small"
                color={STATUS_CHIP[material.status] || 'default'}
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              />
            </Box>
          </Box>
        </Box>
        {editing ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />} onClick={saveEditing} disabled={saving} sx={{ textTransform: 'none' }}>
              {t('common.save')}
            </Button>
            <Button variant="outlined" startIcon={<CloseIcon />} onClick={cancelEditing} disabled={saving} sx={{ textTransform: 'none' }}>
              {t('common.cancel')}
            </Button>
          </Box>
        ) : (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={startEditing} sx={{ textTransform: 'none' }}>
            {t('common.edit')}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>{t('common.details')}</Typography>
              {editing ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  <TextField label={t('materials.name')} size="small" fullWidth value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                  <TextField label={t('materials.manufacturer')} size="small" fullWidth value={editForm.manufacturer} onChange={(e) => setEditForm((f) => ({ ...f, manufacturer: e.target.value }))} />
                  <TextField label={t('materials.model')} size="small" fullWidth value={editForm.modelNumber} onChange={(e) => setEditForm((f) => ({ ...f, modelNumber: e.target.value }))} />
                  <TextField label={t('materials.quantity')} size="small" fullWidth type="number" value={editForm.quantity} onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))} />
                  <TextField label={t('materials.unit')} size="small" fullWidth value={editForm.unit} onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} />
                  <TextField label={t('common.notes')} size="small" fullWidth multiline rows={3} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} sx={{ gridColumn: '1 / -1' }} />
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                    <InfoField label={t('materials.manufacturer')} value={material.manufacturer} />
                    <InfoField label={t('materials.model')} value={material.modelNumber} />
                    <InfoField label={t('materials.quantity')} value={material.quantity ? String(material.quantity) : undefined} />
                    <InfoField label={t('materials.unit')} value={material.unit} />
                    <InfoField label={t('materials.type')} value={material.materialType} />
                    <InfoField label={t('common.status')} value={(material.status || 'draft').replace('_', ' ')} />
                  </Box>
                  {material.notes && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('common.notes')}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{material.notes}</Typography>
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {specs.length > 0 && (
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TuneIcon sx={{ fontSize: 20, color: '#6366f1' }} />
                  <Typography variant="subtitle1" fontWeight={700}>{t('equipment.specifications')}</Typography>
                  <Chip label={specs.length} size="small" sx={{ height: 22, bgcolor: '#6366f1', color: '#fff', fontWeight: 700 }} />
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {specs.map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, px: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2" fontWeight={500}>{key}</Typography>
                      <Typography variant="body2" color="text.secondary">{String(value ?? '-')}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>

        <Box>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FolderIcon sx={{ fontSize: 20, color: '#3b82f6' }} />
                  <Typography variant="subtitle1" fontWeight={700}>{t('equipment.documents')}</Typography>
                  <Chip label={files.length} size="small" sx={{ height: 22, bgcolor: '#3b82f6', color: '#fff', fontWeight: 700 }} />
                </Box>
                <FileUploadButton
                  projectId={projectId}
                  entityType="material"
                  entityId={materialId}
                  onUploadComplete={handleUploadComplete}
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              <DocumentList
                files={files}
                onView={handleView}
                onDownload={handleDownload}
                onDelete={handleDelete}
                onAnalyze={handleAnalyze}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      <DocumentViewerDialog
        open={viewerOpen}
        file={viewerFile}
        projectId={projectId}
        onClose={() => { setViewerOpen(false); setViewerFile(null) }}
      />

      <AnalysisResultDialog
        open={analysisOpen}
        file={analysisFile}
        projectId={projectId}
        onClose={() => { setAnalysisOpen(false); setAnalysisFile(null) }}
      />
    </Box>
  )
}

function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      <Typography variant="body2" sx={{ mt: 0.3, textTransform: 'capitalize' }}>{value || '-'}</Typography>
    </Box>
  )
}
