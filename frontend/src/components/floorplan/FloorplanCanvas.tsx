import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Canvas, FabricImage } from 'fabric'
import { Box, CircularProgress, Alert } from '@/mui'
import DefectFormModal from '../defects/DefectFormModal'
import { contactsApi } from '../../api/contacts'
import { areasApi } from '../../api/areas'
import type { Floorplan } from '@/types/floorplan'
import type { Contact, ConstructionArea } from '../../types'
import { useToast } from '../common/ToastProvider'
import { useDefectForm } from '../../hooks/useDefectForm'

interface FloorplanCanvasProps {
  floorplan: Floorplan
  width?: number
  height?: number
  onPinCreated?: () => void
}

export function FloorplanCanvas({ floorplan, width, height, onPinCreated }: FloorplanCanvasProps) {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [areas, setAreas] = useState<ConstructionArea[]>([])

  const defectForm = useDefectForm({
    projectId,
    floorplanId: floorplan.id,
    onSuccess: () => {
      handleCloseDialog()
      onPinCreated?.()
    },
  })

  useEffect(() => {
    if (!projectId) return
    Promise.all([
      contactsApi.list(projectId).then((res) => setContacts(res)),
      areasApi.list(projectId).then((res) => setAreas(res)),
    ]).catch((err) => showError(t('common.failedToLoad')))
  }, [projectId, showError, t])

  const handleCanvasClick = useCallback(
    (e: any) => {
      if (!fabricRef.current || !canvasReady) return
      const canvas = fabricRef.current
      const pointer = canvas.getPointer(e.e)
      const bgImg = canvas.backgroundImage as FabricImage | null
      if (!bgImg) return

      const imgLeft = bgImg.left || 0
      const imgTop = bgImg.top || 0
      const imgWidth = (bgImg.width || 0) * (bgImg.scaleX || 1)
      const imgHeight = (bgImg.height || 0) * (bgImg.scaleY || 1)

      if (
        pointer.x < imgLeft ||
        pointer.x > imgLeft + imgWidth ||
        pointer.y < imgTop ||
        pointer.y > imgTop + imgHeight
      ) {
        return
      }

      const normalizedX = (pointer.x - imgLeft) / imgWidth
      const normalizedY = (pointer.y - imgTop) / imgHeight

      setClickPosition({ x: normalizedX, y: normalizedY })
      setDialogOpen(true)
    },
    [canvasReady]
  )

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setClickPosition(null)
    defectForm.resetForm()
  }

  const handleSubmitDefect = async () => {
    if (!clickPosition) return
    const success = await defectForm.handleSubmit(clickPosition)
    if (success) {
      handleCloseDialog()
    }
  }

  useEffect(() => {
    if (!canvasRef.current) return
    if (!floorplan.file?.fileUrl) {
      setError(t('floorplans.noImageUrl', 'No floorplan image available'))
      setLoading(false)
      return
    }

    const canvasWidth = width || (window.innerWidth > 600 ? 800 : window.innerWidth - 32)
    const canvasHeight = height || (window.innerHeight > 700 ? 600 : window.innerHeight - 200)

    const canvas = new Canvas(canvasRef.current, {
      width: canvasWidth,
      height: canvasHeight,
      backgroundColor: '#f5f5f5',
      selection: false,
    })
    fabricRef.current = canvas

    canvas.on('mouse:down', handleCanvasClick)

    FabricImage.fromURL(floorplan.file.fileUrl, { crossOrigin: 'anonymous' })
      .then((img) => {
        if (!canvas) return

        const canvasW = canvas.width!
        const canvasH = canvas.height!
        const scale = Math.min(canvasW / img.width!, canvasH / img.height!)

        img.scale(scale)
        img.set({
          left: (canvasW - img.width! * scale) / 2,
          top: (canvasH - img.height! * scale) / 2,
          selectable: false,
          evented: false,
        })

        canvas.backgroundImage = img
        canvas.renderAll()
        setCanvasReady(true)
        setLoading(false)
      })
      .catch((err) => {
        setError(t('floorplans.imageLoadError', 'Failed to load floorplan image'))
        setLoading(false)
      })

    return () => {
      canvas.off('mouse:down', handleCanvasClick)
      canvas.dispose()
      fabricRef.current = null
      setCanvasReady(false)
      setLoading(true)
      setError(null)
    }
  }, [floorplan, width, height, t, handleCanvasClick])

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: height || 600,
          width: width || '100%',
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  const selectedCount = defectForm.selectedDefects.filter(Boolean).length
  const isMultiDefect = defectForm.analysisResults.length > 0 && selectedCount > 0

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2 }}>
        <canvas ref={canvasRef} />
      </Box>

      <DefectFormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitDefect}
        submitting={defectForm.submitting}
        uploadProgress={defectForm.uploadProgress}
        form={defectForm.form}
        setForm={defectForm.setForm}
        formErrors={defectForm.formErrors}
        validateField={defectForm.validateDefectField}
        contacts={contacts}
        areas={areas}
        pendingPhotos={defectForm.pendingPhotos}
        photoPreviews={defectForm.photoPreviews}
        addPhotos={defectForm.addPhotos}
        removePhoto={defectForm.removePhoto}
        analyzing={defectForm.analyzing}
        onAnalyze={defectForm.handleAnalyze}
        analysisResults={defectForm.analysisResults}
        setAnalysisResults={defectForm.setAnalysisResults}
        selectedDefects={defectForm.selectedDefects}
        setSelectedDefects={defectForm.setSelectedDefects}
        selectedCount={selectedCount}
        isMultiDefect={isMultiDefect}
      />
    </>
  )
}
