export type NotificationCategory = 'approval' | 'inspection' | 'defect' | 'update' | 'general'
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'

export interface Notification {
  id: string
  userId: string
  category: NotificationCategory
  urgency: UrgencyLevel
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
  urgency?: UrgencyLevel
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
