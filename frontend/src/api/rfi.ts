import { apiClient } from './client'

export interface RFI {
  id: string
  project_id: string
  rfi_number: string
  email_thread_id?: string
  email_message_id?: string
  subject: string
  question: string
  category: string
  priority: string
  to_email: string
  to_name?: string
  cc_emails?: string[]
  cc_recipients?: string[]
  status: string
  due_date?: string
  responded_at?: string
  closed_at?: string
  location?: string
  drawing_reference?: string
  specification_reference?: string
  attachments?: Record<string, unknown>[]
  created_at: string
  updated_at: string
  sent_at?: string
  created_by?: {
    id: string
    email: string
    display_name: string
  }
  assigned_to?: {
    id: string
    email: string
    display_name: string
  }
  responses?: RFIResponseData[]
}

export interface RFIResponseData {
  id: string
  rfi_id: string
  email_message_id?: string
  in_reply_to?: string
  response_text: string
  attachments?: Array<{ id: string; filename: string; url: string }>
  from_email: string
  from_name?: string
  responder?: {
    id: string
    email: string
    display_name: string
  }
  is_internal: boolean
  is_cc_participant: boolean
  source: string
  created_at: string
  received_at?: string
}

export interface RFIListItem {
  id: string
  project_id: string
  rfi_number: string
  subject: string
  to_email: string
  to_name?: string
  category: string
  priority: string
  status: string
  due_date?: string
  created_at: string
  sent_at?: string
  responded_at?: string
  response_count: number
}

export interface RFICreate {
  subject: string
  question: string
  to_email: string
  to_name?: string
  cc_emails?: string[]
  category?: string
  priority?: string
  due_date?: string
  location?: string
  drawing_reference?: string
  specification_reference?: string
  attachments?: Record<string, unknown>[]
  assigned_to_id?: string
}

export interface RFIUpdate {
  subject?: string
  question?: string
  to_email?: string
  to_name?: string
  cc_emails?: string[]
  category?: string
  priority?: string
  due_date?: string
  location?: string
  drawing_reference?: string
  specification_reference?: string
  attachments?: Record<string, unknown>[]
  assigned_to_id?: string
}

export interface RFIResponseCreate {
  response_text: string
  attachments?: Record<string, unknown>[]
  is_internal?: boolean
}

export interface RFISummary {
  total_rfis: number
  draft_count: number
  open_count: number
  waiting_response_count: number
  answered_count: number
  closed_count: number
  overdue_count: number
  by_priority: Record<string, number>
  by_category: Record<string, number>
}

export interface PaginatedRFIResponse {
  items: RFIListItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface RFIEmailLog {
  id: string
  rfi_id?: string
  event_type: string
  email_message_id?: string
  from_email?: string
  to_email?: string
  subject?: string
  error_message?: string
  created_at: string
}

export interface RFIFilters {
  status?: string
  priority?: string
  search?: string
  page?: number
  page_size?: number
}

export const rfiApi = {
  list: async (projectId: string, filters?: RFIFilters): Promise<PaginatedRFIResponse> => {
    const params = new URLSearchParams()
    if (filters?.status) params.append('status', filters.status)
    if (filters?.priority) params.append('priority', filters.priority)
    if (filters?.search) params.append('search', filters.search)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.page_size) params.append('page_size', filters.page_size.toString())

    const url = `/projects/${projectId}/rfis${params.toString() ? `?${params}` : ''}`
    const response = await apiClient.get(url)
    return response.data
  },

  get: async (rfiId: string): Promise<RFI> => {
    const response = await apiClient.get(`/rfis/${rfiId}`)
    return response.data
  },

  create: async (projectId: string, data: RFICreate): Promise<RFI> => {
    const response = await apiClient.post(`/projects/${projectId}/rfis`, data)
    return response.data
  },

  update: async (rfiId: string, data: RFIUpdate): Promise<RFI> => {
    const response = await apiClient.patch(`/rfis/${rfiId}`, data)
    return response.data
  },

  send: async (rfiId: string): Promise<RFI> => {
    const response = await apiClient.post(`/rfis/${rfiId}/send`)
    return response.data
  },

  updateStatus: async (rfiId: string, status: string): Promise<RFI> => {
    const response = await apiClient.patch(`/rfis/${rfiId}/status`, { status })
    return response.data
  },

  addResponse: async (rfiId: string, data: RFIResponseCreate, sendEmail = true): Promise<RFIResponseData> => {
    const response = await apiClient.post(`/rfis/${rfiId}/responses?send_email=${sendEmail}`, data)
    return response.data
  },

  getResponses: async (rfiId: string): Promise<RFIResponseData[]> => {
    const response = await apiClient.get(`/rfis/${rfiId}/responses`)
    return response.data
  },

  getEmailLog: async (rfiId: string): Promise<RFIEmailLog[]> => {
    const response = await apiClient.get(`/rfis/${rfiId}/email-log`)
    return response.data
  },

  getSummary: async (projectId: string): Promise<RFISummary> => {
    const response = await apiClient.get(`/projects/${projectId}/rfis/summary`)
    return response.data
  },

  delete: async (rfiId: string): Promise<void> => {
    await apiClient.delete(`/rfis/${rfiId}`)
  },

  closeRfi: async (rfiId: string): Promise<RFI> => {
    const response = await apiClient.post(`/rfis/${rfiId}/close`)
    return response.data
  },

  reopenRfi: async (rfiId: string): Promise<RFI> => {
    const response = await apiClient.post(`/rfis/${rfiId}/reopen`)
    return response.data
  },
}

export const RFI_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'open', label: 'Open', color: 'info' },
  { value: 'waiting_response', label: 'Waiting Response', color: 'warning' },
  { value: 'answered', label: 'Answered', color: 'success' },
  { value: 'closed', label: 'Closed', color: 'default' },
  { value: 'cancelled', label: 'Cancelled', color: 'error' },
] as const

export const RFI_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'default' },
  { value: 'medium', label: 'Medium', color: 'info' },
  { value: 'high', label: 'High', color: 'warning' },
  { value: 'urgent', label: 'Urgent', color: 'error' },
] as const

export const RFI_CATEGORY_OPTIONS = [
  { value: 'design', label: 'Design' },
  { value: 'structural', label: 'Structural' },
  { value: 'mep', label: 'MEP' },
  { value: 'architectural', label: 'Architectural' },
  { value: 'specifications', label: 'Specifications' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'cost', label: 'Cost' },
  { value: 'other', label: 'Other' },
] as const
