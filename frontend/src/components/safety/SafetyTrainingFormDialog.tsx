import { useTranslation } from 'react-i18next'
import { Button } from '../ui/Button'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField as MuiTextField,
  MenuItem,
} from '@/mui'
import type { Contact } from '../../types'
import type { ValidationError } from '../../utils/validation'

interface TrainingFormData {
  workerId: string
  trainingType: string
  trainingDate: string
  expiryDate: string
  certificateNumber: string
  instructor: string
  notes: string
}

interface SafetyTrainingFormDialogProps {
  open: boolean
  isEditing: boolean
  form: TrainingFormData
  formErrors: ValidationError
  contacts: Contact[]
  submitting: boolean
  onClose: () => void
  onSubmit: () => void
  onChange: (field: keyof TrainingFormData, value: string) => void
  onBlur: (field: string) => void
}

export function SafetyTrainingFormDialog({
  open,
  isEditing,
  form,
  formErrors,
  contacts,
  submitting,
  onClose,
  onSubmit,
  onChange,
  onBlur,
}: SafetyTrainingFormDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? t('safetyTraining.editTraining') : t('safetyTraining.createNew')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <MuiTextField
            select
            label={t('safetyTraining.worker')}
            value={form.workerId}
            onChange={(e) => onChange('workerId', e.target.value)}
            onBlur={() => onBlur('workerId')}
            error={!!formErrors.workerId}
            helperText={formErrors.workerId}
            required
            fullWidth
          >
            {contacts.map((contact) => (
              <MenuItem key={contact.id} value={contact.id}>
                {contact.contactName} {contact.companyName ? `(${contact.companyName})` : ''}
              </MenuItem>
            ))}
          </MuiTextField>

          <MuiTextField
            label={t('safetyTraining.trainingType')}
            value={form.trainingType}
            onChange={(e) => onChange('trainingType', e.target.value)}
            onBlur={() => onBlur('trainingType')}
            error={!!formErrors.trainingType}
            helperText={formErrors.trainingType}
            required
            fullWidth
          />

          <MuiTextField
            type="date"
            label={t('safetyTraining.trainingDate')}
            value={form.trainingDate}
            onChange={(e) => onChange('trainingDate', e.target.value)}
            onBlur={() => onBlur('trainingDate')}
            error={!!formErrors.trainingDate}
            helperText={formErrors.trainingDate}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
          />

          <MuiTextField
            type="date"
            label={t('safetyTraining.expiryDate')}
            value={form.expiryDate}
            onChange={(e) => onChange('expiryDate', e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <MuiTextField
            label={t('safetyTraining.certificateNumber')}
            value={form.certificateNumber}
            onChange={(e) => onChange('certificateNumber', e.target.value)}
            fullWidth
          />

          <MuiTextField
            label={t('safetyTraining.instructor')}
            value={form.instructor}
            onChange={(e) => onChange('instructor', e.target.value)}
            fullWidth
          />

          <MuiTextField
            label={t('safetyTraining.notes')}
            value={form.notes}
            onChange={(e) => onChange('notes', e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t('common.cancel')}
        </Button>
        <Button onClick={onSubmit} variant="primary" disabled={submitting}>
          {isEditing ? t('common.update') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
