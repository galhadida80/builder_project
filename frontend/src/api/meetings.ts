import { apiClient } from './client'
import type { Meeting } from '../types'

interface TimeSlotInput {
  proposed_start: string
  proposed_end?: string
}

interface MeetingCreate {
  title: string
  description?: string
  meeting_type?: string
  location?: string
  scheduled_date: string
  scheduled_time?: string
  attendee_ids?: string[]
  time_slots?: TimeSlotInput[]
}

interface MeetingUpdate {
  title?: string
  description?: string
  meeting_type?: string
  location?: string
  scheduled_date?: string
  scheduled_time?: string
  summary?: string
  action_items?: Array<{ id: string; description: string; assignee_id?: string; due_date?: string; is_completed: boolean }>
  status?: string
}

interface AttendeeCreate {
  user_id: string
  role?: string
}

interface RSVPInfo {
  meetingTitle: string
  meetingDate: string
  meetingLocation?: string
  organizerName?: string
  attendeeName?: string
  attendanceStatus: string
}

export const meetingsApi = {
  list: async (projectId?: string): Promise<Meeting[]> => {
    const url = projectId ? `/projects/${projectId}/meetings` : '/meetings'
    const response = await apiClient.get(url)
    return response.data
  },

  get: async (projectId: string, id: string): Promise<Meeting> => {
    const response = await apiClient.get(`/projects/${projectId}/meetings/${id}`)
    return response.data
  },

  create: async (projectId: string, data: MeetingCreate): Promise<Meeting> => {
    const response = await apiClient.post(`/projects/${projectId}/meetings`, data)
    return response.data
  },

  update: async (projectId: string, id: string, data: MeetingUpdate): Promise<Meeting> => {
    const response = await apiClient.put(`/projects/${projectId}/meetings/${id}`, data)
    return response.data
  },

  delete: async (projectId: string, id: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/meetings/${id}`)
  },

  addAttendee: async (projectId: string, meetingId: string, data: AttendeeCreate) => {
    const response = await apiClient.post(`/projects/${projectId}/meetings/${meetingId}/attendees`, data)
    return response.data
  },

  removeAttendee: async (projectId: string, meetingId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/meetings/${meetingId}/attendees/${userId}`)
  },

  rsvpAttendee: async (projectId: string, meetingId: string, userId: string, status: string) => {
    const response = await apiClient.put(
      `/projects/${projectId}/meetings/${meetingId}/attendees/${userId}/rsvp`,
      { status }
    )
    return response.data
  },

  getRsvpInfo: async (token: string): Promise<RSVPInfo> => {
    const response = await apiClient.get(`/meetings/rsvp/${token}`)
    return response.data
  },

  rsvpByToken: async (token: string, status: string): Promise<RSVPInfo> => {
    const response = await apiClient.post(`/meetings/rsvp/${token}`, { status })
    return response.data
  },

  getCalendarLinks: async (projectId: string, meetingId: string): Promise<{ google_url: string; outlook_url: string; ics_download_url: string }> => {
    const response = await apiClient.get(`/projects/${projectId}/meetings/${meetingId}/calendar-links`)
    return response.data
  },

  getIcalUrl: (projectId: string, meetingId: string): string => {
    return `/api/v1/projects/${projectId}/meetings/${meetingId}/ical`
  },

  confirmTimeSlot: async (projectId: string, meetingId: string, timeSlotId: string): Promise<Meeting> => {
    const response = await apiClient.post(`/projects/${projectId}/meetings/${meetingId}/confirm-time`, {
      time_slot_id: timeSlotId,
    })
    return response.data
  },

  syncToCalendar: async (projectId: string, meetingId: string): Promise<{ message: string; google_event_id: string; calendar_synced: boolean }> => {
    const response = await apiClient.post(`/projects/${projectId}/meetings/${meetingId}/sync-calendar`)
    return response.data
  },

  removeCalendarEvent: async (projectId: string, meetingId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/projects/${projectId}/meetings/${meetingId}/calendar-event`)
    return response.data
  },

  getCalendarStatus: async (): Promise<{ google_connected: boolean; google_configured: boolean }> => {
    const response = await apiClient.get('/calendar/status')
    return response.data
  },

  getCalendarAuthUrl: async (): Promise<{ auth_url: string }> => {
    const response = await apiClient.get('/calendar/auth-url')
    return response.data
  },

  disconnectCalendar: async (): Promise<void> => {
    await apiClient.delete('/calendar/disconnect')
  },

  getIcalFeedUrl: async (projectId: string): Promise<{ feed_url: string }> => {
    const response = await apiClient.get(`/projects/${projectId}/calendar/feed-url`)
    return response.data
  },

  syncAllToCalendar: async (projectId: string): Promise<{ synced: number; failed: number; skipped: number }> => {
    const response = await apiClient.post(`/projects/${projectId}/meetings/sync-all-calendar`)
    return response.data
  },
}
