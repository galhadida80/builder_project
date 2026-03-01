import { User } from './index'

// Enums
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed'
export type NearMissSeverity = 'low' | 'medium' | 'high'
export type NearMissStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TrainingStatus = 'valid' | 'expired' | 'expiring_soon'
export type ToolboxTalkStatus = 'scheduled' | 'completed' | 'cancelled'

// Brief types for nested relationships
export interface SafetyContactBrief {
  id: string
  contactName: string
  companyName?: string
  email?: string
  phone?: string
}

export interface SafetyAreaBrief {
  id: string
  name: string
  areaCode?: string
  floorNumber?: number
}

// Safety Incident
export interface SafetyIncident {
  id: string
  projectId: string
  incidentNumber: number
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  occurredAt: string
  location?: string
  areaId?: string
  photos?: string[]
  witnesses?: string[]
  rootCause?: string
  correctiveActions?: string
  reportedById?: string
  createdById: string
  createdAt: string
  updatedAt: string
  area?: SafetyAreaBrief
  reportedBy?: SafetyContactBrief
  createdBy?: User
}

// Near Miss
export interface NearMiss {
  id: string
  projectId: string
  nearMissNumber: number
  title: string
  description: string
  severity: NearMissSeverity
  potentialConsequence?: string
  occurredAt: string
  location?: string
  areaId?: string
  photos?: string[]
  isAnonymous: boolean
  reportedById?: string
  preventiveActions?: string
  status: NearMissStatus
  createdById: string
  createdAt: string
  updatedAt: string
  area?: SafetyAreaBrief
  reportedBy?: SafetyContactBrief
  createdBy?: User
}

// Safety Training
export interface SafetyTraining {
  id: string
  projectId: string
  workerId: string
  trainingType: string
  trainingDate: string
  expiryDate?: string
  status: TrainingStatus
  certificateNumber?: string
  instructor?: string
  notes?: string
  createdById: string
  createdAt: string
  updatedAt: string
  worker?: SafetyContactBrief
  createdBy?: User
}

// Toolbox Talk nested types
export interface KeyPoint {
  id: string
  text: string
}

export interface TalkActionItem {
  id: string
  description: string
  assignedTo?: string
  isCompleted: boolean
}

export interface TalkAttendee {
  id: string
  talkId: string
  workerId?: string
  workerName?: string
  attended: boolean
  signature?: string
  signedAt?: string
}

// Toolbox Talk
export interface ToolboxTalk {
  id: string
  projectId: string
  title: string
  topic: string
  description?: string
  scheduledDate: string
  location?: string
  presenter?: string
  keyPoints?: KeyPoint[]
  actionItems?: TalkActionItem[]
  durationMinutes?: number
  status: ToolboxTalkStatus
  createdAt: string
  createdBy?: User
  attendees: TalkAttendee[]
}

// Near Miss Summary
export interface NearMissSummary {
  total: number
  openCount: number
  inProgressCount: number
  resolvedCount: number
  closedCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  anonymousCount: number
}

// Safety KPI Summary
export interface SafetyKPI {
  // Incidents
  totalIncidents: number
  incidentsBySeverity: Record<string, number>
  incidentsByStatus: Record<string, number>

  // Near Misses
  totalNearMisses: number
  nearMissesBySeverity: Record<string, number>
  anonymousNearMisses: number

  // Training
  totalTrainings: number
  validTrainings: number
  expiredTrainings: number
  expiringSoonTrainings: number
  uniqueTrainedWorkers: number

  // Toolbox Talks
  totalToolboxTalks: number
  completedToolboxTalks: number
  totalTalkAttendees: number
  totalAttended: number
}
