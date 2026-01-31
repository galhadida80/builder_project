export type NotificationCategory = 'approval' | 'inspection' | 'update' | 'general'

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

export interface UnreadCountResponse {
  count: number
}
