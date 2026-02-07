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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import EditIcon from '@mui/icons-material/Edit'
import BuildIcon from '@mui/icons-material/Build'
import TuneIcon from '@mui/icons-material/Tune'
import FolderIcon from '@mui/icons-material/Folder'
import { apiClient } from '@/lib/api/client'
import { filesApi, FileRecord } from '@/lib/api/files'
import DocumentList from '@/components/documents/DocumentList'
import DocumentViewerDialog from '@/components/documents/DocumentViewerDialog'
import FileUploadButton from '@/components/documents/FileUploadButton'
import AnalysisResultDialog from '@/components/documents/AnalysisResultDialog'

interface Equipment {
  id: string
  name: string
  equipmentType?: string
  manufacturer: string
  modelNumber: string
  serialNumber?: string
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

export default function EquipmentDetailPage() {
  const t = useTranslations()
  const router = useRouter()
  const params = useParams()!
  const projectId = params.projectId as string
  const equipmentId = params.equipmentId as string

  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewerFile, setViewerFile] = useState<FileRecord | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [analysisFile, setAnalysisFile] = useState<FileRecord | null>(null)
  const [analysisOpen, setAnalysisOpen] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [eqRes, filesRes] = await Promise.allSettled([
        apiClient.get(`/projects/${projectId}/equipment/${equipmentId}`),
        filesApi.list(projectId, 'equipment', equipmentId),
      ])
      if (eqRes.status === 'fulfilled') setEquipment(eqRes.value.data)
      else setError(t('equipment.failedToLoadEquipment'))
      if (filesRes.status === 'fulfilled') setFiles(filesRes.value)
    } catch {
      setError(t('equipment.failedToLoadEquipment'))
    } finally {
      setLoading(false)
    }
  }, [projectId, equipmentId])

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

  if (error || !equipment) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push(`/projects/${projectId}/equipment`)} sx={{ mb: 2 }}>
          {t('equipment.title')}
        </Button>
        <Alert severity="error">{error || 'Equipment not found'}</Alert>
      </Box>
    )
  }

  const specs = equipment.specifications ? Object.entries(equipment.specifications) : []

  return (
    <Box sx={{ p: 3, width: '100%' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => router.push(`/projects/${projectId}/equipment`)}
        sx={{ mb: 2, textTransform: 'none' }}
      >
        {t('equipment.title')}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BuildIcon sx={{ color: '#fff' }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700}>{equipment.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              {equipment.equipmentType && (
                <Chip label={equipment.equipmentType.replace('_', ' ')} size="small" sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
              )}
              <Chip
                label={(equipment.status || 'draft').replace('_', ' ')}
                size="small"
                color={STATUS_CHIP[equipment.status] || 'default'}
                sx={{ textTransform: 'capitalize', fontWeight: 600 }}
              />
            </Box>
          </Box>
        </Box>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => router.push(`/projects/${projectId}/equipment`)}
          sx={{ textTransform: 'none' }}
        >
          {t('common.edit')}
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ borderRadius: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>{t('equipment.details')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <InfoField label={t('equipment.manufacturer')} value={equipment.manufacturer} />
                <InfoField label={t('equipment.modelNumber')} value={equipment.modelNumber} />
                <InfoField label={t('equipment.serialNumber')} value={equipment.serialNumber} />
                <InfoField label={t('common.status')} value={(equipment.status || 'draft').replace('_', ' ')} />
              </Box>
              {equipment.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>{t('common.notes')}</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>{equipment.notes}</Typography>
                </Box>
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
                  entityType="equipment"
                  entityId={equipmentId}
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
