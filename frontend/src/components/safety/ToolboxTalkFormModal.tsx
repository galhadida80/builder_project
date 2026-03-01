import { useTranslation } from 'react-i18next'
import { FormModal } from '../ui/Modal'
import { TextField } from '../ui/TextField'
import KeyPointsEditor, { type KeyPoint } from './KeyPointsEditor'
import ActionItemsEditor, { type TalkActionItem } from './ActionItemsEditor'
import type { Contact } from '../../types'
import type { ValidationError } from '../../utils/validation'
import {
  Box,
  TextField as MuiTextField,
  Autocomplete,
  Divider,
} from '@/mui'

export interface ToolboxTalkFormData {
  title: string
  topic: string
  description?: string
  scheduledDate: string
  location?: string
  presenter?: string
  keyPoints?: KeyPoint[]
  actionItems?: TalkActionItem[]
  durationMinutes?: number
  attendeeIds?: string[]
}

interface ToolboxTalkFormModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
  form: ToolboxTalkFormData
  setForm: (data: ToolboxTalkFormData) => void
  formErrors: ValidationError
  validateField: (field: string) => void
  contacts: Contact[]
}

export default function ToolboxTalkFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  form,
  setForm,
  formErrors,
  validateField,
  contacts,
}: ToolboxTalkFormModalProps) {
  const { t } = useTranslation()

  const isFormValid = Boolean(
    form.title && form.topic && form.scheduledDate
  )

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={onSubmit}
      title={t('safety.toolboxTalks.createTalk')}
      submitLabel={t('safety.toolboxTalks.create')}
      submitDisabled={!isFormValid}
      loading={submitting}
      maxWidth="md"
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Title */}
        <TextField
          fullWidth
          label={t('safety.toolboxTalks.title')}
          value={form.title || ''}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onBlur={() => validateField('title')}
          error={!!formErrors.title}
          helperText={formErrors.title}
          required
        />

        {/* Topic */}
        <TextField
          fullWidth
          label={t('safety.toolboxTalks.topic')}
          value={form.topic || ''}
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
          onBlur={() => validateField('topic')}
          error={!!formErrors.topic}
          helperText={formErrors.topic}
          required
        />

        {/* Description */}
        <TextField
          fullWidth
          label={t('safety.toolboxTalks.description')}
          multiline
          rows={3}
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        {/* Scheduled Date */}
        <TextField
          fullWidth
          label={t('safety.toolboxTalks.scheduledDate')}
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={form.scheduledDate || ''}
          onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
          onBlur={() => validateField('scheduledDate')}
          error={!!formErrors.scheduledDate}
          helperText={formErrors.scheduledDate}
          required
        />

        {/* Location */}
        <TextField
          fullWidth
          label={t('safety.toolboxTalks.location')}
          value={form.location || ''}
          onChange={(e) => setForm({ ...form, location: e.target.value })}
        />

        {/* Presenter */}
        <TextField
          fullWidth
          label={t('safety.toolboxTalks.presenter')}
          value={form.presenter || ''}
          onChange={(e) => setForm({ ...form, presenter: e.target.value })}
        />

        {/* Duration */}
        <TextField
          fullWidth
          label={t('safety.toolboxTalks.duration')}
          type="number"
          value={form.durationMinutes || ''}
          onChange={(e) =>
            setForm({
              ...form,
              durationMinutes: e.target.value ? parseInt(e.target.value, 10) : undefined,
            })
          }
          helperText={t('safety.toolboxTalks.durationHelper')}
        />

        {/* Attendee Selection */}
        {contacts.length > 0 && (
          <Autocomplete
            multiple
            options={contacts}
            getOptionLabel={(opt) =>
              `${opt.contactName}${opt.companyName ? ` (${opt.companyName})` : ''}`
            }
            value={contacts.filter((c) => form.attendeeIds?.includes(c.id))}
            onChange={(_, val) =>
              setForm({ ...form, attendeeIds: val.map((v) => v.id) })
            }
            renderInput={(params) => (
              <MuiTextField
                {...params}
                label={t('safety.toolboxTalks.attendees')}
                helperText={t('safety.toolboxTalks.attendeesHelper')}
              />
            )}
          />
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* Key Points */}
        <KeyPointsEditor
          keyPoints={form.keyPoints || []}
          onChange={(keyPoints) => setForm({ ...form, keyPoints })}
          disabled={submitting}
        />

        {/* Action Items */}
        <ActionItemsEditor
          actionItems={form.actionItems || []}
          onChange={(actionItems) => setForm({ ...form, actionItems })}
          disabled={submitting}
        />
      </Box>
    </FormModal>
  )
}
