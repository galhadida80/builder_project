import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useDropzone } from 'react-dropzone'
import { FormModal } from '../ui/Modal'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import type { SafetyIncidentCreateData } from '../../api/safety'
import type { Contact, ConstructionArea } from '../../types'
import type { ValidationError } from '../../utils/validation'
import type { IncidentSeverity } from '../../types/safety'
import { CameraAltIcon, CloseIcon, AddIcon, PersonIcon } from '@/icons'
import {
  Box,
  Typography,
  MenuItem,
  IconButton,
  LinearProgress,
  TextField as MuiTextField,
  Autocomplete,
  Paper,
  Divider,
} from '@/mui'

const MAX_PHOTOS = 5

const SEVERITY_OPTIONS: IncidentSeverity[] = ['low', 'medium', 'high', 'critical']

export interface WitnessData {
  name: string
  contact: string
}

export interface IncidentFormData extends Omit<SafetyIncidentCreateData, 'witnesses'> {
  witnesses?: WitnessData[]
}

interface IncidentFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
  uploadProgress: number
  form: IncidentFormData
  setForm: (data: IncidentFormData) => void
  formErrors: ValidationError
  validateField: (field: string) => void
  contacts: Contact[]
  areas: ConstructionArea[]
  pendingPhotos: File[]
  photoPreviews: string[]
  addPhotos: (files: File[]) => void
  removePhoto: (index: number) => void
}

