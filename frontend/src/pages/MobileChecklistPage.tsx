import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { Modal } from '../components/ui/Modal'
import { ChecklistSection } from '../components/checklist/ChecklistSection'
import { PhotoCapture } from '../components/checklist/PhotoCapture'
import { SignaturePad } from '../components/checklist/SignaturePad'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import { useChecklistInstance } from '../hooks/useChecklistInstance'
import { checklistsApi } from '../api/checklists'
import { inspectionsApi } from '../api/inspections'
import type {
  ChecklistItemTemplate,
  ChecklistItemResponse,
  ChecklistItemResponseCreate,
  ChecklistItemResponseUpdate,
  ChecklistTemplate,
} from '../types'
import { CheckCircleIcon, AssignmentIcon, ArrowBackIcon, SendIcon } from '@/icons'
import { Box, Typography, LinearProgress, Skeleton, Alert, Snackbar, FormControlLabel, Radio, RadioGroup, styled } from '@/mui'

const MobileContainer = styled(Box)(({ theme }) => ({
  minHeight: '100dvh',
  backgroundColor: theme.palette.background.default,
  paddingBottom: theme.spacing(10),
}))

const Header = styled(Box)(({ theme }) => ({
  position: 'sticky',
  top: 0,
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  zIndex: 10,
  boxShadow: theme.shadows[2],
}))

const Content = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}))

const BottomBar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2),
  boxShadow: theme.shadows[8],
  zIndex: 10,
}))

const ProgressContainer = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: 12,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  border: `1px solid ${theme.palette.divider}`,
}))

