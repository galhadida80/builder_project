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

export interface MaterialTemplate {
  id: string
  name: string
  name_he: string
  description?: string | null
  category: string | null
  is_active: boolean
  required_documents: DocumentDefinition[]
  required_specifications: SpecificationDefinition[]
  submission_checklist: ChecklistItemDefinition[]
  created_at: string
  updated_at: string
}

function normalizeDoc(item: string | DocumentDefinition): DocumentDefinition {
  if (typeof item === 'string') {
    return { name: item, name_he: item, source: 'contractor', required: true }
  }
  return item
}

function normalizeSpec(item: string | SpecificationDefinition): SpecificationDefinition {
  if (typeof item === 'string') {
    return { name: item, name_he: item, field_type: 'text', required: true }
  }
  return item
}

function normalizeChecklist(item: string | ChecklistItemDefinition): ChecklistItemDefinition {
  if (typeof item === 'string') {
    return { name: item, name_he: item, requires_file: false }
  }
  return item
}

function normalizeTemplate(t: MaterialTemplate): MaterialTemplate {
  return {
    ...t,
    required_documents: (t.required_documents || []).map(normalizeDoc),
    required_specifications: (t.required_specifications || []).map(normalizeSpec),
    submission_checklist: (t.submission_checklist || []).map(normalizeChecklist),
  }
}

export const materialTemplatesApi = {
  list: async (): Promise<MaterialTemplate[]> => {
    const response = await apiClient.get('/material-templates')
    return (response.data as MaterialTemplate[]).map(normalizeTemplate)
  },

  get: async (id: string): Promise<MaterialTemplate> => {
    const response = await apiClient.get(`/material-templates/${id}`)
    return normalizeTemplate(response.data)
  },
}
