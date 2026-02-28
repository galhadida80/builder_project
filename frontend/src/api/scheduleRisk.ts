import { apiClient } from './client'
import type {
  ScheduleRiskAnalysis,
  WhatIfScenarioRequest,
  WhatIfScenarioResponse,
  CriticalPathResponse,
  ProjectRiskSummary,
} from '../types/scheduleRisk'

export const scheduleRiskApi = {
  getProjectRiskSummary: async (projectId: string): Promise<ProjectRiskSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/schedule-risk`)
    return response.data
  },

  getTaskRisk: async (projectId: string, taskId: string): Promise<ScheduleRiskAnalysis> => {
    const response = await apiClient.get(`/projects/${projectId}/tasks/${taskId}/risk`)
    return response.data
  },

  getCriticalPath: async (projectId: string): Promise<CriticalPathResponse> => {
    const response = await apiClient.get(`/projects/${projectId}/critical-path`)
    return response.data
  },

  runWhatIfScenario: async (
    projectId: string,
    scenario: WhatIfScenarioRequest
  ): Promise<WhatIfScenarioResponse> => {
    const response = await apiClient.post(`/projects/${projectId}/schedule-risk/what-if`, scenario)
    return response.data
  },
}