export default function MobileChecklistPage() {
  const { projectId, inspectionId, instanceId: routeInstanceId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const isDirectInstance = !!routeInstanceId
  const backPath = isDirectInstance ? `/projects/${projectId}/checklists` : `/projects/${projectId}/inspections`
  const [checklistInstanceId, setChecklistInstanceId] = useState<string | undefined>(routeInstanceId)
  const [template, setTemplate] = useState<ChecklistTemplate | null>(null)
  const { instance, loading, error, createResponse, updateResponse, uploadFile, refetch } =
    useChecklistInstance(projectId, checklistInstanceId)

  const [selectedItem, setSelectedItem] = useState<ChecklistItemTemplate | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  const [itemStatus, setItemStatus] = useState<string>('pending')
  const [itemNotes, setItemNotes] = useState('')
  const [itemPhotos, setItemPhotos] = useState<File[]>([])
  const [itemPhotoUrls, setItemPhotoUrls] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const [signature, setSignature] = useState<string | null>(null)

  useEffect(() => {
    if (user?.signatureUrl) {
      authApi.getSignatureImage().then(setSignature).catch(() => {})
    }
  }, [user?.signatureUrl])

  useEffect(() => {
    const loadChecklistInstance = async () => {
      if (!projectId) return

      if (routeInstanceId) {
        try {
          const inst = await checklistsApi.getInstance(projectId, routeInstanceId)
          setChecklistInstanceId(routeInstanceId)
          const tpl = await checklistsApi.getTemplate(projectId, inst.template_id)
          setTemplate(tpl)
        } catch {
          setSnackbar({ open: true, message: t('checklist.failedToLoad'), severity: 'error' })
        }
        return
      }

      if (!inspectionId) return
      try {
        const instances = await checklistsApi.getInstances(projectId)
        const match = instances.find(inst => inst.id === inspectionId)
          || instances.find(inst => inst.unit_identifier === inspectionId)
        if (match) {
          setChecklistInstanceId(match.id)
          const tpl = await checklistsApi.getTemplate(projectId, match.template_id)
          setTemplate(tpl)
        } else {
          setSnackbar({ open: true, message: t('checklist.notFound', 'No checklist found for this inspection'), severity: 'error' })
        }
      } catch {
        setSnackbar({ open: true, message: t('checklist.failedToLoad'), severity: 'error' })
      }
    }

    loadChecklistInstance()
  }, [projectId, inspectionId, routeInstanceId, t])

  const subsections = template?.subsections || []

  const calculateProgress = () => {
    if (!instance?.responses || subsections.length === 0) return { completed: 0, total: 0, percentage: 0 }

    let totalItems = 0
    let completedItems = 0

    subsections.forEach((section) => {
      const items = section.items || []
      totalItems += items.length

      items.forEach((item: ChecklistItemTemplate) => {
        const response = instance.responses.find((r) => r.item_template_id === item.id)
        if (response && (response.status === 'approved' || response.status === 'not_applicable')) {
          completedItems++
        }
      })
    })

    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    return { completed: completedItems, total: totalItems, percentage }
  }

  const progress = calculateProgress()

  const handleInlineStatusChange = async (item: ChecklistItemTemplate, status: string, notes?: string) => {
    if (!instance) return
    try {
      const existingResponse = instance.responses.find((r) => r.item_template_id === item.id)
      if (existingResponse) {
        await updateResponse(existingResponse.id, { status, notes: notes || existingResponse.notes })
      } else {
        await createResponse({ item_template_id: item.id, status, notes })
      }
      setSnackbar({ open: true, message: t('checklist.responseSaved', 'Response saved'), severity: 'success' })
    } catch {
      setSnackbar({ open: true, message: t('checklist.failedToSave'), severity: 'error' })
    }
  }

  const handleItemClick = (item: ChecklistItemTemplate) => {
    setSelectedItem(item)

    const existingResponse = instance?.responses.find((r) => r.item_template_id === item.id)
    if (existingResponse) {
      setItemStatus(existingResponse.status || 'pending')
      setItemNotes(existingResponse.notes || '')
      setItemPhotoUrls(existingResponse.image_urls || [])
    } else {
      setItemStatus('pending')
      setItemNotes('')
      setItemPhotos([])
      setItemPhotoUrls([])
    }

    setItemModalOpen(true)
  }

  const handleSaveItemResponse = async () => {
    if (!selectedItem || !instance) return

    setUploadingPhotos(true)

    try {
      let uploadedUrls = [...itemPhotoUrls]
      if (itemPhotos.length > 0 && projectId) {
        const uploadPromises = itemPhotos.map((file) => uploadFile(projectId, file))
        const paths = await Promise.all(uploadPromises)
        uploadedUrls = [...uploadedUrls, ...paths]
      }

      const existingResponse = instance.responses.find((r) => r.item_template_id === selectedItem.id)

      if (existingResponse) {
        const updateData: ChecklistItemResponseUpdate = {
          status: itemStatus,
          notes: itemNotes,
          image_urls: uploadedUrls,
        }
        await updateResponse(existingResponse.id, updateData)
      } else {
        const createData: ChecklistItemResponseCreate = {
          item_template_id: selectedItem.id,
          status: itemStatus,
          notes: itemNotes,
          image_urls: uploadedUrls,
        }
        await createResponse(createData)
      }

      setSnackbar({
        open: true,
        message: t('checklist.responseSaved', 'Response saved successfully'),
        severity: 'success',
      })

      setItemModalOpen(false)
      setSelectedItem(null)
      setItemPhotos([])
      setItemPhotoUrls([])
    } catch {
      setSnackbar({
        open: true,
        message: t('checklist.failedToSave'),
        severity: 'error',
      })
    } finally {
      setUploadingPhotos(false)
    }
  }

  const handleSubmitChecklist = async () => {
    if (!instance || !projectId) return
    if (!isDirectInstance && !inspectionId) return

    const incompleteItems: string[] = []

    subsections.forEach((section) => {
      const items = section.items || []
      items.forEach((item: ChecklistItemTemplate) => {
        const response = instance.responses.find((r) => r.item_template_id === item.id)
        if (!response || response.status === 'pending') {
          incompleteItems.push(item.name)
        }

        if (response) {
          if (item.must_image && (!response.image_urls || response.image_urls.length === 0)) {
            incompleteItems.push(`${item.name} (${t('checklist.photoRequired', 'photo required')})`)
          }
          if (item.must_note && !response.notes) {
            incompleteItems.push(`${item.name} (${t('checklist.noteRequired', 'note required')})`)
          }
        }
      })
    })

    const hasSignatureRequirement = subsections.some((section) =>
      section.items?.some((item: ChecklistItemTemplate) => item.must_signature)
    )

    if (hasSignatureRequirement && !signature) {
      setSnackbar({
        open: true,
        message: t('checklist.signatureRequired', 'Signature is required before submission'),
        severity: 'error',
      })
      setSignatureModalOpen(true)
      return
    }

    if (incompleteItems.length > 0) {
      setSnackbar({
        open: true,
        message: t('checklist.completeRequired', 'Please complete all required items'),
        severity: 'error',
      })
      return
    }

    setSubmitting(true)

    try {
      if (isDirectInstance) {
        await checklistsApi.updateInstance(projectId, instance.id, { status: 'completed' })
      } else {
        await inspectionsApi.completeInspection(projectId, inspectionId!)
      }

      setSnackbar({
        open: true,
        message: t('checklist.submitSuccess', 'Checklist submitted successfully'),
        severity: 'success',
      })

      const backPath = isDirectInstance
        ? `/projects/${projectId}/checklists`
        : `/projects/${projectId}/inspections`

      setTimeout(() => {
        navigate(backPath)
      }, 2000)
    } catch {
      setSnackbar({
        open: true,
        message: t('checklist.failedToSubmit'),
        severity: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <MobileContainer>
        <Header>
          <Skeleton variant="text" width={200} height={32} />
          <Skeleton variant="text" width={150} height={24} />
        </Header>
        <Content>
          <Skeleton variant="rounded" height={100} sx={{ mb: 2, borderRadius: 3 }} />
          <Skeleton variant="rounded" height={200} sx={{ mb: 2, borderRadius: 3 }} />
          <Skeleton variant="rounded" height={200} sx={{ mb: 2, borderRadius: 3 }} />
        </Content>
      </MobileContainer>
    )
  }

  if (error) {
    return (
      <MobileContainer>
        <Header>
          <Button
            variant="tertiary"
            icon={<ArrowBackIcon />}
            onClick={() => navigate(backPath)}
          >
            {t('common.back', 'Back')}
          </Button>
        </Header>
        <Content>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="primary" onClick={refetch} fullWidth>
              {t('common.retry', 'Retry')}
            </Button>
          </Box>
        </Content>
      </MobileContainer>
    )
  }

  if (!instance) {
    return (
      <MobileContainer>
        <Header>
          <Button
            variant="tertiary"
            icon={<ArrowBackIcon />}
            onClick={() => navigate(backPath)}
          >
            {t('common.back', 'Back')}
          </Button>
        </Header>
        <Content>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {t('checklist.notFound', 'No checklist found for this inspection')}
          </Alert>
        </Content>
      </MobileContainer>
    )
  }

  return (
    <MobileContainer>
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Button
            variant="tertiary"
            icon={<ArrowBackIcon />}
            onClick={() => navigate(backPath)}
            size="small"
          >
            {t('common.back', 'Back')}
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              {isDirectInstance ? t('checklist.checklist', 'Checklist') : t('checklist.inspectionChecklist', 'Inspection Checklist')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {template?.name || t('checklist.checklist', 'Checklist')}
            </Typography>
          </Box>
        </Box>
      </Header>

      <Content>
        <ProgressContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <AssignmentIcon color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {t('checklist.overallProgress', 'Overall Progress')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('checklist.itemsCompleted', '{{completed}} of {{total}} items completed', { completed: progress.completed, total: progress.total })}
              </Typography>
            </Box>
            <Typography variant="h6" fontWeight={600} color="primary">
              {progress.percentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress.percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                backgroundColor: progress.percentage === 100 ? 'success.main' : 'primary.main',
                borderRadius: 4,
              },
            }}
          />
        </ProgressContainer>

        {subsections.map((section) => (
          <ChecklistSection
            key={section.id}
            section={section}
            responses={instance.responses}
            defaultExpanded={false}
            onStatusChange={handleInlineStatusChange}
            onPhotosChange={(_item, files) => setItemPhotos(files)}
            onSignatureChange={(_item, sig) => setSignature(sig)}
            savingResponse={uploadingPhotos}
          />
        ))}

        {subsections.some((section) =>
          section.items?.some((item: ChecklistItemTemplate) => item.must_signature)
        ) && (
          <Box sx={{ mt: 3 }}>
            <Button
              variant={signature ? 'success' : 'secondary'}
              onClick={() => setSignatureModalOpen(true)}
              fullWidth
              icon={signature ? <CheckCircleIcon /> : undefined}
            >
              {signature ? t('checklist.signatureCaptured', 'Signature Captured') : t('checklist.addSignature', 'Add Signature')}
            </Button>
          </Box>
        )}
      </Content>

      <BottomBar>
        <Button
          variant="primary"
          icon={<SendIcon />}
          onClick={handleSubmitChecklist}
          loading={submitting}
          disabled={progress.percentage < 100}
          fullWidth
          size="large"
        >
          {t('checklist.submitChecklist', 'Submit Checklist')}
        </Button>
        {progress.percentage < 100 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            {t('checklist.completeAllItems', 'Complete all items to submit')}
          </Typography>
        )}
      </BottomBar>

      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={selectedItem?.name || t('checklist.itemResponse', 'Item Response')}
        maxWidth="sm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setItemModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" onClick={handleSaveItemResponse} loading={uploadingPhotos}>
              {t('common.save', 'Save')}
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {selectedItem?.description && (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              {selectedItem.description}
            </Alert>
          )}

          <Box>
            <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
              {t('common.status')} *
            </Typography>
            <RadioGroup value={itemStatus} onChange={(e) => setItemStatus(e.target.value)}>
              <FormControlLabel value="approved" control={<Radio />} label={t('checklist.statusApproved', 'Approved')} />
              <FormControlLabel value="rejected" control={<Radio />} label={t('checklist.statusRejected', 'Rejected')} />
              <FormControlLabel value="not_applicable" control={<Radio />} label={t('checklist.statusNA', 'N/A')} />
            </RadioGroup>
          </Box>

          <Box>
            <TextField
              fullWidth
              label={selectedItem?.must_note ? `${t('common.notes', 'Notes')} *` : t('common.notes', 'Notes')}
              multiline
              rows={3}
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder={t('checklist.notesPlaceholder')}
            />
          </Box>

          {selectedItem?.must_image && (
            <Box>
              <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                {t('checklist.photos', 'Photos')} {selectedItem.must_image && '*'}
              </Typography>
              <PhotoCapture
                maxPhotos={5}
                onPhotosChange={setItemPhotos}
                disabled={uploadingPhotos}
              />
            </Box>
          )}
        </Box>
      </Modal>

      <Modal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        title={t('checklist.inspectorSignature', 'Inspector Signature')}
        maxWidth="sm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setSignatureModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSignatureModalOpen(false)
                setSnackbar({
                  open: true,
                  message: t('checklist.signatureSaved', 'Signature saved'),
                  severity: 'success',
                })
              }}
              disabled={!signature}
            >
              {t('checklist.saveSignature', 'Save Signature')}
            </Button>
          </>
        }
      >
        <Box>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            {t('checklist.signatureInstructions', 'Please sign below to certify that you have completed this inspection checklist')}
          </Alert>
          <SignaturePad
            onSignatureChange={setSignature}
            required={true}
            label={t('checklist.inspectorSignature', 'Inspector Signature')}
          />
        </Box>
      </Modal>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MobileContainer>
  )
}
