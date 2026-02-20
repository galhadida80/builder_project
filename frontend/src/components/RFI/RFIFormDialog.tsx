import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Delete as DeleteIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import 'dayjs/locale/he'
import 'dayjs/locale/es'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useDropzone } from 'react-dropzone'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { Select, SelectOption } from '../ui/Select'
import { contactsApi } from '../../api/contacts'
import { contactGroupsApi } from '../../api/contactGroups'
import type { Contact, ContactGroupListItem } from '../../types'
import { Box, Stack, Autocomplete, Chip, Typography, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Alert, TextField as MuiTextField } from '@/mui'

const RFI_CATEGORY_KEYS = ['design', 'structural', 'mep', 'architectural', 'specifications', 'schedule', 'cost', 'other'] as const
const RFI_PRIORITY_KEYS = ['urgent', 'high', 'medium', 'low'] as const

// Zod validation schema for RFI form data
const rfiFormSchema = z.object({
  // Required fields
  subject: z.string().min(1),
  question: z.string().min(1),
  toEmail: z.string().email(),

  // Optional fields
  toName: z.string().optional(),
  ccEmails: z.array(z.string().email('Invalid email address')).optional(),
  category: z.enum(['design', 'structural', 'mep', 'architectural', 'specifications', 'schedule', 'cost', 'other']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional(),
  location: z.string().optional(),
  drawingReference: z.string().optional(),
  specificationReference: z.string().optional(),
  attachments: z.array(z.record(z.string(), z.unknown())).optional(),
  assignedToId: z.string().optional(),
})

// Infer TypeScript type from Zod schema
export type RFIFormData = z.infer<typeof rfiFormSchema>

interface RFIFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: RFIFormData, action?: 'draft' | 'send') => void | Promise<void>
  initialData?: Partial<RFIFormData>
  loading?: boolean
  mode?: 'create' | 'edit'
  projectId?: string
}

