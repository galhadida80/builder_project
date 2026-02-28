import { useEffect, useRef, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router-dom'
import { Canvas, FabricImage } from 'fabric'
import { Box, CircularProgress, Alert } from '@/mui'
import DefectFormModal from '../defects/DefectFormModal'
import { defectsApi, DefectCreateData, DefectAnalysisItem } from '../../api/defects'
import { floorplansApi } from '../../api/floorplans'
import { contactsApi } from '../../api/contacts'
import { areasApi } from '../../api/areas'
import { filesApi } from '../../api/files'
import type { Floorplan } from '@/types/floorplan'
import type { Contact, ConstructionArea } from '../../types'
import type { ValidationError } from '../../utils/validation'
import { validateRequired, validateMinLength, hasErrors } from '../../utils/validation'
import { useToast } from '../common/ToastProvider'

const MAX_PHOTOS = 5

interface FloorplanCanvasProps {
  floorplan: Floorplan
  width?: number
  height?: number
  onPinCreated?: () => void
}

function compressImage(file: File, maxWidth = 1920, quality = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width <= maxWidth && file.size <= 1024 * 1024) { resolve(file); return }
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) { resolve(file); return }
        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
      }, 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export function FloorplanCanvas({ floorplan, width, height, onPinCreated }: FloorplanCanvasProps) {
  const { t, i18n } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [analyzing, setAnalyzing] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [analysisResults, setAnalysisResults] = useState<DefectAnalysisItem[]>([])
  const [selectedDefects, setSelectedDefects] = useState<boolean[]>([])
  const [formErrors, setFormErrors] = useState<ValidationError>({})
  const [form, setForm] = useState<DefectCreateData>({
    description: '',
    category: 'other',
    severity: 'medium',
    assignee_ids: [],
  })
  const [contacts, setContacts] = useState<Contact[]>([])
  const [areas, setAreas] = useState<ConstructionArea[]>([])

  useEffect(() => {
    if (!projectId) return
    Promise.all([
      contactsApi.list(projectId).then(res => setContacts(res)),
      areasApi.list(projectId).then(res => setAreas(res)),
    ]).catch(err => showError(t('common.failedToLoad')))
  }, [projectId, showError, t])

  const validateDefectForm = (data: DefectCreateData): ValidationError => {
    const errors: ValidationError = {}
    errors.description = validateRequired(data.description, t('defects.description')) || validateMinLength(data.description, 2, t('defects.description'))
    errors.category = validateRequired(data.category, t('defects.category'))
    errors.severity = validateRequired(data.severity, t('defects.severity'))
    return errors
  }

  const validateDefectField = (field: string) => {
    const allErrors = validateDefectForm(form)
    setFormErrors(prev => ({ ...prev, [field]: allErrors[field] || null }))
  }

  const addPhotos = useCallback(async (files: File[]) => {
    const remaining = MAX_PHOTOS - pendingPhotos.length
    if (remaining <= 0) return
    const toAdd = files.slice(0, remaining)
    const compressed = await Promise.all(toAdd.map(f => compressImage(f)))
    const previews = compressed.map(f => URL.createObjectURL(f))
    setPendingPhotos(prev => [...prev, ...compressed])
    setPhotoPreviews(prev => [...prev, ...previews])
  }, [pendingPhotos.length])

  const removePhoto = useCallback((index: number) => {
    setPhotoPreviews(prev => { URL.revokeObjectURL(prev[index]); return prev.filter((_, i) => i !== index) })
    setPendingPhotos(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearPhotos = useCallback(() => {
    photoPreviews.forEach(url => URL.revokeObjectURL(url))
    setPendingPhotos([]); setPhotoPreviews([])
  }, [photoPreviews])

  const handleAnalyze = async () => {
    if (!projectId || pendingPhotos.length === 0) return
    setAnalyzing(true)
    try {
      const lang = (i18n.language || 'en').slice(0, 2)
      const result = await defectsApi.analyzeImage(projectId, pendingPhotos[0], lang)
      const defectsResult = result.defects || []
      if (defectsResult.length <= 1) {
        const single = defectsResult[0] || { category: 'other', severity: 'medium', description: '' }
        setForm(prev => ({ ...prev, category: single.category, severity: single.severity, description: single.description }))
        setAnalysisResults([]); setSelectedDefects([])
        showSuccess(t('defects.analyzeSuccess'))
      } else {
        setAnalysisResults(defectsResult); setSelectedDefects(new Array(defectsResult.length).fill(false))
        showSuccess(t('defects.multiDefectDetected', { count: defectsResult.length }))
      }
    } catch (err) {
      showError(t('defects.analyzeFailed'))
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCanvasClick = useCallback((e: any) => {
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
  }, [canvasReady])

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setClickPosition(null)
    setForm({ description: '', category: 'other', severity: 'medium', assignee_ids: [] })
    setFormErrors({})
    clearPhotos()
    setAnalysisResults([])
    setSelectedDefects([])
  }

  const handleSubmitDefect = async () => {
    if (!projectId || !clickPosition) return

    const selectedCount = selectedDefects.filter(Boolean).length
    const isMultiDefect = analysisResults.length > 0 && selectedCount > 0

    if (isMultiDefect) {
      setSubmitting(true)
      try {
        const defectsToCreate = analysisResults.filter((_, idx) => selectedDefects[idx])
        const createdDefectIds: string[] = []

        for (const defectData of defectsToCreate) {
          const defect = await defectsApi.create(projectId, {
            description: defectData.description,
            category: defectData.category,
            severity: defectData.severity,
            assignee_ids: [],
          })
          createdDefectIds.push(defect.id)

          await floorplansApi.createPin(projectId, floorplan.id, {
            entityType: 'defect',
            entityId: defect.id,
            xPosition: clickPosition.x,
            yPosition: clickPosition.y,
          })
        }

        if (pendingPhotos.length > 0) {
          for (const photo of pendingPhotos) {
            for (const defectId of createdDefectIds) {
              await filesApi.upload(projectId, 'defect', defectId, photo)
            }
          }
        }

        showSuccess(t('defects.createMultipleSuccess', { count: createdDefectIds.length }))
        handleCloseDialog()
        onPinCreated?.()
      } catch (err) {
        showError(t('defects.createFailed'))
      } finally {
        setSubmitting(false)
      }
      return
    }

    const errors = validateDefectForm(form)
    if (hasErrors(errors)) {
      setFormErrors(errors)
      return
    }

    setSubmitting(true)
    try {
      const defect = await defectsApi.create(projectId, form)

      if (pendingPhotos.length > 0) {
        setUploadProgress(0)
        for (let i = 0; i < pendingPhotos.length; i++) {
          await filesApi.upload(projectId, 'defect', defect.id, pendingPhotos[i])
          setUploadProgress(((i + 1) / pendingPhotos.length) * 100)
        }
      }

      await floorplansApi.createPin(projectId, floorplan.id, {
        entityType: 'defect',
        entityId: defect.id,
        xPosition: clickPosition.x,
        yPosition: clickPosition.y,
      })

      showSuccess(t('defects.createSuccess'))
      handleCloseDialog()
      onPinCreated?.()
    } catch (err) {
      showError(t('defects.createFailed'))
    } finally {
      setSubmitting(false)
      setUploadProgress(0)
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: height || 600, width: width || '100%' }}>
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

  const selectedCount = selectedDefects.filter(Boolean).length
  const isMultiDefect = analysisResults.length > 0 && selectedCount > 0

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 2 }}>
        <canvas ref={canvasRef} />
      </Box>

      <DefectFormModal
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSubmit={handleSubmitDefect}
        submitting={submitting}
        uploadProgress={uploadProgress}
        form={form}
        setForm={setForm}
        formErrors={formErrors}
        validateField={validateDefectField}
        contacts={contacts}
        areas={areas}
        pendingPhotos={pendingPhotos}
        photoPreviews={photoPreviews}
        addPhotos={addPhotos}
        removePhoto={removePhoto}
        analyzing={analyzing}
        onAnalyze={handleAnalyze}
        analysisResults={analysisResults}
        setAnalysisResults={setAnalysisResults}
        selectedDefects={selectedDefects}
        setSelectedDefects={setSelectedDefects}
        selectedCount={selectedCount}
        isMultiDefect={isMultiDefect}
      />
    </>
  )
}
