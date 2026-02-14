import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { TextField } from '../components/ui/TextField'
import { Modal } from '../components/ui/Modal'
import { ChecklistSection } from '../components/checklist/ChecklistSection'
import { PhotoCapture } from '../components/checklist/PhotoCapture'
import { SignaturePad } from '../components/checklist/SignaturePad'
import { useChecklistInstance } from '../hooks/useChecklistInstance'
import { inspectionsApi } from '../api/inspections'
import type {
  ChecklistItemTemplate,
  ChecklistItemResponse,
  ChecklistItemResponseCreate,
  ChecklistItemResponseUpdate,
} from '../types'
import { CheckCircleIcon, AssignmentIcon, ArrowBackIcon, SendIcon } from '@/icons'
import { Box, Typography, LinearProgress, Skeleton, Alert, Snackbar, FormControlLabel, Radio, RadioGroup, styled } from '@/mui'

const MobileContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  paddingBottom: theme.spacing(10), // Space for fixed bottom bar
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
  const { projectId, inspectionId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [checklistInstanceId, setChecklistInstanceId] = useState<string | undefined>(undefined)
  const { instance, loading, error, createResponse, updateResponse, uploadFile, refetch } =
    useChecklistInstance(checklistInstanceId)

  const [selectedItem, setSelectedItem] = useState<ChecklistItemTemplate | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [signatureModalOpen, setSignatureModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })

  // Item response form state
  const [itemStatus, setItemStatus] = useState<string>('pending')
  const [itemNotes, setItemNotes] = useState('')
  const [itemPhotos, setItemPhotos] = useState<File[]>([])
  const [itemPhotoUrls, setItemPhotoUrls] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // Signature state
  const [signature, setSignature] = useState<string | null>(null)

  // Load checklist instance for the inspection
  useEffect(() => {
    const loadChecklistInstance = async () => {
      if (!projectId || !inspectionId) return

      try {
        // For now, we'll use the inspectionId as the checklistInstanceId
        // In a real implementation, you might need to fetch this from an endpoint
        setChecklistInstanceId(inspectionId)
      } catch (err) {
        console.error('Failed to load checklist instance:', err)
        setSnackbar({
          open: true,
          message: t('checklist.failedToLoad'),
          severity: 'error',
        })
      }
    }

    loadChecklistInstance()
  }, [projectId, inspectionId])

  // Calculate progress
  const calculateProgress = () => {
    if (!instance?.responses) return { completed: 0, total: 0, percentage: 0 }

    const template = instance as any
    const subsections = template?.subsections || []

    let totalItems = 0
    let completedItems = 0

    subsections.forEach((section: any) => {
      const items = section.items || []
      totalItems += items.length

      items.forEach((item: ChecklistItemTemplate) => {
        const response = instance.responses.find((r) => r.item_template_id === item.id)
        if (response && response.status !== 'pending') {
          completedItems++
        }
      })
    })

    const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    return { completed: completedItems, total: totalItems, percentage }
  }

  const progress = calculateProgress()

  // Handle item click
  const handleItemClick = (item: ChecklistItemTemplate) => {
    setSelectedItem(item)

    // Load existing response if available
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

  // Handle save item response
  const handleSaveItemResponse = async () => {
    if (!selectedItem || !instance) return

    setUploadingPhotos(true)

    try {
      // Upload photos first
      let uploadedUrls = [...itemPhotoUrls]
      if (itemPhotos.length > 0 && projectId) {
        const uploadPromises = itemPhotos.map((file) => uploadFile(projectId, file))
        const paths = await Promise.all(uploadPromises)
        uploadedUrls = [...uploadedUrls, ...paths]
      }

      // Check if response already exists
      const existingResponse = instance.responses.find((r) => r.item_template_id === selectedItem.id)

      if (existingResponse) {
        // Update existing response
        const updateData: ChecklistItemResponseUpdate = {
          status: itemStatus,
          notes: itemNotes,
          image_urls: uploadedUrls,
        }
        await updateResponse(existingResponse.id, updateData)
      } else {
        // Create new response
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
        message: 'Response saved successfully',
        severity: 'success',
      })

      // Reset form
      setItemModalOpen(false)
      setSelectedItem(null)
      setItemPhotos([])
      setItemPhotoUrls([])
    } catch (err) {
      console.error('Failed to save response:', err)
      setSnackbar({
        open: true,
        message: t('checklist.failedToSave'),
        severity: 'error',
      })
    } finally {
      setUploadingPhotos(false)
    }
  }

  // Handle submit checklist
  const handleSubmitChecklist = async () => {
    if (!instance || !projectId || !inspectionId) return

    // Validate that all required items are completed
    const template = instance as any
    const subsections = template?.subsections || []
    const incompleteItems: string[] = []

    subsections.forEach((section: any) => {
      const items = section.items || []
      items.forEach((item: ChecklistItemTemplate) => {
        const response = instance.responses.find((r) => r.item_template_id === item.id)
        if (!response || response.status === 'pending') {
          incompleteItems.push(item.name)
        }

        // Check for required fields
        if (response) {
          if (item.must_image && (!response.image_urls || response.image_urls.length === 0)) {
            incompleteItems.push(`${item.name} (photo required)`)
          }
          if (item.must_note && !response.notes) {
            incompleteItems.push(`${item.name} (note required)`)
          }
        }
      })
    })

    // Check for signature requirement
    const hasSignatureRequirement = subsections.some((section: any) =>
      section.items?.some((item: ChecklistItemTemplate) => item.must_signature)
    )

    if (hasSignatureRequirement && !signature) {
      setSnackbar({
        open: true,
        message: 'Signature is required before submission',
        severity: 'error',
      })
      setSignatureModalOpen(true)
      return
    }

    if (incompleteItems.length > 0) {
      setSnackbar({
        open: true,
        message: `Please complete all required items: ${incompleteItems.slice(0, 3).join(', ')}${
          incompleteItems.length > 3 ? '...' : ''
        }`,
        severity: 'error',
      })
      return
    }

    setSubmitting(true)

    try {
      // Complete the inspection
      await inspectionsApi.completeInspection(projectId, inspectionId)

      setSnackbar({
        open: true,
        message: 'Checklist submitted successfully!',
        severity: 'success',
      })

      // Navigate back after a short delay
      setTimeout(() => {
        navigate(`/projects/${projectId}/inspections`)
      }, 2000)
    } catch (err) {
      console.error('Failed to submit checklist:', err)
      setSnackbar({
        open: true,
        message: t('checklist.failedToSubmit'),
        severity: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
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

  // Error state
  if (error) {
    return (
      <MobileContainer>
        <Header>
          <Button
            variant="tertiary"
            icon={<ArrowBackIcon />}
            onClick={() => navigate(`/projects/${projectId}/inspections`)}
          >
            Back
          </Button>
        </Header>
        <Content>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
          <Box sx={{ mt: 2 }}>
            <Button variant="primary" onClick={refetch} fullWidth>
              Retry
            </Button>
          </Box>
        </Content>
      </MobileContainer>
    )
  }

  // No instance state
  if (!instance) {
    return (
      <MobileContainer>
        <Header>
          <Button
            variant="tertiary"
            icon={<ArrowBackIcon />}
            onClick={() => navigate(`/projects/${projectId}/inspections`)}
          >
            Back
          </Button>
        </Header>
        <Content>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            No checklist found for this inspection
          </Alert>
        </Content>
      </MobileContainer>
    )
  }

  const template = instance as any
  const subsections = template?.subsections || []

  return (
    <MobileContainer>
      {/* Header */}
      <Header>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Button
            variant="tertiary"
            icon={<ArrowBackIcon />}
            onClick={() => navigate(`/projects/${projectId}/inspections`)}
            size="small"
          >
            Back
          </Button>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Inspection Checklist
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {template?.name || 'Checklist'}
            </Typography>
          </Box>
        </Box>
      </Header>

      {/* Content */}
      <Content>
        {/* Progress */}
        <ProgressContainer>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <AssignmentIcon color="primary" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                Overall Progress
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress.completed} of {progress.total} items completed
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

        {/* Sections */}
        {subsections.map((section: any) => (
          <ChecklistSection
            key={section.id}
            section={section}
            responses={instance.responses}
            defaultExpanded={false}
            onItemClick={handleItemClick}
          />
        ))}

        {/* Signature Section */}
        {subsections.some((section: any) =>
          section.items?.some((item: ChecklistItemTemplate) => item.must_signature)
        ) && (
          <Box sx={{ mt: 3 }}>
            <Button
              variant={signature ? 'success' : 'secondary'}
              onClick={() => setSignatureModalOpen(true)}
              fullWidth
              icon={signature ? <CheckCircleIcon /> : undefined}
            >
              {signature ? 'Signature Captured' : 'Add Signature'}
            </Button>
          </Box>
        )}
      </Content>

      {/* Bottom Bar */}
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
          Submit Checklist
        </Button>
        {progress.percentage < 100 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
            Complete all items to submit
          </Typography>
        )}
      </BottomBar>

      {/* Item Response Modal */}
      <Modal
        open={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title={selectedItem?.name || 'Item Response'}
        maxWidth="sm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setItemModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveItemResponse} loading={uploadingPhotos}>
              Save
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

          {/* Status Selection */}
          <Box>
            <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
              Status *
            </Typography>
            <RadioGroup value={itemStatus} onChange={(e) => setItemStatus(e.target.value)}>
              <FormControlLabel value="pass" control={<Radio />} label="Pass" />
              <FormControlLabel value="fail" control={<Radio />} label="Fail" />
              <FormControlLabel value="na" control={<Radio />} label="N/A" />
            </RadioGroup>
          </Box>

          {/* Notes */}
          <Box>
            <TextField
              fullWidth
              label={selectedItem?.must_note ? 'Notes *' : 'Notes'}
              multiline
              rows={3}
              value={itemNotes}
              onChange={(e) => setItemNotes(e.target.value)}
              placeholder={t('checklist.notesPlaceholder')}
            />
          </Box>

          {/* Photo Capture */}
          {selectedItem?.must_image && (
            <Box>
              <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
                Photos {selectedItem.must_image && '*'}
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

      {/* Signature Modal */}
      <Modal
        open={signatureModalOpen}
        onClose={() => setSignatureModalOpen(false)}
        title="Inspector Signature"
        maxWidth="sm"
        actions={
          <>
            <Button variant="secondary" onClick={() => setSignatureModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSignatureModalOpen(false)
                setSnackbar({
                  open: true,
                  message: 'Signature saved',
                  severity: 'success',
                })
              }}
              disabled={!signature}
            >
              Save Signature
            </Button>
          </>
        }
      >
        <Box>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Please sign below to certify that you have completed this inspection checklist
          </Alert>
          <SignaturePad
            onSignatureChange={setSignature}
            required={true}
            label="Inspector Signature"
          />
        </Box>
      </Modal>

      {/* Snackbar */}
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
