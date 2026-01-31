import { apiClient } from './client'
import type { Notification, NotificationCategory, UnreadCountResponse } from '../types/notification'

export const notificationsApi = {
  getAll: async (category?: NotificationCategory): Promise<Notification[]> => {
    const params = category ? { category } : {}
    const response = await apiClient.get<Notification[]>('/notifications', { params })
    return response.data
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count')
    return response.data.count
  },

  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.put<Notification>(`/notifications/${notificationId}/mark-read`)
    return response.data
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.put('/notifications/mark-all-read')
  },
}
