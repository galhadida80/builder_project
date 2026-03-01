import { apiClient } from './client'
import type { Vendor, VendorPerformance } from '../types'

interface VendorCreate {
  company_name: string
  trade: string
  contact_email?: string
  contact_phone?: string
  address?: string
  license_number?: string
  insurance_expiry?: string
  is_verified?: boolean
  rating?: number
  certifications?: string[]
  notes?: string
}

interface VendorUpdate {
  company_name?: string
  trade?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  license_number?: string
  insurance_expiry?: string
  is_verified?: boolean
  rating?: number
  certifications?: string[]
  notes?: string
}

interface VendorPerformanceCreate {
  project_id: string
  delivery_score?: number
  quality_score?: number
  price_score?: number
  notes?: string
}

export interface VendorImportResult {
  importedCount: number
  skippedCount: number
  errors: string[]
}

export interface VendorSearchParams {
  trade?: string
  rating_min?: number
  insurance_expiring?: boolean
}

export const vendorsApi = {
  list: async (params?: VendorSearchParams): Promise<Vendor[]> => {
    const response = await apiClient.get('/vendors', { params })
    return response.data
  },

  get: async (id: string): Promise<Vendor> => {
    const response = await apiClient.get(`/vendors/${id}`)
    return response.data
  },

  create: async (data: VendorCreate): Promise<Vendor> => {
    const response = await apiClient.post('/vendors', data)
    return response.data
  },

  update: async (id: string, data: VendorUpdate): Promise<Vendor> => {
    const response = await apiClient.put(`/vendors/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vendors/${id}`)
  },

  importCsv: async (file: File): Promise<VendorImportResult> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post('/vendors/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  exportCsv: async (): Promise<Blob> => {
    const response = await apiClient.get('/vendors/export', {
      responseType: 'blob',
    })
    return response.data
  },

  getByTrade: async (trade: string): Promise<Vendor[]> => {
    const response = await apiClient.get('/vendors', { params: { trade } })
    return response.data
  },

  getExpiringInsurances: async (days: number = 30): Promise<Vendor[]> => {
    const response = await apiClient.get('/vendors/expiring-insurances', { params: { days } })
    return response.data
  },

  addPerformanceRecord: async (vendorId: string, data: VendorPerformanceCreate): Promise<VendorPerformance> => {
    const response = await apiClient.post(`/vendors/${vendorId}/performances`, data)
    return response.data
  },

  getVendorAnalytics: async (vendorId: string) => {
    const response = await apiClient.get(`/vendors/${vendorId}/analytics`)
    return response.data
  },

  getAllVendorsAnalytics: async () => {
    const response = await apiClient.get('/vendors/analytics/all')
    return response.data
  },
}
