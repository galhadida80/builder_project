import type { User } from './index'

export type EntityType = 'defect' | 'issue' | 'rfi' | 'inspection' | 'punch_item'

export interface FileBrief {
  id: string
  filename: string
  fileUrl?: string
  fileType?: string
}

export interface Floorplan {
  id: string
  projectId: string
  floorNumber?: number
  name: string
  fileId?: string
  version: number
  isActive: boolean
  createdAt: string
  createdById?: string
  updatedAt: string
  file?: FileBrief
  createdBy?: User
}

export interface FloorplanPin {
  id: string
  floorplanId: string
  entityType: EntityType
  entityId: string
  xPosition: number
  yPosition: number
  createdAt: string
  createdById?: string
  createdBy?: User
}

export interface FloorplanCreateRequest {
  name: string
  floorNumber?: number
  fileId?: string
  version?: number
}

export interface FloorplanUpdateRequest {
  name?: string
  floorNumber?: number
  fileId?: string
  isActive?: boolean
}

export interface FloorplanPinCreateRequest {
  entityType: EntityType
  entityId: string
  xPosition: number
  yPosition: number
}

export interface FloorplanPinUpdateRequest {
  xPosition?: number
  yPosition?: number
}