export function RFIFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  mode = 'create',
  projectId,
}: RFIFormDialogProps) {
  const { t, i18n } = useTranslation()

  const rfiCategoryOptions: SelectOption[] = RFI_CATEGORY_KEYS.map(key => ({
    value: key,
    label: t(`rfis.categories.${key}`),
  }))
  const rfiPriorityOptions: SelectOption[] = RFI_PRIORITY_KEYS.map(key => ({
    value: key,
    label: t(`rfis.priorities.${key}`),
  }))

  const [projectContacts, setProjectContacts] = useState<Contact[]>([])
  const [contactGroups, setContactGroups] = useState<ContactGroupListItem[]>([])

  useEffect(() => {
    if (open && projectId) {
      Promise.all([
        contactsApi.list(projectId),
        contactGroupsApi.list(projectId),
      ]).then(([contacts, groups]) => {
        setProjectContacts(contacts.filter(c => c.email))
        setContactGroups(groups)
      }).catch(() => {})
    }
  }, [open, projectId])

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<RFIFormData>({
    resolver: zodResolver(rfiFormSchema),
    defaultValues: initialData,
  })

  // Initialize rich text editor for Question field
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialData?.question || '<p></p>',
    onUpdate: ({ editor: ed }) => {
      setValue('question', ed.getHTML())
    },
  })

  // File upload state management
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  // Loading and error state management - useState for loading state
  const [loadingState, setLoadingState] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Configure dropzone for file uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    multiple: true,
    maxSize: 10485760, // 10MB
    onDrop: (acceptedFiles) => {
      setUploadedFiles((prev) => [...prev, ...acceptedFiles])
      // Update form value for attachments
      const fileData = [...uploadedFiles, ...acceptedFiles].map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }))
      setValue('attachments', fileData)
    },
  })

  // Remove file from upload list
  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index)
      // Update form value
      const fileData = newFiles.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }))
      setValue('attachments', fileData)
      return newFiles
    })
  }

  // Handler for saving as draft
  const handleDraft = async (data: RFIFormData) => {
    setLoadingState(true)
    setError(null)
    try {
      await onSubmit(data, 'draft')
      reset()
      setUploadedFiles([])
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('rfis.failedToSaveDraft')
      setError(errorMessage)
    } finally {
      setLoadingState(false)
    }
  }

  // Handler for sending immediately
  const handleSend = async (data: RFIFormData) => {
    setLoadingState(true)
    setError(null)
    try {
      await onSubmit(data, 'send')
      reset()
      setUploadedFiles([])
      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('rfis.failedToSendRfi')
      setError(errorMessage)
    } finally {
      setLoadingState(false)
    }
  }

  const handleClose = () => {
    reset()
    setUploadedFiles([])
    setError(null)
    setLoadingState(false)
    onClose()
  }

  const title = mode === 'create' ? t('rfis.createNewRfi') : t('rfis.editRfi')
  const isFormLoading = loading || loadingState || isSubmitting

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      actions={
        <>
          <Button variant="tertiary" onClick={handleClose} disabled={isFormLoading}>
            {t('buttons.cancel')}
          </Button>
          {mode === 'create' ? (
            <>
              <Button
                variant="secondary"
                onClick={handleSubmit(handleDraft)}
                loading={isFormLoading}
                disabled={isFormLoading}
              >
                {t('buttons.saveAsDraft')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit(handleSend)}
                loading={isFormLoading}
                disabled={isFormLoading}
              >
                {t('buttons.sendNow')}
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit(handleDraft)}
              loading={isFormLoading}
              disabled={isFormLoading}
            >
              {t('common.saveChanges')}
            </Button>
          )}
        </>
      }
    >
      <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(mode === 'create' ? handleSend : handleDraft)(); }}>
        <Stack spacing={3}>
          {/* Error Message Display */}
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Contact/Group Quick Select */}
          {projectId && projectContacts.length > 0 && (
            <Autocomplete
              options={projectContacts}
              getOptionLabel={(opt) => `${opt.contactName} (${opt.email})`}
              onChange={(_, val) => {
                if (val) {
                  setValue('toEmail', val.email || '')
                  setValue('toName', val.contactName || '')
                }
              }}
              renderInput={(params) => (
                <MuiTextField {...params} label={t('rfis.selectRecipient')} size="small" />
              )}
              size="small"
              disabled={isFormLoading}
            />
          )}

          {/* Required Fields */}
          <Controller
            name="toEmail"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('rfis.toEmail')}
                type="email"
                required
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <Controller
            name="toName"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('rfis.toName')}
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <Controller
            name="subject"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('rfis.subject')}
                required
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <Controller
            name="question"
            control={control}
            render={({ field, fieldState }) => (
              <Box>
                {editor && (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, minHeight: 150 }}>
                    <EditorContent editor={editor} />
                  </Box>
                )}
                {fieldState.error && (
                  <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                    {fieldState.error.message}
                  </Box>
                )}
              </Box>
            )}
          />

          {projectId && contactGroups.length > 0 && (
            <Autocomplete
              options={contactGroups}
              getOptionLabel={(opt) => `${opt.name} (${opt.memberCount})`}
              onChange={async (_, val) => {
                if (val && projectId) {
                  try {
                    const full = await contactGroupsApi.get(projectId, val.id)
                    const emails = full.contacts.map(c => c.email).filter(Boolean) as string[]
                    if (emails.length > 0) {
                      const [first, ...rest] = emails
                      setValue('toEmail', first)
                      setValue('toName', full.contacts[0]?.contactName || '')
                      const current = control._formValues.ccEmails || []
                      setValue('ccEmails', [...new Set([...current, ...rest])])
                    }
                  } catch { /* ignore */ }
                }
              }}
              renderInput={(params) => (
                <MuiTextField {...params} label={t('rfis.selectGroup')} size="small" helperText={t('rfis.selectGroupHint')} />
              )}
              size="small"
              disabled={isFormLoading}
            />
          )}

          <Controller
            name="ccEmails"
            control={control}
            render={({ field, fieldState }) => (
              <Autocomplete
                {...field}
                multiple
                freeSolo
                options={[]}
                value={field.value || []}
                onChange={(_, data) => field.onChange(data)}
                renderTags={(value, getTagProps) =>
                  value.map((email, index) => (
                    <Chip
                      label={email}
                      {...getTagProps({ index })}
                      key={index}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={t('rfis.ccEmails')}
                    placeholder={t('rfis.addEmailPlaceholder')}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    disabled={isFormLoading}
                  />
                )}
                disabled={isFormLoading}
              />
            )}
          />

          <Controller
            name="category"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                {...field}
                label={t('rfis.category')}
                options={rfiCategoryOptions}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <Controller
            name="priority"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                {...field}
                label={t('rfis.priority')}
                options={rfiPriorityOptions}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={i18n.language}>
            <Controller
              name="dueDate"
              control={control}
              render={({ field, fieldState }) => (
                <DateTimePicker
                  {...field}
                  label={t('rfis.dueDate')}
                  disabled={isFormLoading}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message,
                    },
                  }}
                />
              )}
            />
          </LocalizationProvider>

          <Controller
            name="location"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('rfis.location')}
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <Controller
            name="drawingReference"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('rfis.drawingReference')}
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <Controller
            name="specificationReference"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label={t('rfis.specificationReference')}
                fullWidth
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          {/* File Upload Area */}
          <Box>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: 'text.primary' }}>
              {t('rfis.attachments')}
            </Typography>
            <Box
              {...getRootProps()}
              sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'divider',
                borderRadius: 1,
                p: 3,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <input {...getInputProps()} disabled={isFormLoading} />
              <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body1" color="text.primary" gutterBottom>
                {isDragActive ? t('rfis.dropFilesHere') : t('rfis.dragFilesOrClick')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('rfis.maxFileSize')}
              </Typography>
            </Box>

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <List sx={{ mt: 2 }}>
                {uploadedFiles.map((file, index) => (
                  <ListItem
                    key={`${file.name}-${index}`}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: 'background.paper',
                    }}
                  >
                    <ListItemText
                      primary={file.name}
                      secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        aria-label={t('common.delete')}
                        onClick={() => handleRemoveFile(index)}
                        disabled={isFormLoading}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      </Box>
    </Modal>
  )
}

// Export the schema for use with zodResolver
export { rfiFormSchema, zodResolver }
