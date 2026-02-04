import { User } from './index'
import { Project } from './index'

export type AssignmentStatus = 'pending' | 'active' | 'completed' | 'cancelled'

export interface ConsultantType {
  id: string
  name: string
  nameHe: string
  category?: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ConsultantAssignment {
  id: string
  consultantId: string
  projectId: string
  consultantTypeId?: string
  startDate: string
  endDate: string
  status: AssignmentStatus
  notes?: string
  createdAt: string
  updatedAt: string
  consultant?: User
  project?: Project
  consultantType?: ConsultantType
}

export interface ConsultantAssignmentCreate {
  consultantId: string
  projectId: string
  consultantTypeId?: string
  startDate: string
  endDate: string
  status?: AssignmentStatus
  notes?: string
}

export interface ConsultantAssignmentUpdate {
  consultantId?: string
  projectId?: string
  consultantTypeId?: string
  startDate?: string
  endDate?: string
  status?: AssignmentStatus
  notes?: string
}
