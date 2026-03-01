import { useTranslation } from 'react-i18next'
import { FormModal } from '../ui/Modal'
import { TextField } from '../ui/TextField'
import SafetyPhotoUploader from './SafetyPhotoUploader'
import WitnessListEditor, { type WitnessData } from './WitnessListEditor'
import type { SafetyIncidentCreateData } from '../../api/safety'
import type { Contact, ConstructionArea } from '../../types'
import type { ValidationError } from '../../utils/validation'
import type { IncidentSeverity } from '../../types/safety'
import {
  Box,
  Typography,
  MenuItem,
  LinearProgress,
  TextField as MuiTextField,
  Autocomplete,
  Divider,
} from '@/mui'

const SEVERITY_OPTIONS: IncidentSeverity[] = ['low', 'medium', 'high', 'critical']

export interface IncidentFormData extends Omit<SafetyIncidentCreateData, 'witnesses'> {
  witnesses?: WitnessData[]
}

export type { WitnessData }

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
        <SafetyPhotoUploader
          pendingPhotos={pendingPhotos}
          photoPreviews={photoPreviews}
          onAddPhotos={addPhotos}
          onRemovePhoto={removePhoto}
          disabled={submitting}
        />

        {/* Witnesses */}
        <WitnessListEditor
          witnesses={form.witnesses || []}
          onChange={(witnesses) => setForm({ ...form, witnesses })}
          disabled={submitting}
        />

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
