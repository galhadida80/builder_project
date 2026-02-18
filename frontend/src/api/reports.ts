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

  getComplianceAudit: async (projectId: string, dateFrom: string, dateTo: string) => {
    const response = await apiClient.get(`/projects/${projectId}/reports/compliance-audit`, {
      params: { date_from: dateFrom, date_to: dateTo },
    })
    return response.data
  },

  getComplianceAuditExportUrl: (projectId: string, dateFrom: string, dateTo: string): string => {
    return `/api/v1/projects/${projectId}/reports/compliance-audit/export?date_from=${dateFrom}&date_to=${dateTo}&format=csv`
  },
}
