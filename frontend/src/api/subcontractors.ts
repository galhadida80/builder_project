import { apiClient } from './client'

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
}
