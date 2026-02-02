import { apiClient } from '../api/client'

export interface MetricsData {
  totalProjects: number
  activeInspections: number
  pendingRFIs: number
  approvalRate: number
  equipmentUtilization: number
  budgetStatus: number
  trends: {
    totalProjects: number
    activeInspections: number
    pendingRFIs: number
    approvalRate: number
    equipmentUtilization: number
    budgetStatus: number
  }
}

export interface TrendData {
  date: string
  inspectionsCompleted: number
  rfisSubmitted: number
  approvalsProcessed: number
  equipmentUsage: number
}

export interface DistributionData {
  id: number
  value: number
  label: string
}

export interface AnalyticsParams {
  projectId?: string
  startDate?: string
  endDate?: string
}

export const analyticsService = {
  getMetrics: async (params: AnalyticsParams): Promise<MetricsData> => {
    const { projectId, startDate, endDate } = params
    const endpoint = projectId
      ? `/projects/${projectId}/analytics/metrics`
      : '/analytics/metrics'

    const response = await apiClient.get(endpoint, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })
    return response.data
  },

  getTrends: async (params: AnalyticsParams): Promise<TrendData[]> => {
    const { projectId, startDate, endDate } = params
    const endpoint = projectId
      ? `/projects/${projectId}/analytics/trends`
      : '/analytics/trends'

    const response = await apiClient.get(endpoint, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })
    return response.data
  },

  getDistributions: async (params: AnalyticsParams): Promise<{
    rfiStatus: DistributionData[]
    inspectionTypes: DistributionData[]
    equipmentStatus: DistributionData[]
  }> => {
    const { projectId, startDate, endDate } = params
    const endpoint = projectId
      ? `/projects/${projectId}/analytics/distributions`
      : '/analytics/distributions'

    const response = await apiClient.get(endpoint, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })
    return response.data
  },
}
