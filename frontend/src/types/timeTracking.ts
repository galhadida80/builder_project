import { User } from './index'

// Time entry status types
export type TimeEntryStatus = 'active' | 'completed'

// Timesheet status types
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

// Time Entry interfaces
export interface TimeEntry {
  id: string
  userId: string
  projectId: string
  taskId?: string
  clockInTime: string
  clockOutTime?: string
  locationLat?: number
  locationLng?: number
  breakMinutes?: number
  status: TimeEntryStatus
  createdAt: string
  updatedAt: string
  user?: User
  totalHours?: number
}

export interface TimeEntrySummary {
  totalEntries: number
  activeEntries: number
  completedEntries: number
  totalHours: number
  regularHours: number
  overtimeHours: number
}

// Timesheet interfaces
export interface Timesheet {
  id: string
  userId: string
  projectId: string
  startDate: string
  endDate: string
  totalHours?: number
  regularHours?: number
  overtimeHours?: number
  status: TimesheetStatus
  budgetItemId?: string
  approvedById?: string
  approvedAt?: string
  createdAt: string
  updatedAt: string
  user?: User
  approvedBy?: User
  timeEntries?: TimeEntry[]
}

export interface TimesheetSummary {
  totalTimesheets: number
  draftTimesheets: number
  submittedTimesheets: number
  approvedTimesheets: number
  rejectedTimesheets: number
  totalHours: number
  totalRegularHours: number
  totalOvertimeHours: number
}

// Request types
export interface ClockInRequest {
  clockInTime: string
  locationLat?: number
  locationLng?: number
  taskId?: string
  breakMinutes?: number
}

export interface ClockOutRequest {
  clockOutTime: string
  breakMinutes?: number
}

export interface TimesheetCreateRequest {
  startDate: string
  endDate: string
}

export interface TimesheetApprovalRequest {
  status: 'approved' | 'rejected'
  rejectionReason?: string
}

export interface TimesheetLinkBudgetRequest {
  budgetItemId: string
}

export interface TimesheetSyncBudgetRequest {
  hourlyRate: number
}

export interface CostEntry {
  id: string
  budgetItemId: string
  projectId: string
  description?: string
  amount: number
  entryDate: string
  vendor?: string
  referenceNumber?: string
  createdById: string
  createdAt: string
  updatedAt: string
}

// Report interfaces
export interface AttendanceReportEntry {
  userId: string
  userName: string
  date: string
  clockInTime?: string
  clockOutTime?: string
  totalHours: number
  status: TimeEntryStatus
}

export interface AttendanceReport {
  dateFrom: string
  dateTo: string
  entries: AttendanceReportEntry[]
  totalHours: number
}

export interface LaborCostReportEntry {
  userId: string
  userName: string
  regularHours: number
  overtimeHours: number
  regularCost: number
  overtimeCost: number
  totalCost: number
}

export interface LaborCostReport {
  dateFrom: string
  dateTo: string
  entries: LaborCostReportEntry[]
  totalRegularHours: number
  totalOvertimeHours: number
  totalRegularCost: number
  totalOvertimeCost: number
  totalCost: number
}

// Filters and query parameters
export interface TimeEntryFilters {
  userId?: string
  dateFrom?: string
  dateTo?: string
  status?: TimeEntryStatus
}

export interface TimesheetFilters {
  userId?: string
  status?: TimesheetStatus
  dateFrom?: string
  dateTo?: string
}
