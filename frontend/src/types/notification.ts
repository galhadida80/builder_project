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

export type DigestFrequency = 'immediate' | 'daily' | 'weekly'

export interface NotificationPreference {
  id: string
  userId: string
  category: string
  enabled: boolean
  minUrgencyLevel: UrgencyLevel
  quietHoursStart: string | null
  quietHoursEnd: string | null
  emailEnabled: boolean
  pushEnabled: boolean
  digestFrequency: DigestFrequency
  createdAt: string
  updatedAt: string
}

export interface NotificationPreferenceCreate {
  category: string
  enabled?: boolean
  minUrgencyLevel?: UrgencyLevel
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
  emailEnabled?: boolean
  pushEnabled?: boolean
  digestFrequency?: DigestFrequency
}

export interface NotificationPreferenceUpdate {
  category?: string
  enabled?: boolean
  minUrgencyLevel?: UrgencyLevel
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
  emailEnabled?: boolean
  pushEnabled?: boolean
  digestFrequency?: DigestFrequency
}

export interface NotificationPreferenceListResponse {
  items: NotificationPreference[]
  total: number
  limit: number
  offset: number
}
