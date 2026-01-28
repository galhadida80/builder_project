import { apiClient } from './client'
import type { Meeting } from '../types'

interface MeetingCreate {
  title: string
  description?: string
  meetingType?: string
  location?: string
  scheduledDate: string
  scheduledTime?: string
}

interface MeetingUpdate {
  title?: string
  description?: string
  meetingType?: string
  location?: string
  scheduledDate?: string
  scheduledTime?: string
  summary?: string
  actionItems?: Array<{ id: string; description: string; isCompleted: boolean }>
  status?: string
}

interface AttendeeCreate {
  userId: string
  role?: string
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

  confirmAttendance: async (projectId: string, meetingId: string, userId: string) => {
    const response = await apiClient.put(`/projects/${projectId}/meetings/${meetingId}/attendees/${userId}/confirm`)
    return response.data
  },
}
