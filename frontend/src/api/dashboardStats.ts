import { apiClient } from './client'

export interface DistributionItem {
  label: string
  value: number
}

export interface WeeklyActivityPoint {
  date: string
  equipment: number
  materials: number
  inspections: number
  rfis: number
}

export interface FloorProgress {
  floor: number
  areaCount: number
  avgProgress: number
}

export interface DashboardStats {
  equipmentDistribution: DistributionItem[]
  materialDistribution: DistributionItem[]
  rfiDistribution: DistributionItem[]
  approvalDistribution: DistributionItem[]
  findingsSeverity: DistributionItem[]
  weeklyActivity: WeeklyActivityPoint[]
  areaProgressByFloor: FloorProgress[]
  overallProgress: number
}

export const dashboardStatsApi = {
  getStats: async (projectId: string, dateFrom?: string, dateTo?: string): Promise<DashboardStats> => {
    const params = new URLSearchParams()
    if (dateFrom) params.append('date_from', dateFrom)
    if (dateTo) params.append('date_to', dateTo)
    const query = params.toString() ? `?${params.toString()}` : ''
    const response = await apiClient.get(`/analytics/projects/${projectId}/dashboard-stats${query}`)
    return response.data
  },
}
