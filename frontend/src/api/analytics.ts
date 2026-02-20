import { apiClient } from './client'
import type { CustomKpiDefinition, KpiValue, KpiSnapshot } from '../types'

interface TrendAnalysisResponse {
  entityType: string
  period: string
  dataPoints: { date: string; count: number }[]
}

interface BenchmarkResponse {
  projects: { projectId: string; projectName: string; metrics: Record<string, number> }[]
}

export const analyticsApi = {
  getTrends: async (entityType: string, projectId?: string, days?: number): Promise<TrendAnalysisResponse> => {
    const params = new URLSearchParams()
    params.set('entity_type', entityType)
    if (projectId) params.set('project_id', projectId)
    if (days) params.set('days', String(days))
    const response = await apiClient.get(`/analytics/trends?${params.toString()}`)
    return response.data
  },
  getBenchmarks: async (): Promise<BenchmarkResponse> => {
    const response = await apiClient.get('/analytics/benchmarks')
    return response.data
  },
  listKpis: async (projectId?: string): Promise<CustomKpiDefinition[]> => {
    const qs = projectId ? `?project_id=${projectId}` : ''
    const response = await apiClient.get(`/analytics/kpi-definitions${qs}`)
    return response.data
  },
  createKpi: async (data: Record<string, unknown>): Promise<CustomKpiDefinition> => {
    const response = await apiClient.post('/analytics/kpi-definitions', data)
    return response.data
  },
  updateKpi: async (kpiId: string, data: Record<string, unknown>): Promise<CustomKpiDefinition> => {
    const response = await apiClient.put(`/analytics/kpi-definitions/${kpiId}`, data)
    return response.data
  },
  deleteKpi: async (kpiId: string): Promise<void> => {
    await apiClient.delete(`/analytics/kpi-definitions/${kpiId}`)
  },
  getKpiValues: async (projectId?: string): Promise<KpiValue[]> => {
    const qs = projectId ? `?project_id=${projectId}` : ''
    const response = await apiClient.get(`/analytics/kpi-values${qs}`)
    return response.data
  },
  getKpiHistory: async (kpiId: string, days?: number): Promise<KpiSnapshot[]> => {
    const qs = days ? `?days=${days}` : ''
    const response = await apiClient.get(`/analytics/kpi-definitions/${kpiId}/history${qs}`)
    return response.data
  },
  recordSnapshots: async (projectId: string): Promise<{ recorded: number }> => {
    const response = await apiClient.post(`/analytics/kpi-snapshots/record?project_id=${projectId}`)
    return response.data
  },
  exportCsv: async (entityType: string, projectId?: string): Promise<void> => {
    const params = new URLSearchParams()
    params.set('entity_type', entityType)
    if (projectId) params.set('project_id', projectId)
    const response = await apiClient.get(`/analytics/export?${params.toString()}`, { responseType: 'blob' })
    const blob = new Blob([response.data], { type: 'text/csv' })
    let url: string | null = null
    try {
      url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${entityType}_export.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      if (url) window.URL.revokeObjectURL(url)
    }
  },
}
