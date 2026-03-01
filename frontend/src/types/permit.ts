import { User } from './index'

// Permit Types
export type PermitType =
  | 'building_permit'         // heiter bniya
  | 'occupancy_certificate'   // tofes 4
  | 'completion_certificate'  // tofes 5
  | 'environmental_permit'
  | 'fire_safety_approval'

// Permit Status
export type PermitStatus =
  | 'not_applied'
  | 'applied'
  | 'under_review'
  | 'approved'
  | 'conditional'
  | 'rejected'
  | 'expired'

// Main Permit Interface
export interface Permit {
  id: string
  projectId: string
  permitType: PermitType
  status: PermitStatus
  permitNumber?: string
  issuingAuthority?: string
  applicationDate?: string
  approvalDate?: string
  expirationDate?: string
  conditions?: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: User
}

// Permit Create Request
export interface PermitCreate {
  permitType: PermitType
  status?: PermitStatus
  permitNumber?: string
  issuingAuthority?: string
  applicationDate?: string
  approvalDate?: string
  expirationDate?: string
  conditions?: string
  notes?: string
}

// Permit Update Request
export interface PermitUpdate {
  permitType?: PermitType
  status?: PermitStatus
  permitNumber?: string
  issuingAuthority?: string
  applicationDate?: string
  approvalDate?: string
  expirationDate?: string
  conditions?: string
  notes?: string
}

// Permit Status Update Request
export interface PermitStatusUpdate {
  status: PermitStatus
}

// Permit Summary (compact version)
export interface PermitSummary {
  id: string
  projectId: string
  permitType: PermitType
  status: PermitStatus
  permitNumber?: string
  expirationDate?: string
  createdAt: string
}

// Permit Compliance Report
export interface PermitComplianceReport {
  totalPermits: number
  notAppliedCount: number
  appliedCount: number
  underReviewCount: number
  approvedCount: number
  conditionalCount: number
  rejectedCount: number
  expiredCount: number
  expiringSoonCount: number
  permitsByType: Record<string, number>
}

// Permit Filters
export interface PermitFilters {
  status?: PermitStatus[]
  permitType?: PermitType[]
  issuingAuthority?: string[]
  expiringWithinDays?: number
  searchQuery?: string
}

// Permit Sort Fields
export type PermitSortField =
  | 'permitType'
  | 'status'
  | 'permitNumber'
  | 'issuingAuthority'
  | 'applicationDate'
  | 'approvalDate'
  | 'expirationDate'
  | 'createdAt'
  | 'updatedAt'

// Permit Table Row
export interface PermitTableRow {
  id: string
  permitType: PermitType
  status: PermitStatus
  permitNumber?: string
  issuingAuthority?: string
  applicationDate?: string
  approvalDate?: string
  expirationDate?: string
  createdAt: string
  updatedAt: string
}

// Permit Column IDs
export type PermitColumnId =
  | 'permitType'
  | 'status'
  | 'permitNumber'
  | 'issuingAuthority'
  | 'applicationDate'
  | 'approvalDate'
  | 'expirationDate'
  | 'updatedAt'
