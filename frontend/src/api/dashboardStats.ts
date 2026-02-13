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
  findingsSeverity: DistributionItem[]
  weeklyActivity: WeeklyActivityPoint[]
  areaProgressByFloor: FloorProgress[]
  overallProgress: number
}

export const dashboardStatsApi = {
  getStats: async (projectId: string): Promise<DashboardStats> => {
    const response = await apiClient.get(`/analytics/projects/${projectId}/dashboard-stats`)
    return response.data
  },
}
