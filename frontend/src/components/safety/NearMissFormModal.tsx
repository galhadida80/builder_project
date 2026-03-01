import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FormModal } from '../ui/Modal'
import { TextField } from '../ui/TextField'
import SafetyPhotoUploader from './SafetyPhotoUploader'
import type { NearMissCreateData } from '../../api/safety'
import type { Contact, ConstructionArea } from '../../types'
import type { ValidationError } from '../../utils/validation'
import type { NearMissSeverity } from '../../types/safety'
import {
  Box,
  Typography,
  MenuItem,
  LinearProgress,
  TextField as MuiTextField,
  Autocomplete,
  FormControlLabel,
  Checkbox,
} from '@/mui'

const SEVERITY_OPTIONS: NearMissSeverity[] = ['low', 'medium', 'high']

interface NearMissFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
  uploadProgress: number
  form: NearMissCreateData
  setForm: (data: NearMissCreateData) => void
  formErrors: ValidationError
  validateField: (field: string) => void
  contacts: Contact[]
  areas: ConstructionArea[]
  pendingPhotos: File[]
  photoPreviews: string[]
  addPhotos: (files: File[]) => void
  removePhoto: (index: number) => void
}

export default function NearMissFormModal({
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
}: NearMissFormModalProps) {
  const { t } = useTranslation()

  const handleAnonymousChange = useCallback(
    (checked: boolean) => {
      setForm({
        ...form,
        isAnonymous: checked,
        reportedById: checked ? undefined : form.reportedById,
      })
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
      title={t('safety.nearMisses.reportNearMiss')}
      submitLabel={t('safety.nearMisses.create')}
      submitDisabled={!isFormValid}
      loading={submitting}
      maxWidth="md"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Anonymous Reporting Toggle */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={form.isAnonymous}
                onChange={(e) => handleAnonymousChange(e.target.checked)}
              />
            }
            label={t('safety.nearMisses.reportAnonymously')}
          />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {t('safety.nearMisses.anonymousDescription')}
          </Typography>
        </Box>

        {/* Title */}
        <TextField
          fullWidth
          label={t('safety.nearMisses.nearMissTitle')}
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
          label={t('safety.nearMisses.description')}
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
          label={t('safety.nearMisses.severity')}
          value={form.severity}
          onChange={(e) =>
            setForm({ ...form, severity: e.target.value as NearMissSeverity })
          }
          error={!!formErrors.severity}
          helperText={formErrors.severity}
          required
        >
          {SEVERITY_OPTIONS.map((sev) => (
            <MenuItem key={sev} value={sev}>
              {t(`safety.nearMisses.severity_${sev}`)}
            </MenuItem>
          ))}
        </MuiTextField>

        {/* Potential Consequence */}
        <TextField
          fullWidth
          label={t('safety.nearMisses.potentialConsequence')}
          multiline
          rows={2}
          value={form.potentialConsequence || ''}
          onChange={(e) => setForm({ ...form, potentialConsequence: e.target.value })}
          helperText={t('safety.nearMisses.potentialConsequenceHelper')}
        />

        {/* Occurred At */}
        <TextField
          fullWidth
          label={t('safety.nearMisses.occurredDate')}
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
          label={t('safety.nearMisses.location')}
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
              <MuiTextField {...params} label={t('safety.nearMisses.area')} />
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

        {/* Preventive Actions */}
        <TextField
          fullWidth
          label={t('safety.nearMisses.preventiveActions')}
          multiline
          rows={2}
          value={form.preventiveActions || ''}
          onChange={(e) =>
            setForm({ ...form, preventiveActions: e.target.value })
          }
          helperText={t('safety.nearMisses.preventiveActionsHelper')}
        />

        {/* Reported By - Hidden if Anonymous */}
        {!form.isAnonymous && contacts.length > 0 && (
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
                label={t('safety.nearMisses.reportedBy')}
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
