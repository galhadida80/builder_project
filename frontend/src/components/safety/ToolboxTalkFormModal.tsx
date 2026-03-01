import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FormModal } from '../ui/Modal'
import { TextField } from '../ui/TextField'
import { Button } from '../ui/Button'
import type { Contact } from '../../types'
import type { ValidationError } from '../../utils/validation'
import type { KeyPoint, TalkActionItem } from '../../types/safety'
import { AddIcon, CloseIcon, CheckCircleIcon } from '@/icons'
import {
  Box,
  Typography,
  IconButton,
  TextField as MuiTextField,
  Autocomplete,
  Paper,
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

  // Key Points Management
  const addKeyPoint = useCallback(() => {
    const currentKeyPoints = form.keyPoints || []
    const newId = `kp-${Date.now()}-${Math.random().toString(36).substring(7)}`
    setForm({
      ...form,
      keyPoints: [...currentKeyPoints, { id: newId, text: '' }],
    })
  }, [form, setForm])

  const updateKeyPoint = useCallback(
    (index: number, text: string) => {
      const currentKeyPoints = form.keyPoints || []
      const updated = [...currentKeyPoints]
      updated[index] = { ...updated[index], text }
      setForm({ ...form, keyPoints: updated })
    },
    [form, setForm]
  )

  const removeKeyPoint = useCallback(
    (index: number) => {
      const currentKeyPoints = form.keyPoints || []
      const updated = currentKeyPoints.filter((_, i) => i !== index)
      setForm({ ...form, keyPoints: updated })
    },
    [form, setForm]
  )

  // Action Items Management
  const addActionItem = useCallback(() => {
    const currentActionItems = form.actionItems || []
    const newId = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}`
    setForm({
      ...form,
      actionItems: [
        ...currentActionItems,
        { id: newId, description: '', assignedTo: undefined, isCompleted: false },
      ],
    })
  }, [form, setForm])

  const updateActionItem = useCallback(
    (index: number, field: 'description' | 'assignedTo', value: string) => {
      const currentActionItems = form.actionItems || []
      const updated = [...currentActionItems]
      updated[index] = { ...updated[index], [field]: value }
      setForm({ ...form, actionItems: updated })
    },
    [form, setForm]
  )

  const removeActionItem = useCallback(
    (index: number) => {
      const currentActionItems = form.actionItems || []
      const updated = currentActionItems.filter((_, i) => i !== index)
      setForm({ ...form, actionItems: updated })
    },
    [form, setForm]
  )

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
              {t('safety.toolboxTalks.keyPoints')}
            </Typography>
            <Button
              variant="tertiary"
              size="small"
              startIcon={<AddIcon />}
              onClick={addKeyPoint}
            >
              {t('safety.toolboxTalks.addKeyPoint')}
            </Button>
          </Box>
          {form.keyPoints && form.keyPoints.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {form.keyPoints.map((keyPoint, idx) => (
                <Paper
                  key={keyPoint.id}
                  variant="outlined"
                  sx={{ p: 2, position: 'relative' }}
                >
                  <IconButton
                    size="small"
                    aria-label={t('common.removeItem')}
                    onClick={() => removeKeyPoint(idx)}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <Box sx={{ pr: 4 }}>
                    <TextField
                      fullWidth
                      label={`${t('safety.toolboxTalks.keyPoint')} ${idx + 1}`}
                      value={keyPoint.text}
                      onChange={(e) => updateKeyPoint(idx, e.target.value)}
                      size="small"
                      multiline
                      rows={2}
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>

        {/* Action Items */}
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
              {t('safety.toolboxTalks.actionItems')}
            </Typography>
            <Button
              variant="tertiary"
              size="small"
              startIcon={<AddIcon />}
              onClick={addActionItem}
            >
              {t('safety.toolboxTalks.addActionItem')}
            </Button>
          </Box>
          {form.actionItems && form.actionItems.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {form.actionItems.map((actionItem, idx) => (
                <Paper
                  key={actionItem.id}
                  variant="outlined"
                  sx={{ p: 2, position: 'relative' }}
                >
                  <IconButton
                    size="small"
                    aria-label={t('common.removeItem')}
                    onClick={() => removeActionItem(idx)}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  >
                    <CloseIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pr: 4 }}>
                    <TextField
                      fullWidth
                      label={t('safety.toolboxTalks.actionDescription')}
                      value={actionItem.description}
                      onChange={(e) =>
                        updateActionItem(idx, 'description', e.target.value)
                      }
                      size="small"
                      multiline
                      rows={2}
                    />
                    <TextField
                      fullWidth
                      label={t('safety.toolboxTalks.assignedTo')}
                      value={actionItem.assignedTo || ''}
                      onChange={(e) =>
                        updateActionItem(idx, 'assignedTo', e.target.value)
                      }
                      size="small"
                      helperText={t('safety.toolboxTalks.assignedToHelper')}
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </FormModal>
  )
}
