import { apiClient } from './client'

export interface DocumentDefinition {
  name: string
  name_he: string
  description?: string
  source: 'consultant' | 'project_manager' | 'contractor'
  required: boolean
}

export interface SpecificationDefinition {
  name: string
  name_he: string
  field_type: 'text' | 'number' | 'boolean' | 'select' | 'file'
  options?: string[]
  unit?: string
  required: boolean
}

export interface ChecklistItemDefinition {
  name: string
  name_he: string
  requires_file: boolean
}

export interface EquipmentTemplate {
  id: string
  name: string
  name_he: string
  category: string | null
  description: string | null
  documents: DocumentDefinition[]
  specifications: SpecificationDefinition[]
  checklist_items: ChecklistItemDefinition[]
  created_at: string
  updated_at: string
}

export interface EquipmentSubmission {
  id: string
  project_id: string
  template_id: string
  name: string
  specifications: Record<string, unknown>
  documents: Record<string, unknown>
  checklist_responses: Record<string, unknown>
  additional_data: Record<string, unknown>
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'revision_requested'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalDecision {
  id: string
  submission_id: string
  decision: 'approve' | 'reject' | 'revision'
  comments: string | null
  decided_at: string
}

interface EquipmentTemplateCreate {
  name: string
  name_he: string
  category?: string
  description?: string
  documents?: DocumentDefinition[]
  specifications?: SpecificationDefinition[]
  checklist_items?: ChecklistItemDefinition[]
}

interface EquipmentSubmissionCreate {
  template_id: string
  name: string
  specifications?: Record<string, unknown>
  documents?: Record<string, unknown>
  checklist_responses?: Record<string, unknown>
  additional_data?: Record<string, unknown>
}

interface ApprovalDecisionCreate {
  decision: 'approve' | 'reject' | 'revision'
  comments?: string
}

export const equipmentTemplatesApi = {
  list: async (): Promise<EquipmentTemplate[]> => {
    const response = await apiClient.get('/equipment-templates')
    return response.data
  },

  get: async (id: string): Promise<EquipmentTemplate> => {
    const response = await apiClient.get(`/equipment-templates/${id}`)
    return response.data
  },

  create: async (data: EquipmentTemplateCreate): Promise<EquipmentTemplate> => {
    const response = await apiClient.post('/equipment-templates', data)
    return response.data
  },

  update: async (id: string, data: Partial<EquipmentTemplateCreate>): Promise<EquipmentTemplate> => {
    const response = await apiClient.put(`/equipment-templates/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/equipment-templates/${id}`)
  },

  listSubmissions: async (projectId: string): Promise<EquipmentSubmission[]> => {
    const response = await apiClient.get(`/projects/${projectId}/equipment-submissions`)
    return response.data
  },

  getSubmission: async (projectId: string, submissionId: string): Promise<EquipmentSubmission> => {
    const response = await apiClient.get(`/projects/${projectId}/equipment-submissions/${submissionId}`)
    return response.data
  },

  createSubmission: async (projectId: string, data: EquipmentSubmissionCreate): Promise<EquipmentSubmission> => {
    const response = await apiClient.post(`/projects/${projectId}/equipment-submissions`, data)
    return response.data
  },

  updateSubmission: async (projectId: string, submissionId: string, data: Partial<EquipmentSubmissionCreate>): Promise<EquipmentSubmission> => {
    const response = await apiClient.put(`/projects/${projectId}/equipment-submissions/${submissionId}`, data)
    return response.data
  },

  deleteSubmission: async (projectId: string, submissionId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/equipment-submissions/${submissionId}`)
  },

  createDecision: async (submissionId: string, data: ApprovalDecisionCreate): Promise<ApprovalDecision> => {
    const response = await apiClient.post(`/equipment-submissions/${submissionId}/decisions`, data)
    return response.data
  },

  listDecisions: async (submissionId: string): Promise<ApprovalDecision[]> => {
    const response = await apiClient.get(`/equipment-submissions/${submissionId}/decisions`)
    return response.data
  },
}
