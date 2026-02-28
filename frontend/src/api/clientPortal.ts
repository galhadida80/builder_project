import { apiClient } from './client'

export interface ClientPortalAccess {
  id: string
  userId: string
  projectId: string
  isActive: boolean
  canViewBudget: boolean
  canViewDocuments: boolean
  canSubmitFeedback: boolean
  lastAccessedAt?: string
  createdAt: string
}

export interface ClientPortalAuthRequest {
  email: string
  accessToken: string
}

export interface ClientPortalAuthResponse {
  accessToken: string
  tokenType: string
  userEmail: string
  userFullName?: string
  projectId: string
  projectName: string
  canViewBudget: boolean
  canViewDocuments: boolean
  canSubmitFeedback: boolean
}

export interface ClientPortalProject {
  id: string
  name: string
  description?: string
  address?: string
  startDate?: string
  estimatedEndDate?: string
  status: string
  website?: string
  imageUrl?: string
  locationLat?: number
  locationLng?: number
  locationAddress?: string
  daysRemaining?: number
  budgetVisibleToClients: boolean
  milestoneTrackingEnabled: boolean
}

export interface ClientPortalProgress {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  completionPercentage: number
  totalMilestones: number
  completedMilestones: number
  upcomingMilestones: number
  onTrack: boolean
  lastUpdated: string
}

export interface ClientPortalBudgetSummary {
  totalBudgeted: string
  totalActual: string
  totalVariance: string
  variancePercentage: number
  approvedChangeOrders: number
  totalChangeOrderAmount: string
}

export interface ClientPortalPhoto {
  id: string
  filename: string
  fileType?: string
  fileSize?: number
  storagePath: string
  uploadedAt: string
  entityType: string
  entityId: string
  areaName?: string
  floorNumber?: number
}

export interface ClientPortalDocument {
  id: string
  filename: string
  fileType?: string
  fileSize?: number
  storagePath: string
  uploadedAt: string
  entityType: string
  category?: string
}

export interface ClientPortalFeedbackCreate {
  subject: string
  content: string
  entityType?: string
  entityId?: string
}

export interface ClientPortalFeedback {
  id: string
  subject: string
  content: string
  entityType: string
  entityId: string
  submittedBy: string
  submittedAt: string
  status: string
}

export interface ClientPortalMilestone {
  id: string
  title: string
  description?: string
  targetDate?: string
  completedAt?: string
  status: string
  completionPercentage: number
  isOverdue: boolean
}

export interface TimelineEvent {
  id: string
  date: string
  title: string
  description?: string
  eventType: string
  entityId?: string
  entityType?: string
  userName?: string
  metadata?: Record<string, unknown>
}

export interface ProgressMetrics {
  overallPercentage: number
  inspectionsCompleted: number
  inspectionsTotal: number
  equipmentSubmitted: number
  equipmentTotal: number
  materialsSubmitted: number
  materialsTotal: number
  checklistsCompleted: number
  checklistsTotal: number
}

export interface TeamStats {
  totalMembers: number
  activeMembers: number
  roles: Record<string, number>
}

export interface ProjectStats {
  totalInspections: number
  pendingInspections: number
  totalEquipment: number
  totalMaterials: number
  totalMeetings: number
  openFindings: number
  daysRemaining?: number
  daysElapsed?: number
}

export interface ProjectOverview {
  projectId: string
  projectName: string
  projectStatus: string
  progress: ProgressMetrics
  timeline: TimelineEvent[]
  teamStats: TeamStats
  stats: ProjectStats
  lastUpdated: string
  locationLat?: number
  locationLng?: number
  locationAddress?: string
}

export interface ProjectMember {
  id: string
  userId: string
  user: {
    id: string
    email: string
    fullName: string
    isActive: boolean
  }
  role: string
  addedAt: string
}

export interface Project {
  id: string
  name: string
  description?: string
  address?: string
  startDate?: string
  estimatedEndDate?: string
  status: string
  dailySummaryEnabled: boolean
  notificationDigestIntervalHours: number
  lastDigestSentAt?: string
  createdAt: string
  updatedAt: string
  members: ProjectMember[]
  website?: string
  imageUrl?: string
  locationLat?: number
  locationLng?: number
  locationAddress?: string
  daysRemaining?: number
}

export interface FileResponse {
  id: string
  projectId: string
  entityType: string
  entityId: string
  filename: string
  fileType?: string
  fileSize?: number
  storagePath: string
  uploadedAt: string
  uploadedBy?: {
    id: string
    email: string
    fullName: string
    isActive: boolean
  }
}

export interface DiscussionAuthor {
  id: string
  fullName: string
  email: string
}

export interface Discussion {
  id: string
  projectId: string
  entityType: string
  entityId: string
  authorId: string
  parentId?: string
  content: string
  createdAt: string
  updatedAt: string
  author?: DiscussionAuthor
  replies: Discussion[]
}

export interface DiscussionCreate {
  entityType: string
  entityId: string
  content: string
  parentId?: string
}

export const clientPortalApi = {
  authenticate: async (data: ClientPortalAuthRequest): Promise<ClientPortalAuthResponse> => {
    const response = await apiClient.post<ClientPortalAuthResponse>('/client-portal/auth', {
      email: data.email,
      access_token: data.accessToken
    })
    return response.data
  },

  healthCheck: async (): Promise<{ status: string; service: string }> => {
    const response = await apiClient.get<{ status: string; service: string }>('/client-portal/health')
    return response.data
  },

  listProjects: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/client-portal/projects')
    return response.data
  },

  getProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/client-portal/projects/${projectId}`)
    return response.data
  },

  getProjectOverview: async (projectId: string): Promise<ProjectOverview> => {
    const response = await apiClient.get<ProjectOverview>(`/client-portal/projects/${projectId}/overview`)
    return response.data
  },

  getProjectProgress: async (projectId: string): Promise<ProgressMetrics> => {
    const response = await apiClient.get<ProgressMetrics>(`/client-portal/projects/${projectId}/progress`)
    return response.data
  },

  listPhotos: async (projectId: string, limit = 50, offset = 0): Promise<FileResponse[]> => {
    const response = await apiClient.get<FileResponse[]>(
      `/client-portal/projects/${projectId}/photos`,
      { params: { limit, offset } }
    )
    return response.data
  },

  listDocuments: async (
    projectId: string,
    entityType?: string,
    limit = 50,
    offset = 0
  ): Promise<FileResponse[]> => {
    const response = await apiClient.get<FileResponse[]>(
      `/client-portal/projects/${projectId}/documents`,
      { params: { entity_type: entityType, limit, offset } }
    )
    return response.data
  },

  listFeedback: async (projectId: string): Promise<Discussion[]> => {
    const response = await apiClient.get<Discussion[]>(`/client-portal/projects/${projectId}/feedback`)
    return response.data
  },

  createFeedback: async (projectId: string, data: DiscussionCreate): Promise<Discussion> => {
    const response = await apiClient.post<Discussion>(
      `/client-portal/projects/${projectId}/feedback`,
      data
    )
    return response.data
  },
}
