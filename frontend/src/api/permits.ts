import { apiClient } from './client'
import type {
  Permit,
  PermitCreate,
  PermitUpdate,
  PermitStatusUpdate,
  PermitComplianceReport
} from '../types/permit'
import type { FileAttachment } from '../types'

export const permitsApi = {
  getPermits: async (projectId: string): Promise<Permit[]> => {
    const response = await apiClient.get(`/permits?project_id=${projectId}`)
    return response.data
  },

  getProjectPermits: async (projectId: string): Promise<Permit[]> => {
    const response = await apiClient.get(`/projects/${projectId}/permits`)
    return response.data
  },

  getComplianceReport: async (projectId: string): Promise<PermitComplianceReport> => {
    const response = await apiClient.get(`/projects/${projectId}/permits/compliance-report`)
    return response.data
  },

  createPermit: async (projectId: string, data: PermitCreate): Promise<Permit> => {
    const response = await apiClient.post(`/projects/${projectId}/permits`, {
      permit_type: data.permitType,
      status: data.status,
      permit_number: data.permitNumber,
      issuing_authority: data.issuingAuthority,
      application_date: data.applicationDate,
      approval_date: data.approvalDate,
      expiration_date: data.expirationDate,
      conditions: data.conditions,
      notes: data.notes
    })
    return response.data
  },

  getPermit: async (permitId: string): Promise<Permit> => {
    const response = await apiClient.get(`/permits/${permitId}`)
    return response.data
  },

  updatePermit: async (permitId: string, data: PermitUpdate): Promise<Permit> => {
    const response = await apiClient.put(`/permits/${permitId}`, {
      permit_type: data.permitType,
      status: data.status,
      permit_number: data.permitNumber,
      issuing_authority: data.issuingAuthority,
      application_date: data.applicationDate,
      approval_date: data.approvalDate,
      expiration_date: data.expirationDate,
      conditions: data.conditions,
      notes: data.notes
    })
    return response.data
  },

  updatePermitStatus: async (permitId: string, data: PermitStatusUpdate): Promise<Permit> => {
    const response = await apiClient.patch(`/permits/${permitId}/status`, {
      status: data.status
    })
    return response.data
  },

  deletePermit: async (permitId: string): Promise<void> => {
    await apiClient.delete(`/permits/${permitId}`)
  },

  uploadDocument: async (permitId: string, file: File): Promise<FileAttachment> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post(`/permits/${permitId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    return response.data
  }
}
