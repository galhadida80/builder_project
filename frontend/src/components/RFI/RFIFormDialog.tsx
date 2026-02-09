import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { useState } from 'react'
import { Box, Stack, Autocomplete, Chip, Typography, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Alert } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useDropzone } from 'react-dropzone'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import { Select, SelectOption } from '../ui/Select'

// Category options for RFI classification
const RFI_CATEGORY_OPTIONS: SelectOption[] = [
  { value: 'design', label: 'Design' },
  { value: 'structural', label: 'Structural' },
  { value: 'mep', label: 'MEP' },
  { value: 'architectural', label: 'Architectural' },
  { value: 'specifications', label: 'Specifications' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'cost', label: 'Cost' },
  { value: 'other', label: 'Other' },
]

// Priority options for RFI urgency
const RFI_PRIORITY_OPTIONS: SelectOption[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

// Zod validation schema for RFI form data
const rfiFormSchema = z.object({
  // Required fields
  subject: z.string().min(1, 'Subject is required'),
  question: z.string().min(1, 'Question is required'),
  toEmail: z.string().email('Valid email address is required'),

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
}

export function RFIFormDialog({
  open,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  mode = 'create',
}: RFIFormDialogProps) {
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft. Please try again.'
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
      const errorMessage = error instanceof Error ? error.message : 'Failed to send RFI. Please try again.'
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

  const title = mode === 'create' ? 'Create New RFI' : 'Edit RFI'
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
            Cancel
          </Button>
          {mode === 'create' ? (
            <>
              <Button
                variant="secondary"
                onClick={handleSubmit(handleDraft)}
                loading={isFormLoading}
                disabled={isFormLoading}
              >
                Save as Draft
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit(handleSend)}
                loading={isFormLoading}
                disabled={isFormLoading}
              >
                Send Now
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              onClick={handleSubmit(handleDraft)}
              loading={isFormLoading}
              disabled={isFormLoading}
            >
              Save Changes
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

          {/* Required Fields */}
          <Controller
            name="toEmail"
            control={control}
            render={({ field, fieldState }) => (
              <TextField
                {...field}
                label="To Email"
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
                label="To Name"
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
                label="Subject"
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
                    label="CC Emails"
                    placeholder="Add email..."
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
                label="Category"
                options={RFI_CATEGORY_OPTIONS}
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
                label="Priority"
                options={RFI_PRIORITY_OPTIONS}
                error={!!fieldState.error}
                helperText={fieldState.error?.message}
                disabled={isFormLoading}
              />
            )}
          />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Controller
              name="dueDate"
              control={control}
              render={({ field, fieldState }) => (
                <DateTimePicker
                  {...field}
                  label="Due Date"
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
                label="Location"
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
                label="Drawing Reference"
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
                label="Specification Reference"
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
              Attachments
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
                {isDragActive ? 'Drop files here...' : 'Drag files here or click to upload'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Maximum file size: 10MB per file
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
                        aria-label="delete"
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
