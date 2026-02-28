import { apiClient } from './client'
import type {
  Floorplan,
  FloorplanPin,
  FloorplanCreateRequest,
  FloorplanUpdateRequest,
  FloorplanPinCreateRequest,
  EntityType,
} from '../types/floorplan'
import type { PaginatedResponse } from './types'

export interface FloorplanListParams {
  floorNumber?: number
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface FloorplanPinListParams {
  entityType?: EntityType
}

export const floorplansApi = {
  list: async (projectId: string, params?: FloorplanListParams): Promise<PaginatedResponse<Floorplan>> => {
    const qs = new URLSearchParams()
    if (params?.floorNumber !== undefined) qs.set('floor_number', String(params.floorNumber))
    if (params?.isActive !== undefined) qs.set('is_active', String(params.isActive))
    if (params?.page) qs.set('page', String(params.page))
    if (params?.pageSize) qs.set('page_size', String(params.pageSize))
    const query = qs.toString()
    const response = await apiClient.get(`/projects/${projectId}/floorplans${query ? `?${query}` : ''}`)
    return response.data
  },

  get: async (projectId: string, floorplanId: string): Promise<Floorplan> => {
    const response = await apiClient.get(`/projects/${projectId}/floorplans/${floorplanId}`)
    return response.data
  },

  create: async (projectId: string, data: FloorplanCreateRequest): Promise<Floorplan> => {
    const response = await apiClient.post(`/projects/${projectId}/floorplans`, data)
    return response.data
  },

  update: async (projectId: string, floorplanId: string, data: FloorplanUpdateRequest): Promise<Floorplan> => {
    const response = await apiClient.put(`/projects/${projectId}/floorplans/${floorplanId}`, data)
    return response.data
  },

  delete: async (projectId: string, floorplanId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/floorplans/${floorplanId}`)
  },

  listPins: async (projectId: string, floorplanId: string, params?: FloorplanPinListParams): Promise<FloorplanPin[]> => {
    const qs = new URLSearchParams()
    if (params?.entityType) qs.set('entity_type', params.entityType)
    const query = qs.toString()
    const response = await apiClient.get(
      `/projects/${projectId}/floorplans/${floorplanId}/pins${query ? `?${query}` : ''}`
    )
    return response.data
  },

  createPin: async (projectId: string, floorplanId: string, data: FloorplanPinCreateRequest): Promise<FloorplanPin> => {
    const response = await apiClient.post(`/projects/${projectId}/floorplans/${floorplanId}/pins`, data)
    return response.data
  },
}
