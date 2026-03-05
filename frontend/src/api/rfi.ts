import { apiClient } from './client'

export interface RFI {
  id: string
  projectId: string
  rfiNumber: string
  emailThreadId?: string
  emailMessageId?: string
  subject: string
  question: string
  category: string
  priority: string
  toEmail: string
  toName?: string
  ccEmails?: string[]
  status: string
  dueDate?: string
  respondedAt?: string
  closedAt?: string
  location?: string
  drawingReference?: string
  specificationReference?: string
  attachments?: Record<string, unknown>[]
  createdAt: string
  updatedAt: string
  sentAt?: string
  createdBy?: {
    id: string
    email: string
    fullName: string
  }
  assignedTo?: {
    id: string
    email: string
    fullName: string
  }
  relatedEquipmentId?: string
  relatedMaterialId?: string
  relatedAreaId?: string
  relatedEquipment?: { id: string; name: string; equipmentType?: string }
  relatedMaterial?: { id: string; name: string; materialType?: string }
  relatedArea?: { id: string; name: string; areaCode?: string; floorNumber?: number }
  responses?: RFIResponseData[]
  syncSource?: string
  syncStatus?: string
  lastSyncedAt?: string
}

export interface RFIResponseData {
  id: string
  rfiId: string
  emailMessageId?: string
  inReplyTo?: string
  responseText: string
  attachments?: Array<{ id: string; filename: string; url: string }>
  fromEmail: string
  fromName?: string
  responder?: {
    id: string
    email: string
    fullName: string
  }
  isInternal: boolean
  isCcParticipant: boolean
  source: string
  createdAt: string
  receivedAt?: string
}

export interface RFIListItem {
  id: string
  projectId: string
  rfiNumber: string
  subject: string
  toEmail: string
  toName?: string
  category: string
  priority: string
  status: string
  dueDate?: string
  createdAt: string
  sentAt?: string
  respondedAt?: string
  responseCount: number
  syncSource?: string
  syncStatus?: string
  lastSyncedAt?: string
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
  related_equipment_id?: string
  related_material_id?: string
  related_area_id?: string
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
  related_equipment_id?: string
  related_material_id?: string
  related_area_id?: string
}

export interface RFIResponseCreate {
  response_text: string
  attachments?: Record<string, unknown>[]
  is_internal?: boolean
}

export interface RFISummary {
  totalRfis: number
  draftCount: number
  openCount: number
  waitingResponseCount: number
  answeredCount: number
  closedCount: number
  overdueCount: number
  byPriority: Record<string, number>
  byCategory: Record<string, number>
}

export interface PaginatedRFIResponse {
  items: RFIListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface RFIEmailLog {
  id: string
  rfiId?: string
  eventType: string
  emailMessageId?: string
  fromEmail?: string
  toEmail?: string
  subject?: string
  errorMessage?: string
  createdAt: string
}

export interface RFIFilters {
  status?: string
  priority?: string
  search?: string
  page?: number
  page_size?: number
}

export interface ACCSyncStatus {
  syncHealth: 'ok' | 'warning' | 'error'
  lastSyncedAt?: string
  totalSynced: number
  conflictCount: number
  errorMessage?: string
}

export interface ACCConflictItem {
  id: string
  rfiNumber: string
  subject: string
  conflictFields: string[]
  localUpdatedAt: string
  accUpdatedAt: string
  accMetadata?: Record<string, unknown>
}

export interface ACCConflictResolveRequest {
  strategy: 'last_write_wins' | 'prefer_local' | 'prefer_acc'
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
    const response = await apiClient.patch(`/rfis/${rfiId}/status`, { status: 'closed' })
    return response.data
  },

  reopenRfi: async (rfiId: string): Promise<RFI> => {
    const response = await apiClient.patch(`/rfis/${rfiId}/status`, { status: 'open' })
    return response.data
  },

  triggerAccSync: async (projectId: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/projects/${projectId}/acc/sync`)
    return response.data
  },

  getAccSyncStatus: async (projectId: string): Promise<ACCSyncStatus> => {
    const response = await apiClient.get(`/projects/${projectId}/acc/sync/status`)
    return response.data
  },

  getAccConflicts: async (projectId: string): Promise<ACCConflictItem[]> => {
    const response = await apiClient.get(`/projects/${projectId}/acc/conflicts`)
    return response.data
  },

  resolveConflict: async (projectId: string, rfiId: string, strategy: ACCConflictResolveRequest['strategy']): Promise<RFI> => {
    const response = await apiClient.post(`/projects/${projectId}/acc/conflicts/${rfiId}/resolve`, { strategy })
    return response.data
  },
}

export const RFI_STATUS_OPTIONS = [
  { value: 'draft', labelKey: 'rfis.statuses.draft', color: 'default' },
  { value: 'open', labelKey: 'rfis.statuses.open', color: 'info' },
  { value: 'waiting_response', labelKey: 'rfis.statuses.waiting_response', color: 'warning' },
  { value: 'answered', labelKey: 'rfis.statuses.answered', color: 'success' },
  { value: 'closed', labelKey: 'rfis.statuses.closed', color: 'default' },
  { value: 'cancelled', labelKey: 'rfis.statuses.cancelled', color: 'error' },
] as const

export const RFI_PRIORITY_OPTIONS = [
  { value: 'low', labelKey: 'rfis.priorities.low', color: 'default' },
  { value: 'medium', labelKey: 'rfis.priorities.medium', color: 'info' },
  { value: 'high', labelKey: 'rfis.priorities.high', color: 'warning' },
  { value: 'urgent', labelKey: 'rfis.priorities.urgent', color: 'error' },
] as const

export const RFI_CATEGORY_OPTIONS = [
  { value: 'design', labelKey: 'rfis.categories.design' },
  { value: 'structural', labelKey: 'rfis.categories.structural' },
  { value: 'mep', labelKey: 'rfis.categories.mep' },
  { value: 'architectural', labelKey: 'rfis.categories.architectural' },
  { value: 'specifications', labelKey: 'rfis.categories.specifications' },
  { value: 'schedule', labelKey: 'rfis.categories.schedule' },
  { value: 'cost', labelKey: 'rfis.categories.cost' },
  { value: 'other', labelKey: 'rfis.categories.other' },
] as const
