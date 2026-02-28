import { apiClient } from './client'
import type {
  TimeEntry,
  Timesheet,
  ClockInRequest,
  ClockOutRequest,
  TimesheetCreateRequest,
  TimesheetLinkBudgetRequest,
  AttendanceReport,
  LaborCostReport,
  TimeEntryFilters,
  TimesheetFilters,
} from '../types/timeTracking'

export const timeTrackingApi = {
  // Time Entry operations
  clockIn: async (projectId: string, data: ClockInRequest): Promise<TimeEntry> => {
    const response = await apiClient.post(`/projects/${projectId}/time-entries/clock-in`, data)
    return response.data
  },

  clockOut: async (projectId: string, breakMinutes: number = 0): Promise<TimeEntry> => {
    const response = await apiClient.post(
      `/projects/${projectId}/time-entries/clock-out?break_minutes=${breakMinutes}`
    )
    return response.data
  },

  getTimeEntries: async (projectId: string, filters?: TimeEntryFilters): Promise<TimeEntry[]> => {
    const params = new URLSearchParams()
    if (filters?.userId) params.set('user_id', filters.userId)
    if (filters?.dateFrom) params.set('date_from', filters.dateFrom)
    if (filters?.dateTo) params.set('date_to', filters.dateTo)
    if (filters?.status) params.set('status', filters.status)
    const qs = params.toString()
    const response = await apiClient.get(`/projects/${projectId}/time-entries${qs ? `?${qs}` : ''}`)
    return response.data
  },

  getActiveEntry: async (projectId: string): Promise<TimeEntry> => {
    const response = await apiClient.get(`/projects/${projectId}/time-entries/active`)
    return response.data
  },

  // Timesheet operations
  listTimesheets: async (projectId: string, filters?: TimesheetFilters): Promise<Timesheet[]> => {
    const params = new URLSearchParams()
    if (filters?.userId) params.set('user_id', filters.userId)
    if (filters?.status) params.set('status', filters.status)
    if (filters?.dateFrom) params.set('date_from', filters.dateFrom)
    if (filters?.dateTo) params.set('date_to', filters.dateTo)
    const qs = params.toString()
    const response = await apiClient.get(`/projects/${projectId}/timesheets${qs ? `?${qs}` : ''}`)
    return response.data
  },

  createTimesheet: async (projectId: string, data: TimesheetCreateRequest): Promise<Timesheet> => {
    const response = await apiClient.post(`/projects/${projectId}/timesheets`, data)
    return response.data
  },

  submitTimesheet: async (projectId: string, timesheetId: string): Promise<Timesheet> => {
    const response = await apiClient.post(`/projects/${projectId}/timesheets/${timesheetId}/submit`)
    return response.data
  },

  approveTimesheet: async (projectId: string, timesheetId: string): Promise<Timesheet> => {
    const response = await apiClient.post(`/projects/${projectId}/timesheets/${timesheetId}/approve`)
    return response.data
  },

  rejectTimesheet: async (projectId: string, timesheetId: string, reason?: string): Promise<Timesheet> => {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : ''
    const response = await apiClient.post(`/projects/${projectId}/timesheets/${timesheetId}/reject${params}`)
    return response.data
  },

  linkTimesheetToBudget: async (
    projectId: string,
    timesheetId: string,
    data: TimesheetLinkBudgetRequest
  ): Promise<Timesheet> => {
    const response = await apiClient.post(
      `/projects/${projectId}/timesheets/${timesheetId}/link-budget`,
      data
    )
    return response.data
  },

  // Reports
  getAttendanceReport: async (projectId: string, dateFrom: string, dateTo: string): Promise<AttendanceReport> => {
    const response = await apiClient.get(
      `/projects/${projectId}/reports/attendance?date_from=${dateFrom}&date_to=${dateTo}`
    )
    return response.data
  },

  getLaborCostReport: async (projectId: string, dateFrom: string, dateTo: string): Promise<LaborCostReport> => {
    const response = await apiClient.get(
      `/projects/${projectId}/reports/labor-costs?date_from=${dateFrom}&date_to=${dateTo}`
    )
    return response.data
  },

  exportPayroll: async (projectId: string, dateFrom: string, dateTo: string): Promise<Blob> => {
    const response = await apiClient.get(
      `/projects/${projectId}/reports/payroll-export?date_from=${dateFrom}&date_to=${dateTo}&format=csv`,
      { responseType: 'blob' }
    )
    return response.data
  },
}
