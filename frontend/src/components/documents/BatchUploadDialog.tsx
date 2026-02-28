import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FileDropzone } from './FileDropzone'
import { Button } from '../ui/Button'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  MenuItem,
  TextField as MuiTextField,
  Alert,
  IconButton,
  Divider,
} from '@/mui'
import { CloseIcon } from '@/icons'

// Entity types allowed for batch upload
const ENTITY_TYPES = [
  'project',
  'area',
  'blueprint',
  'equipment',
  'material',
  'inspection',
  'meeting',
  'rfi',
] as const

interface BatchUploadDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  onUploadComplete?: () => void
}

// Zod validation schema
const batchUploadSchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  entityId: z.string().min(1, 'Required'),
})

type BatchUploadFormData = z.infer<typeof batchUploadSchema>

export function BatchUploadDialog({
  open,
  onClose,
  projectId,
  onUploadComplete,
}: BatchUploadDialogProps) {
  const { t } = useTranslation()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [areas, setAreas] = useState<Array<{ id: string; name: string; floorNumber?: number }>>([])

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BatchUploadFormData>({
    resolver: zodResolver(batchUploadSchema),
    defaultValues: {
      entityType: 'project',
      entityId: projectId,
    },
  })

  const entityType = watch('entityType')

  // Load areas when entity type is 'area'
  useEffect(() => {
    if (entityType === 'area' && open) {
      // TODO: Fetch areas from API
      // For now, just reset to project
      setAreas([])
    }
  }, [entityType, open])

  // Reset entity ID when entity type changes
  useEffect(() => {
    if (entityType === 'project') {
      setValue('entityId', projectId)
    } else if (entityType === 'area' && areas.length > 0) {
      setValue('entityId', areas[0].id)
    } else {
      setValue('entityId', projectId) // Default to project
    }
  }, [entityType, projectId, areas, setValue])

  const handleClose = () => {
    setFiles([])
    setError(null)
    setUploading(false)
    reset()
    onClose()
  }

  const onSubmit = async (data: BatchUploadFormData) => {
    if (files.length === 0) {
      setError(t('batchUpload.noFilesSelected'))
      return
    }

    setUploading(true)
    setError(null)

    try {
      // TODO: Implement actual upload via API
      // const formData = new FormData()
      // files.forEach((file) => formData.append('files', file))
      // formData.append('entity_type', data.entityType)
      // formData.append('entity_id', data.entityId)
      //
      // await filesApi.batchUpload(projectId, formData)

      // Simulate upload for now
      await new Promise((resolve) => setTimeout(resolve, 2000))

      onUploadComplete?.()
      handleClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || t('batchUpload.uploadFailed'))
    } finally {
      setUploading(false)
    }
  }

  const entityTypeOptions = ENTITY_TYPES.map((type) => ({
    value: type,
    label: t(`batchUpload.entityTypes.${type}`, type),
  }))

  return (
    <Dialog open={open} onClose={uploading ? undefined : handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          {t('batchUpload.dialogTitle')}
        </Typography>
        <IconButton onClick={handleClose} disabled={uploading} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Metadata Form */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {t('batchUpload.documentMetadata')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('batchUpload.metadataDescription')}
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Entity Type (Category) */}
              <Controller
                name="entityType"
                control={control}
                render={({ field, fieldState }) => (
                  <MuiTextField
                    {...field}
                    select
                    fullWidth
                    size="small"
                    label={t('batchUpload.category')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={uploading}
                  >
                    {entityTypeOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </MuiTextField>
                )}
              />

              {/* Area Selector (Building/Floor) */}
              {entityType === 'area' && areas.length > 0 && (
                <Controller
                  name="entityId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <MuiTextField
                      {...field}
                      select
                      fullWidth
                      size="small"
                      label={t('batchUpload.selectArea')}
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disabled={uploading}
                    >
                      {areas.map((area) => (
                        <MenuItem key={area.id} value={area.id}>
                          {area.name}
                          {area.floorNumber !== undefined && ` - ${t('batchUpload.floor')} ${area.floorNumber}`}
                        </MenuItem>
                      ))}
                    </MuiTextField>
                  )}
                />
              )}

              {entityType === 'area' && areas.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {t('batchUpload.noAreasAvailable')}
                </Alert>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* File Upload Section */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              {t('batchUpload.selectFiles')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('batchUpload.selectFilesDescription')}
            </Typography>

            <FileDropzone
              files={files}
              onFilesChange={setFiles}
              disabled={uploading}
              maxFiles={100}
              maxSize={1024 * 1024 * 1024} // 1GB
            />
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button variant="secondary" onClick={handleClose} disabled={uploading}>
          {t('common.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit(onSubmit)}
          loading={uploading}
          disabled={files.length === 0 || uploading}
        >
          {t('batchUpload.uploadButton', { count: files.length })}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
