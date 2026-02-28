import type { User } from './index'

// Risk level enum
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// Brief area information for risk scores
export interface RiskScoreAreaBrief {
  id: string
  name: string
  areaCode?: string
  floorNumber?: number
}

// Main risk score interface (matches RiskScoreResponse from backend)
export interface RiskScore {
  id: string
  projectId: string
  areaId?: string
  riskScore: number
  riskLevel: RiskLevel
  defectCount: number
  severityScore: number
  predictedDefectTypes: string[]
  contributingFactors: Record<string, unknown>
  calculationMetadata: Record<string, unknown>
  notes?: string
  calculatedAt: string
  validUntil?: string
  calculatedById?: string
  createdAt: string
  updatedAt: string
  area?: RiskScoreAreaBrief
  calculatedBy?: User
}

// Risk score summary (matches RiskScoreSummaryResponse from backend)
export interface RiskScoreSummary {
  totalAreas: number
  lowRiskCount: number
  mediumRiskCount: number
  highRiskCount: number
  criticalRiskCount: number
  averageRiskScore: number
  highestRiskArea?: RiskScoreAreaBrief
  byFloor: Record<string, number>
}

// Predicted defect type
export interface PredictedDefectType {
  category: string
  probability: number
  historicalCount: number
}

// Risk factor item
export interface RiskFactorItem {
  factor: string
  weight: number
  description: string
}

// Risk analysis response (matches RiskAnalysisResponse from backend)
export interface RiskAnalysis {
  areaId: string
  areaName: string
  riskScore: number
  riskLevel: RiskLevel
  predictedDefects: PredictedDefectType[]
  riskFactors: RiskFactorItem[]
  recommendation: string
}

// Risk threshold configuration (matches RiskThresholdResponse from backend)
export interface RiskThreshold {
  id: string
  projectId: string
  lowThreshold: number
  mediumThreshold: number
  highThreshold: number
  criticalThreshold: number
  autoScheduleInspections: boolean
  autoScheduleThreshold: RiskLevel
  createdAt: string
  updatedAt: string
  createdById?: string
}

// Create/Update schemas for frontend forms
export interface RiskScoreCreate {
  areaId?: string
  riskScore: number
  riskLevel: RiskLevel
  defectCount?: number
  severityScore?: number
  predictedDefectTypes?: string[]
  contributingFactors?: Record<string, unknown>
  calculationMetadata?: Record<string, unknown>
  notes?: string
  validUntil?: string
  calculatedById?: string
}

export interface RiskScoreUpdate {
  areaId?: string
  riskScore?: number
  riskLevel?: RiskLevel
  defectCount?: number
  severityScore?: number
  predictedDefectTypes?: string[]
  contributingFactors?: Record<string, unknown>
  calculationMetadata?: Record<string, unknown>
  notes?: string
  validUntil?: string
}

export interface RiskThresholdCreate {
  lowThreshold?: number
  mediumThreshold?: number
  highThreshold?: number
  criticalThreshold?: number
  autoScheduleInspections?: boolean
  autoScheduleThreshold?: RiskLevel
}

export interface RiskThresholdUpdate {
  lowThreshold?: number
  mediumThreshold?: number
  highThreshold?: number
  criticalThreshold?: number
  autoScheduleInspections?: boolean
  autoScheduleThreshold?: RiskLevel
}

// Trend analysis types
export interface DefectTrendByTrade {
  category: string
  count: number
  severityDistribution: Record<string, number>
  averageSeverity: number
}

export interface DefectTrendByFloor {
  floorNumber: number
  count: number
  severityDistribution: Record<string, number>
  averageSeverity: number
}

export interface DefectTrendByPhase {
  phase: string
  periodStart: string
  periodEnd: string
  count: number
  severityDistribution: Record<string, number>
  averageSeverity: number
}

export interface DefectTrendBySeason {
  season: string
  count: number
  severityDistribution: Record<string, number>
  averageSeverity: number
}

export interface DefectTrendAnalysis {
  byTrade: DefectTrendByTrade[]
  byFloor: DefectTrendByFloor[]
  byPhase: DefectTrendByPhase[]
  bySeason: DefectTrendBySeason[]
}

// High-risk area for pre-inspection briefing
export interface HighRiskArea {
  areaId: string
  areaName: string
  areaCode?: string
  floorNumber?: number
  riskScore: number
  riskLevel: RiskLevel
  predictedDefectTypes: string[]
  defectCount: number
}

// Pre-inspection briefing response
export interface InspectionRiskBriefing {
  inspectionId: string
  projectId: string
  highRiskAreas: HighRiskArea[]
  overallRiskLevel: RiskLevel
  totalAreasAnalyzed: number
  recommendations: string[]
  generatedAt: string
}
