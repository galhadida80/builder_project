// Export-related types matching backend ExportJob model and schemas
export type ExportFormat = 'json' | 'csv' | 'zip'

export type ExportType = 'project' | 'organization'

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface ExportRequest {
  exportFormat: ExportFormat
  exportType: ExportType
  projectId?: string
  organizationId?: string
}

export interface ExportJob {
  id: string
  projectId?: string
  organizationId?: string
  exportFormat: string
  exportType: string
  status: string
  filePath?: string
  fileSize?: number
  errorMessage?: string
  requestedBy?: {
    id: string
    email: string
    firstName: string
    lastName: string
  }
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ExportJobListResponse {
  items: ExportJob[]
  total: number
  limit: number
  offset: number
}

export interface ExportFilters {
  status?: ExportStatus
  exportFormat?: ExportFormat
  exportType?: ExportType
  limit?: number
  offset?: number
}
