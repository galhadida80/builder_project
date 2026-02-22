import { apiClient } from './client'
import type { Notification, NotificationCategory, NotificationListResponse, UnreadCountResponse } from '../types/notification'

export interface NotificationListParams {
  category?: NotificationCategory
  isRead?: boolean
  search?: string
  limit?: number
  offset?: number
}

export const notificationsApi = {
  getAll: async (params?: NotificationListParams): Promise<NotificationListResponse> => {
    const queryParams: Record<string, string | number | boolean> = {}
    if (params?.category) queryParams.category = params.category
    if (params?.isRead !== undefined) queryParams.is_read = params.isRead
    if (params?.search) queryParams.search = params.search
    if (params?.limit) queryParams.limit = params.limit
    if (params?.offset !== undefined) queryParams.offset = params.offset
    const response = await apiClient.get<NotificationListResponse>('/notifications', { params: queryParams })
    return response.data
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
    return response.data.unreadCount
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.put<Notification>(`/notifications/${notificationId}/mark-read`)
    return response.data
  },

  markAsUnread: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.put<Notification>(`/notifications/${notificationId}/mark-unread`)
    return response.data
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/mark-all-read')
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}`)
  },

  bulkMarkRead: async (ids: string[]): Promise<void> => {
    await apiClient.put('/notifications/bulk/mark-read', { ids })
  },

  bulkDelete: async (ids: string[]): Promise<void> => {
    await apiClient.delete('/notifications/bulk/delete', { data: { ids } })
  },
}
