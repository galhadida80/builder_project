export type NotificationCategory = 'approval' | 'inspection' | 'defect' | 'update' | 'general'

export interface Notification {
  id: string
  userId: string
  category: NotificationCategory
  title: string
  message: string
  relatedEntityType?: string
  relatedEntityId?: string
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export interface NotificationFilters {
  category?: NotificationCategory
  isRead?: boolean
  limit?: number
  offset?: number
}

export interface NotificationListResponse {
  items: Notification[]
  total: number
  limit: number
  offset: number
}

export interface UnreadCountResponse {
  unreadCount: number
}
