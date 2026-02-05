import { apiClient } from '../api/client'

// Backend response types (snake_case as returned by FastAPI)
interface MetricsBackendResponse {
  total_projects: number
  active_projects: number
  total_inspections: number
  pending_inspections: number
  completed_inspections: number
  total_equipment: number
  approved_equipment: number
  total_materials: number
  approved_materials: number
  total_meetings: number
  approval_rate: number
}

interface TrendDataPointBackend {
  date: string
  inspections: number
  equipment_submissions: number
  material_submissions: number
}

interface ProjectTrendsBackendResponse {
  data_points: TrendDataPointBackend[]
}

interface DistributionItemBackend {
  label: string
  value: number
}

interface DistributionsBackendResponse {
  inspection_status: DistributionItemBackend[]
  equipment_status: DistributionItemBackend[]
  material_status: DistributionItemBackend[]
  project_status: DistributionItemBackend[]
}

// Frontend types (camelCase for application use)
export interface MetricsData {
  totalProjects: number
  activeInspections: number
  pendingRFIs: number
  approvalRate: number
  equipmentUtilization: number
  budgetStatus: number
  trends?: {
    totalProjects?: number
    activeInspections?: number
    pendingRFIs?: number
    approvalRate?: number
    equipmentUtilization?: number
    budgetStatus?: number
  }
}

export interface TrendData {
  date: string
  inspectionsCompleted: number
  rfisSubmitted: number
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

    const response = await apiClient.get<MetricsBackendResponse>(endpoint, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })

    // Transform backend response to frontend format
    const data = response.data
    return {
      totalProjects: data.total_projects,
      activeInspections: data.pending_inspections,
      pendingRFIs: data.total_materials - data.approved_materials,
      approvalRate: data.approval_rate,
      equipmentUtilization: data.total_equipment > 0 ? Math.round((data.approved_equipment / data.total_equipment) * 100) : 0,
      budgetStatus: 0,
    }
  },

  getTrends: async (params: AnalyticsParams): Promise<TrendData[]> => {
    const { projectId, startDate, endDate } = params
    const endpoint = projectId
      ? `/projects/${projectId}/analytics/project-trends`
      : '/analytics/project-trends'

    const response = await apiClient.get<ProjectTrendsBackendResponse>(endpoint, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })

    // Transform backend response to frontend format
    return response.data.data_points.map(point => ({
      date: point.date,
      inspectionsCompleted: point.inspections,
      rfisSubmitted: point.material_submissions, // Using material submissions as proxy for RFIs
    }))
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

    const response = await apiClient.get<DistributionsBackendResponse>(endpoint, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    })

    // Transform backend response to frontend format
    const data = response.data
    return {
      rfiStatus: data.material_status.map((item, index) => ({
        id: index,
        label: item.label,
        value: item.value,
      })),
      inspectionTypes: data.inspection_status.map((item, index) => ({
        id: index,
        label: item.label,
        value: item.value,
      })),
      equipmentStatus: data.equipment_status.map((item, index) => ({
        id: index,
        label: item.label,
        value: item.value,
      })),
    }
  },
}
