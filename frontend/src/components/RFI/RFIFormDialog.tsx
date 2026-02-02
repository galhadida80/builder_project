import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { Box, Stack, Autocomplete, Chip } from '@mui/material'
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
  attachments: z.array(z.record(z.unknown())).optional(),
  assignedToId: z.string().optional(),
})

// Infer TypeScript type from Zod schema
export type RFIFormData = z.infer<typeof rfiFormSchema>

interface RFIFormDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: RFIFormData) => void | Promise<void>
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
  } = useForm<RFIFormData>({
    resolver: zodResolver(rfiFormSchema),
    defaultValues: initialData,
  })

  const handleFormSubmit = async (data: RFIFormData) => {
    try {
      await onSubmit(data)
      reset()
      onClose()
    } catch (error) {
      // Error handling will be done by parent component
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const title = mode === 'create' ? 'Create New RFI' : 'Edit RFI'
  const submitLabel = mode === 'create' ? 'Create RFI' : 'Save Changes'

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      actions={
        <>
          <Button variant="tertiary" onClick={handleClose} disabled={loading || isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(handleFormSubmit)}
            loading={loading || isSubmitting}
            disabled={loading || isSubmitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <Box component="form" onSubmit={(e) => { e.preventDefault(); handleSubmit(handleFormSubmit)(); }}>
        <Stack spacing={3}>
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
                disabled={loading || isSubmitting}
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
                disabled={loading || isSubmitting}
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
                disabled={loading || isSubmitting}
              />
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
                    disabled={loading || isSubmitting}
                  />
                )}
                disabled={loading || isSubmitting}
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
                disabled={loading || isSubmitting}
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
                disabled={loading || isSubmitting}
              />
            )}
          />
        </Stack>
      </Box>
    </Modal>
  )
}

// Export the schema for use with zodResolver
export { rfiFormSchema, zodResolver }
