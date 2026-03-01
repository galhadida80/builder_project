import { apiClient } from './client'
import type { Task, ApprovalRequest } from '../types'
import type { PaginatedRFIResponse } from './rfi'
import type { TimelineEvent } from './clientPortal'

export interface SubcontractorProfile {
  id: string
  userId: string
  companyName: string
  trade: string
  licenseNumber?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  insuranceExpiry?: string
  isVerified: boolean
  notes?: string
  certifications: string[]
  user?: { id: string; fullName: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface SubcontractorProfileCreate {
  companyName: string
  trade: string
  licenseNumber?: string
  contactPhone?: string
  contactEmail?: string
  address?: string
  insuranceExpiry?: string
  notes?: string
  certifications?: string[]
}

export interface SubcontractorInviteRequest {
  email: string
  trade: string
  company_name: string
  message?: string
}

export interface SubcontractorInviteResponse {
  id: string
  email: string
  trade: string
  companyName: string
  token: string
  inviteUrl: string
  expiresAt: string
}

export interface SubcontractorPortalData {
  has_profile: boolean
  is_verified: boolean
  role: string | null
  company_name: string | null
  trade: string | null
}

export interface TaskStats {
  total: number
  inProgress: number
  completed: number
  overdue: number
}

export interface RFIStats {
  total: number
  open: number
  waitingResponse: number
  answered: number
}

export interface ApprovalStats {
  total: number
  pending: number
  approved: number
  rejected: number
}

export interface SubcontractorDashboardResponse {
  taskStats: TaskStats
  rfiStats: RFIStats
  approvalStats: ApprovalStats
  upcomingDeadlines: number
}

// Portal-specific interfaces matching backend schemas

export interface PortalProjectSummary {
  id: string
  name: string
  status: string
  address?: string
  startDate?: string
  estimatedEndDate?: string
  daysRemaining?: number
  assignedTasksCount: number
  pendingRfisCount: number
  pendingApprovalsCount: number
}

export interface PortalTaskItem {
  id: string
  projectId: string
  projectName: string
  taskNumber: number
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  startDate?: string
  estimatedHours?: number
  isOverdue: boolean
  createdAt: string
}

export interface PortalRFIItem {
  id: string
  projectId: string
  projectName: string
  rfiNumber: string
  subject: string
  question: string
  category: string
  priority: string
  status: string
  dueDate?: string
  isOverdue: boolean
  responseCount: number
  createdAt: string
  sentAt?: string
}

export interface PortalApprovalItem {
  id: string
  projectId: string
  projectName: string
  entityType: string
  entityId: string
  entityDescription?: string
  currentStatus: string
  stepOrder: number
  createdAt: string
  daysPending: number
}

export interface PortalDocumentItem {
  id: string
  projectId: string
  projectName: string
  filename: string
  fileType?: string
  fileSize?: number
  storagePath: string
  entityType: string
  entityId: string
  uploadedAt: string
  uploadedByName?: string
}

export interface PortalActivityItem {
  id: string
  projectId: string
  projectName: string
  activityType: string
  entityType: string
  entityId: string
  title: string
  description?: string
  actionRequired: boolean
  priority?: string
  createdAt: string
  createdByName?: string
}

export interface PortalStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  overdueTasks: number
  tasksByStatus: Record<string, number>
  totalRfis: number
  pendingRfis: number
  overdueRfis: number
  totalApprovals: number
  pendingApprovals: number
  recentDocuments: number
}

export interface PortalDashboardResponse {
  subcontractorId: string
  companyName: string
  trade: string
  stats: PortalStats
  projects: PortalProjectSummary[]
  pendingTasks: PortalTaskItem[]
  pendingRfis: PortalRFIItem[]
  pendingApprovals: PortalApprovalItem[]
  recentActivity: PortalActivityItem[]
  recentDocuments: PortalDocumentItem[]
  lastUpdated: string
}

export const subcontractorsApi = {
  list: async (projectId: string, trade?: string, verifiedOnly?: boolean): Promise<SubcontractorProfile[]> => {
    const response = await apiClient.get<SubcontractorProfile[]>(
      `/projects/${projectId}/subcontractors`,
      { params: { trade, verified_only: verifiedOnly } }
    )
    return response.data
  },

  getMyProfile: async (): Promise<SubcontractorProfile> => {
    const response = await apiClient.get<SubcontractorProfile>('/subcontractors/me')
    return response.data
  },

  createMyProfile: async (data: SubcontractorProfileCreate): Promise<SubcontractorProfile> => {
    const response = await apiClient.post<SubcontractorProfile>('/subcontractors/me', data)
    return response.data
  },

  updateMyProfile: async (data: Partial<SubcontractorProfileCreate>): Promise<SubcontractorProfile> => {
    const response = await apiClient.patch<SubcontractorProfile>('/subcontractors/me', data)
    return response.data
  },

  toggleVerify: async (profileId: string): Promise<SubcontractorProfile> => {
    const response = await apiClient.patch<SubcontractorProfile>(`/subcontractors/${profileId}/verify`)
    return response.data
  },

  invite: async (projectId: string, data: SubcontractorInviteRequest): Promise<SubcontractorInviteResponse> => {
    const response = await apiClient.post<SubcontractorInviteResponse>(
      `/projects/${projectId}/subcontractors/invite`,
      data
    )
    return response.data
  },

  getPortalData: async (projectId: string): Promise<SubcontractorPortalData> => {
    const response = await apiClient.get<SubcontractorPortalData>(
      `/projects/${projectId}/subcontractors/portal`
    )
    return response.data
  },

  getMyTasks: async (status?: string, priority?: string): Promise<Task[]> => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (priority) params.append('priority', priority)
    const url = `/subcontractors/my-tasks${params.toString() ? `?${params}` : ''}`
    const response = await apiClient.get<Task[]>(url)
    return response.data
  },

  getMyRFIs: async (
    status?: string,
    priority?: string,
    search?: string,
    page?: number,
    pageSize?: number
  ): Promise<PaginatedRFIResponse> => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (priority) params.append('priority', priority)
    if (search) params.append('search', search)
    if (page) params.append('page', page.toString())
    if (pageSize) params.append('page_size', pageSize.toString())
    const url = `/subcontractors/my-rfis${params.toString() ? `?${params}` : ''}`
    const response = await apiClient.get<PaginatedRFIResponse>(url)
    return response.data
  },

  getMyApprovals: async (): Promise<ApprovalRequest[]> => {
    const response = await apiClient.get<ApprovalRequest[]>('/subcontractors/my-approvals')
    return response.data
  },

  getActivityFeed: async (limit?: number): Promise<TimelineEvent[]> => {
    const params = limit ? `?limit=${limit}` : ''
    const response = await apiClient.get<TimelineEvent[]>(`/subcontractors/activity-feed${params}`)
    return response.data
  },

  getDashboard: async (): Promise<SubcontractorDashboardResponse> => {
    const response = await apiClient.get<SubcontractorDashboardResponse>('/subcontractors/dashboard')
    return response.data
  },
}
