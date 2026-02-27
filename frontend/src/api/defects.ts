import { apiClient } from './client'
import type { Defect, DefectSummary } from '../types'
import type { PaginatedResponse } from './types'

export interface DefectCreateData {
  description: string
  category: string
  defect_type?: string
  area_id?: string
  severity: string
  is_repeated?: boolean
  due_date?: string
  reporter_id?: string
  assigned_contact_id?: string
  followup_contact_id?: string
  assignee_ids?: string[]
}

export interface DefectUpdateData {
  description?: string
  category?: string
  defect_type?: string
  area_id?: string
  status?: string
  severity?: string
  is_repeated?: boolean
  due_date?: string
  reporter_id?: string
  assigned_contact_id?: string
  followup_contact_id?: string
}

export interface DefectListParams {
  status?: string
  category?: string
  severity?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface DefectAnalysisResult {
  category: string
  severity: string
  description: string
}

export interface DefectAnalysisItem {
  category: string
  severity: string
  description: string
  confidence: number
}

export interface MultiDefectAnalysisResult {
  defects: DefectAnalysisItem[]
  processingTimeMs: number
}

export const defectsApi = {
  list: async (projectId: string, params?: DefectListParams): Promise<PaginatedResponse<Defect>> => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set('status', params.status)
    if (params?.category) qs.set('category', params.category)
    if (params?.severity) qs.set('severity', params.severity)
    if (params?.search) qs.set('search', params.search)
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('page_size', String(params.pageSize))
    const query = qs.toString()
    const response = await apiClient.get(`/projects/${projectId}/defects${query ? `?${query}` : ''}`)
    return response.data
  },

  get: async (projectId: string, defectId: string): Promise<Defect> => {
    const response = await apiClient.get(`/projects/${projectId}/defects/${defectId}`)
    return response.data
  },

  create: async (projectId: string, data: DefectCreateData): Promise<Defect> => {
    const response = await apiClient.post(`/projects/${projectId}/defects`, data)
    return response.data
  },

  update: async (projectId: string, defectId: string, data: DefectUpdateData): Promise<Defect> => {
    const response = await apiClient.put(`/projects/${projectId}/defects/${defectId}`, data)
    return response.data
  },

  delete: async (projectId: string, defectId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/defects/${defectId}`)
  },

  getSummary: async (projectId: string): Promise<DefectSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/defects/summary`)
    return response.data
  },

  addAssignee: async (projectId: string, defectId: string, contactId: string): Promise<Defect> => {
    const response = await apiClient.post(`/projects/${projectId}/defects/${defectId}/assignees?contact_id=${contactId}`)
    return response.data
  },

  removeAssignee: async (projectId: string, defectId: string, contactId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/defects/${defectId}/assignees/${contactId}`)
  },

  analyzeImage: async (projectId: string, file: File, language: string = 'en'): Promise<MultiDefectAnalysisResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(
      `/projects/${projectId}/defects/analyze-image?language=${language}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    )
    return response.data
  },

  exportPdf: async (projectId: string, filters?: { status?: string; category?: string; severity?: string }): Promise<void> => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.category) params.set('category', filters.category)
    if (filters?.severity) params.set('severity', filters.severity)
    const qs = params.toString()
    const response = await apiClient.get(`/projects/${projectId}/defects/export-pdf${qs ? `?${qs}` : ''}`, {
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `defects_report_${new Date().toISOString().slice(0, 10)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}
