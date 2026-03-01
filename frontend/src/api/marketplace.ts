import { apiClient } from './client'

// Enums and Types
export type TemplateType =
  | 'inspection'
  | 'checklist'
  | 'safety_form'
  | 'quality_control'
  | 'environmental'
  | 'regulatory'

export type ListingStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'archived'

export type TemplateTier = 'free' | 'premium'

// Marketplace Template Interfaces
export interface MarketplaceTemplate {
  id: string
  templateType: TemplateType
  name: string
  nameHe: string
  description: string | null
  descriptionHe: string | null
  category: string
  trade: string | null
  buildingType: string | null
  regulatoryStandard: string | null
  tags: string[]
  templateData: Record<string, unknown>
  version: string
  tier: TemplateTier
  price: number | null
  isOfficial: boolean
  createdById: string | null
  organizationId: string | null
  createdAt: string
  updatedAt: string
}

export interface MarketplaceListing {
  id: string
  templateId: string
  status: ListingStatus
  publishedAt: string | null
  featured: boolean
  installCount: number
  averageRating: number | null
  reviewCount: number
  rejectionReason: string | null
  reviewedById: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TemplateInstallation {
  id: string
  templateId: string
  organizationId: string
  installedById: string
  installedVersion: string
  customName: string | null
  isActive: boolean
  installedAt: string
}

export interface TemplateRating {
  id: string
  templateId: string
  userId: string
  rating: number
  comment: string | null
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    fullName: string
    email: string
  }
}

export interface MarketplaceTemplateWithListing extends MarketplaceTemplate {
  listing: MarketplaceListing | null
}

export interface MarketplaceTemplateDetail extends MarketplaceTemplateWithListing {
  createdBy: {
    id: string
    fullName: string
    email: string
  } | null
  ratings: TemplateRating[]
}

// Request Interfaces
export interface MarketplaceTemplateCreate {
  templateType: TemplateType
  name: string
  nameHe: string
  description?: string
  descriptionHe?: string
  category: string
  trade?: string
  buildingType?: string
  regulatoryStandard?: string
  tags?: string[]
  templateData: Record<string, unknown>
  version?: string
  tier?: TemplateTier
  price?: number
}

export interface MarketplaceTemplateUpdate {
  templateType?: TemplateType
  name?: string
  nameHe?: string
  description?: string
  descriptionHe?: string
  category?: string
  trade?: string
  buildingType?: string
  regulatoryStandard?: string
  tags?: string[]
  templateData?: Record<string, unknown>
  version?: string
  tier?: TemplateTier
  price?: number
}

export interface TemplateInstallationCreate {
  templateId: string
  organizationId: string
  customName?: string
}

export interface TemplateRatingCreate {
  templateId: string
  rating: number
  comment?: string
}

export interface TemplateRatingUpdate {
  rating?: number
  comment?: string
}

export interface TemplateContributionCreate {
  templateType: TemplateType
  name: string
  nameHe: string
  description?: string
  descriptionHe?: string
  category: string
  trade?: string
  buildingType?: string
  regulatoryStandard?: string
  tags?: string[]
  templateData: Record<string, unknown>
  version?: string
  tier?: TemplateTier
  price?: number
  organizationId?: string
}

// Filter Parameters
export interface TemplateSearchParams {
  templateType?: TemplateType
  category?: string
  trade?: string
  buildingType?: string
  regulatoryStandard?: string
  tier?: TemplateTier
  isOfficial?: boolean
  featured?: boolean
  search?: string
}

// API Client
export const marketplaceApi = {
  // Browse and search templates
  searchTemplates: async (params?: TemplateSearchParams): Promise<MarketplaceTemplateWithListing[]> => {
    const response = await apiClient.get('/marketplace/templates', { params })
    return response.data
  },

  // Get template detail
  getTemplate: async (templateId: string): Promise<MarketplaceTemplateDetail> => {
    const response = await apiClient.get(`/marketplace/templates/${templateId}`)
    return response.data
  },

  // Install template to organization
  installTemplate: async (templateId: string, organizationId: string, customName?: string): Promise<TemplateInstallation> => {
    const response = await apiClient.post(`/marketplace/templates/${templateId}/install`, {
      template_id: templateId,
      organization_id: organizationId,
      custom_name: customName,
    })
    return response.data
  },

  // Rating and review operations
  createRating: async (templateId: string, rating: number, comment?: string): Promise<TemplateRating> => {
    const response = await apiClient.post(`/marketplace/templates/${templateId}/ratings`, {
      template_id: templateId,
      rating,
      comment,
    })
    return response.data
  },

  updateRating: async (templateId: string, ratingId: string, data: TemplateRatingUpdate): Promise<TemplateRating> => {
    const response = await apiClient.put(`/marketplace/templates/${templateId}/ratings/${ratingId}`, data)
    return response.data
  },

  deleteRating: async (templateId: string, ratingId: string): Promise<void> => {
    await apiClient.delete(`/marketplace/templates/${templateId}/ratings/${ratingId}`)
  },

  // Contribute a template to the marketplace
  contributeTemplate: async (data: TemplateContributionCreate): Promise<MarketplaceTemplateWithListing> => {
    const response = await apiClient.post('/marketplace/contribute', data)
    return response.data
  },
}
