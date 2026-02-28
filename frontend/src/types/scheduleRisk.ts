export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface MitigationSuggestion {
  id: string
  title: string
  description: string
  priority: string
  estimatedImpact?: string
}

export interface ScheduleRiskAnalysis {
  id: string
  projectId: string
  taskId?: string
  confidenceScore: number
  predictedDelayDays?: number
  riskLevel: RiskLevel
  factors?: Record<string, unknown>
  mitigationSuggestions?: Record<string, unknown>
  analyzedAt: string
  createdAt: string
  updatedAt: string
}

export interface WhatIfScenarioRequest {
  taskId: string
  delayDays: number
}

export interface AffectedTask {
  taskId: string
  taskTitle: string
  originalDueDate?: string
  newDueDate?: string
  delayImpactDays: number
}

export interface WhatIfScenarioResponse {
  scenarioTaskId: string
  scenarioDelayDays: number
  affectedTasks: AffectedTask[]
  originalProjectEndDate?: string
  newProjectEndDate?: string
  totalProjectDelayDays: number
}

export interface CriticalPathTask {
  taskId: string
  taskTitle: string
  startDate?: string
  dueDate?: string
  durationDays: number
  slackDays: number
}

export interface CriticalPathResponse {
  projectId: string
  criticalPathTasks: CriticalPathTask[]
  totalDurationDays: number
  projectStartDate?: string
  projectEndDate?: string
}

export interface ProjectRiskSummary {
  projectId: string
  overallConfidenceScore: number
  totalTasks: number
  atRiskTasks: number
  criticalPathLength: number
  lastAnalyzedAt?: string
  topRisks: ScheduleRiskAnalysis[]
}
