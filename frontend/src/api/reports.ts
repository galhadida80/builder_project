import { apiClient } from './client'

export const reportsApi = {
  getInspectionSummary: async (projectId: string, dateFrom: string, dateTo: string) => {
    const response = await apiClient.get(`/projects/${projectId}/reports/inspection-summary`, {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return response.data
  },

  getApprovalStatus: async (projectId: string, dateFrom: string, dateTo: string) => {
    const response = await apiClient.get(`/projects/${projectId}/reports/approval-status`, {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return response.data
  },

  getRfiAging: async (projectId: string) => {
    const response = await apiClient.get(`/projects/${projectId}/reports/rfi-aging`)
    return response.data
  },

  getExportUrl: (projectId: string, reportType: string, dateFrom?: string, dateTo?: string): string => {
    let url = `/api/v1/projects/${projectId}/reports/export?report_type=${reportType}&format=csv`
    if (dateFrom) url += `&date_from=${dateFrom}`
    if (dateTo) url += `&date_to=${dateTo}`
    return url
  },

  exportCsv: async (projectId: string, reportType: string, dateFrom?: string, dateTo?: string): Promise<Blob> => {
    const response = await apiClient.get(`/projects/${projectId}/reports/export`, {
      params: { report_type: reportType, format: 'csv', date_from: dateFrom, date_to: dateTo },
      responseType: 'blob',
    })
    return response.data
  },

  getComplianceAudit: async (projectId: string, dateFrom: string, dateTo: string) => {
    const response = await apiClient.get(`/projects/${projectId}/reports/compliance-audit`, {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return response.data
  },

  getComplianceAuditExportUrl: (projectId: string, dateFrom: string, dateTo: string): string => {
    return `/api/v1/projects/${projectId}/reports/compliance-audit/export?date_from=${dateFrom}&date_to=${dateTo}&format=csv`
  },

  listTemplates: async (projectId: string): Promise<ReportTemplate[]> => {
    const response = await apiClient.get<ReportTemplate[]>(`/projects/${projectId}/report-templates`)
    return response.data
  },

  createTemplate: async (projectId: string, data: ReportTemplateCreate): Promise<ReportTemplate> => {
    const response = await apiClient.post<ReportTemplate>(`/projects/${projectId}/report-templates`, data)
    return response.data
  },

  deleteTemplate: async (templateId: string): Promise<void> => {
    await apiClient.delete(`/report-templates/${templateId}`)
  },

  listScheduled: async (projectId: string): Promise<ScheduledReport[]> => {
    const response = await apiClient.get<ScheduledReport[]>(`/projects/${projectId}/scheduled-reports`)
    return response.data
  },

  createScheduled: async (projectId: string, data: ScheduledReportCreate): Promise<ScheduledReport> => {
    const response = await apiClient.post<ScheduledReport>(`/projects/${projectId}/scheduled-reports`, data)
    return response.data
  },

  updateScheduled: async (reportId: string, data: Partial<ScheduledReport>): Promise<ScheduledReport> => {
    const response = await apiClient.patch<ScheduledReport>(`/scheduled-reports/${reportId}`, data)
    return response.data
  },

  deleteScheduled: async (reportId: string): Promise<void> => {
    await apiClient.delete(`/scheduled-reports/${reportId}`)
  },
}

export interface ReportTemplate {
  id: string
  projectId: string
  name: string
  description?: string
  reportType: string
  config: Record<string, unknown>
  createdById?: string
  createdBy?: { id: string; fullName: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface ReportTemplateCreate {
  name: string
  description?: string
  reportType: string
  config?: Record<string, unknown>
}

export interface ScheduledReport {
  id: string
  projectId: string
  templateId?: string
  name: string
  reportType: string
  scheduleCron: string
  recipients: string[]
  config: Record<string, unknown>
  isActive: boolean
  lastRunAt?: string
  runCount: number
  createdById?: string
  createdBy?: { id: string; fullName: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface ScheduledReportCreate {
  name: string
  reportType: string
  scheduleCron: string
  templateId?: string
  recipients?: string[]
  config?: Record<string, unknown>
}
