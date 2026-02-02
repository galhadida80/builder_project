import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

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

// Export the schema for use with zodResolver
export { rfiFormSchema, zodResolver }
