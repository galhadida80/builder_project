import { apiClient } from './client'
import type {
  RiskScore,
  RiskScoreSummary,
  RiskScoreCreate,
  RiskScoreUpdate,
  RiskThreshold,
  RiskThresholdCreate,
  RiskLevel,
  InspectionRiskBriefing,
} from '../types/riskScore'

export interface RiskScoreListParams {
  areaId?: string
  riskLevel?: RiskLevel
}

export const riskScoresApi = {
  list: async (projectId: string, params?: RiskScoreListParams): Promise<RiskScore[]> => {
    const qs = new URLSearchParams()
    if (params?.areaId) qs.set('area_id', params.areaId)
    if (params?.riskLevel) qs.set('risk_level', params.riskLevel)
    const query = qs.toString()
    const response = await apiClient.get(`/projects/${projectId}/risk-scores${query ? `?${query}` : ''}`)
    return response.data
  },

  getSummary: async (projectId: string): Promise<RiskScoreSummary> => {
    const response = await apiClient.get(`/projects/${projectId}/risk-scores/summary`)
    return response.data
  },

  get: async (projectId: string, riskScoreId: string): Promise<RiskScore> => {
    const response = await apiClient.get(`/projects/${projectId}/risk-scores/${riskScoreId}`)
    return response.data
  },

  create: async (projectId: string, data: RiskScoreCreate): Promise<RiskScore> => {
    const response = await apiClient.post(`/projects/${projectId}/risk-scores`, data)
    return response.data
  },

  update: async (projectId: string, riskScoreId: string, data: RiskScoreUpdate): Promise<RiskScore> => {
    const response = await apiClient.put(`/projects/${projectId}/risk-scores/${riskScoreId}`, data)
    return response.data
  },

  delete: async (projectId: string, riskScoreId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/risk-scores/${riskScoreId}`)
  },

  getThreshold: async (projectId: string): Promise<RiskThreshold> => {
    const response = await apiClient.get(`/projects/${projectId}/risk-thresholds`)
    return response.data
  },

  createOrUpdateThreshold: async (projectId: string, data: RiskThresholdCreate): Promise<RiskThreshold> => {
    const response = await apiClient.post(`/projects/${projectId}/risk-thresholds`, data)
    return response.data
  },

  getInspectionBriefing: async (inspectionId: string): Promise<InspectionRiskBriefing> => {
    const response = await apiClient.get(`/inspections/${inspectionId}/risk-briefing`)
    return response.data
  },
}
