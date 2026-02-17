import { apiClient } from './client'

export const analyticsApi = {
  getTrends: async (entityType: string, projectId?: string, days?: number): Promise<any> => {
    const params = new URLSearchParams()
    params.set('entity_type', entityType)
    if (projectId) params.set('project_id', projectId)
    if (days) params.set('days', String(days))
    const response = await apiClient.get(`/analytics/trends?${params.toString()}`)
    return response.data
  },
  getBenchmarks: async (): Promise<any> => {
    const response = await apiClient.get('/analytics/benchmarks')
    return response.data
  },
  listKpis: async (projectId?: string): Promise<any[]> => {
    const qs = projectId ? `?project_id=${projectId}` : ''
    const response = await apiClient.get(`/analytics/kpi-definitions${qs}`)
    return response.data
  },
  createKpi: async (data: any): Promise<any> => {
    const response = await apiClient.post('/analytics/kpi-definitions', data)
    return response.data
  },
  updateKpi: async (kpiId: string, data: any): Promise<any> => {
    const response = await apiClient.put(`/analytics/kpi-definitions/${kpiId}`, data)
    return response.data
  },
  deleteKpi: async (kpiId: string): Promise<void> => {
    await apiClient.delete(`/analytics/kpi-definitions/${kpiId}`)
  },
  getKpiValues: async (projectId?: string): Promise<any[]> => {
    const qs = projectId ? `?project_id=${projectId}` : ''
    const response = await apiClient.get(`/analytics/kpi-values${qs}`)
    return response.data
  },
  exportCsv: async (entityType: string, projectId?: string): Promise<void> => {
    const params = new URLSearchParams()
    params.set('entity_type', entityType)
    if (projectId) params.set('project_id', projectId)
    const response = await apiClient.get(`/analytics/export?${params.toString()}`, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entityType}_export.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}
