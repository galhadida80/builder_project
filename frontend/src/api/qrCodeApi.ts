import { apiClient } from './client'
import type { PaginatedResponse } from './types'

export interface QRCodeGenerateRequest {
  entityType: string
  entityId: string
  format?: 'png' | 'svg'
  size?: number
}

export interface QRCodeResponse {
  entityType: string
  entityId: string
  qrCodeData: string
  format: string
  size: number
}

export interface ScanHistoryCreate {
  entityType: string
  entityId: string
}

export interface ScanHistoryResponse {
  id: string
  projectId: string
  userId: string
  entityType: string
  entityId: string
  scannedAt: string
  createdAt: string
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
}

export interface BulkQRCodeItem {
  entity_type: string
  entity_id: string
}

export interface BulkQRCodeRequest {
  items: BulkQRCodeItem[]
  format?: 'png' | 'svg'
  size?: number
}

export interface BulkQRCodePDFRequest {
  items: BulkQRCodeItem[]
  projectId: string
  language?: 'he' | 'en'
}

export interface ScanHistoryListParams {
  entityType?: string
  entityId?: string
  page?: number
  pageSize?: number
}

export const generateQRCode = async (
  entityType: string,
  entityId: string,
  format: 'png' | 'svg' = 'png',
  size: number = 300
): Promise<QRCodeResponse> => {
  const params = new URLSearchParams()
  params.set('entity_type', entityType)
  params.set('entity_id', entityId)
  params.set('format', format)
  params.set('size', String(size))
  const response = await apiClient.get(`/qr-codes/generate?${params.toString()}`)
  return response.data
}

export const generateQRCodePost = async (data: QRCodeGenerateRequest): Promise<QRCodeResponse> => {
  const response = await apiClient.post('/qr-codes/generate', {
    entity_type: data.entityType,
    entity_id: data.entityId,
    format: data.format || 'png',
    size: data.size || 300,
  })
  return response.data
}

export const generateBulkQRCodes = async (data: BulkQRCodeRequest): Promise<QRCodeResponse[]> => {
  const response = await apiClient.post('/qr-codes/bulk', {
    items: data.items,
    format: data.format || 'png',
    size: data.size || 300,
  })
  return response.data
}

export const generateBulkQRCodePDF = async (data: BulkQRCodePDFRequest): Promise<Blob> => {
  const response = await apiClient.post(
    '/qr-codes/bulk-pdf',
    {
      items: data.items,
      project_id: data.projectId,
      language: data.language || 'he',
    },
    {
      responseType: 'blob',
    }
  )
  return response.data
}

export const logScan = async (projectId: string, data: ScanHistoryCreate): Promise<ScanHistoryResponse> => {
  const response = await apiClient.post(`/projects/${projectId}/qr-codes/scan`, {
    entity_type: data.entityType,
    entity_id: data.entityId,
  })
  return response.data
}

export const getScanHistory = async (
  projectId: string,
  params?: ScanHistoryListParams
): Promise<PaginatedResponse<ScanHistoryResponse>> => {
  const qs = new URLSearchParams()
  if (params?.entityType) qs.set('entity_type', params.entityType)
  if (params?.entityId) qs.set('entity_id', params.entityId)
  if (params?.page) qs.set('page', String(params.page))
  if (params?.pageSize) qs.set('page_size', String(params.pageSize))
  const query = qs.toString()
  const response = await apiClient.get(
    `/projects/${projectId}/qr-codes/scan-history${query ? `?${query}` : ''}`
  )
  return response.data
}

export const getAllScanHistory = async (
  projectId?: string,
  entityType?: string,
  limit: number = 100,
  offset: number = 0
): Promise<ScanHistoryResponse[]> => {
  const qs = new URLSearchParams()
  if (projectId) qs.set('project_id', projectId)
  if (entityType) qs.set('entity_type', entityType)
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))
  const response = await apiClient.get(`/qr-codes/scan-history?${qs.toString()}`)
  return response.data
}

export const qrCodeApi = {
  generateQRCode,
  generateQRCodePost,
  generateBulkQRCodes,
  generateBulkQRCodePDF,
  logScan,
  getScanHistory,
  getAllScanHistory,
}