export default function IncidentFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  uploadProgress,
  form,
  setForm,
  formErrors,
  validateField,
  contacts,
  areas,
  pendingPhotos,
  photoPreviews,
  addPhotos,
  removePhoto,
}: IncidentFormModalProps) {
  const { t } = useTranslation()

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: MAX_PHOTOS,
    maxSize: 5 * 1024 * 1024,
    onDrop: addPhotos,
    noClick: pendingPhotos.length >= MAX_PHOTOS,
    noDrag: pendingPhotos.length >= MAX_PHOTOS,
  })

  const addWitness = useCallback(() => {
    const currentWitnesses = form.witnesses || []
    setForm({
      ...form,
      witnesses: [...currentWitnesses, { name: '', contact: '' }],
    })
  }, [form, setForm])

  const updateWitness = useCallback(
    (index: number, field: 'name' | 'contact', value: string) => {
      const currentWitnesses = form.witnesses || []
      const updated = [...currentWitnesses]
      updated[index] = { ...updated[index], [field]: value }
      setForm({ ...form, witnesses: updated })
    },
    [form, setForm]
  )

  const removeWitness = useCallback(
    (index: number) => {
      const currentWitnesses = form.witnesses || []
      const updated = currentWitnesses.filter((_, i) => i !== index)
      setForm({ ...form, witnesses: updated })
    },
    [form, setForm]
  )

  const isFormValid = Boolean(
    form.title &&
      form.description &&
      form.severity &&
      form.occurredAt
  )

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title={t('safety.incidents.reportIncident')}
      submitLabel={t('safety.incidents.create')}
      submitDisabled={!isFormValid}
      loading={submitting}
      maxWidth="md"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Title */}
        <TextField
          fullWidth
          label={t('safety.incidents.incidentTitle')}
          value={form.title || ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onBlur={() => validateField('title')}
          error={!!formErrors.title}
          helperText={formErrors.title}
          required
        />

        {/* Description */}
        <TextField
          fullWidth
          label={t('safety.incidents.description')}
          multiline
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          onBlur={() => validateField('description')}
          error={!!formErrors.description}
          helperText={formErrors.description}
          required
        />

        {/* Severity */}
        <MuiTextField
          select
          fullWidth
          label={t('safety.incidents.severity')}
          value={form.severity}
          onChange={(e) =>
            setForm({ ...form, severity: e.target.value as IncidentSeverity })
          }
          error={!!formErrors.severity}
          helperText={formErrors.severity}
          required
        >
          {SEVERITY_OPTIONS.map((sev) => (
            <MenuItem key={sev} value={sev}>
              {t(`safety.incidents.severity_${sev}`)}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Occurred At */}
        <TextField
          fullWidth
          label={t('safety.incidents.occurredDate')}
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={form.occurredAt || ''}
          onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
          onBlur={() => validateField('occurredAt')}
          error={!!formErrors.occurredAt}
          helperText={formErrors.occurredAt}
          required
        />

        {/* Location */}
        <TextField
          fullWidth
          label={t('safety.incidents.location')}
          value={form.location || ''}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        {/* Area */}
        {areas.length > 0 && (
          <Autocomplete
            options={areas}
            getOptionLabel={(opt) =>
              `${opt.name}${
                opt.floorNumber != null
                  ? ` (${t('defects.floor')} ${opt.floorNumber})`
                  : ''
              }`
            }
            value={areas.find((a) => a.id === form.areaId) || null}
            onChange={(_, val) => setForm({ ...form, areaId: val?.id })}
            renderInput={(params) => (
              <MuiTextField {...params} label={t('safety.incidents.area')} />
            )}
          />
        )}

        {/* Photo Upload */}
        <Box>
          <Typography variant="body2" fontWeight={500} sx={{ mb: 1 }}>
            {t('safety.incidents.attachPhotos')} ({pendingPhotos.length}/
            {MAX_PHOTOS})
          </Typography>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'divider',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
              cursor:
                pendingPhotos.length >= MAX_PHOTOS ? 'default' : 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'transparent',
              transition: 'all 200ms ease',
              '&:hover':
                pendingPhotos.length < MAX_PHOTOS
                  ? { borderColor: 'primary.light', bgcolor: 'action.hover' }
                  : {},
            }}
          >
            <input {...getInputProps()} capture="environment" />
            <CameraAltIcon sx={{ fontSize: 32, color: 'text.disabled', mb: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              {isDragActive
                ? t('safety.incidents.dropHere')
                : t('safety.incidents.dragOrTap')}
            </Typography>
            {pendingPhotos.length >= MAX_PHOTOS && (
              <Typography variant="caption" color="text.disabled">
                {t('safety.incidents.maxPhotos', { max: MAX_PHOTOS })}
              </Typography>
            )}
          </Box>
          {pendingPhotos.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5 }}>
              {photoPreviews.map((url, idx) => (
                <Box
                  key={idx}
                  sx={{
                    position: 'relative',
                    width: 80,
                    height: 80,
                    borderRadius: 1.5,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    component="img"
                    src={url}
                    alt={pendingPhotos[idx]?.name}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <IconButton
                    size="small"
                    aria-label={t('common.removeItem')}
                    onClick={(e) => {
                      e.stopPropagation()
                      removePhoto(idx)
                    }}
                    sx={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      bgcolor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      p: 0.3,
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Witnesses */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1,
            }}
          >
            <Typography variant="body2" fontWeight={500}>
              {t('safety.incidents.witnesses')}
            </Typography>
            <Button
              variant="tertiary"
              size="small"
              startIcon={<AddIcon />}
              onClick={addWitness}
            >
              {t('safety.incidents.addWitness')}
            </Button>
          </Box>
          {form.witnesses && form.witnesses.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {form.witnesses.map((witness, idx) => (
                <Paper
                  key={idx}
                  variant="outlined"
                  sx={{ p: 2, position: 'relative' }}
                >
                  <IconButton
                    size="small"
                    aria-label={t('common.removeItem')}
                    onClick={() => removeWitness(idx)}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pr: 4 }}>
                    <TextField
                      fullWidth
                      label={t('safety.incidents.witnessName')}
                      value={witness.name}
                      onChange={(e) => updateWitness(idx, 'name', e.target.value)}
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label={t('safety.incidents.witnessContact')}
                      value={witness.contact}
                      onChange={(e) => updateWitness(idx, 'contact', e.target.value)}
                      size="small"
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 0.5 }} />

        {/* Root Cause */}
        <TextField
          fullWidth
          label={t('safety.incidents.rootCause')}
          multiline
          rows={2}
          value={form.rootCause || ''}
          onChange={(e) => setForm({ ...form, rootCause: e.target.value })}
        />

        {/* Corrective Actions */}
        <TextField
          fullWidth
          label={t('safety.incidents.correctiveActions')}
          multiline
          rows={2}
          value={form.correctiveActions || ''}
          onChange={(e) =>
            setForm({ ...form, correctiveActions: e.target.value })
          }
        />

        {/* Reported By */}
        {contacts.length > 0 && (
          <Autocomplete
            options={contacts}
            getOptionLabel={(opt) =>
              `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`
            }
            value={contacts.find((c) => c.id === form.reportedById) || null}
            onChange={(_, val) => setForm({ ...form, reportedById: val?.id })}
            renderInput={(params) => (
              <MuiTextField
                {...params}
                label={t('safety.incidents.reportedBy')}
              />
            )}
          />
        )}

        {/* Upload Progress */}
        {submitting && uploadProgress > 0 && uploadProgress < 100 && (
          <Box sx={{ width: '100%' }}>
            <LinearProgress
              variant="determinate"
              value={uploadProgress}
              sx={{ borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('common.uploading')} {Math.round(uploadProgress)}%
            </Typography>
          </Box>
        )}
      </Box>
    </FormModal>
  )
}
