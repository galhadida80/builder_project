import { useState, useEffect, useCallback } from 'react'
import { notificationsApi } from '../api'
import type { Notification, NotificationCategory } from '../types/notification'

interface UseNotificationsOptions {
  category?: NotificationCategory
  limit?: number
  autoFetch?: boolean
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: Error | null
  hasMore: boolean
  markAsRead: (notification: Notification) => Promise<void>
  markAllAsRead: () => Promise<void>
  loadMore: () => Promise<void>
  refresh: () => Promise<void>
}

const DEFAULT_LIMIT = 20

export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const { category, limit = DEFAULT_LIMIT, autoFetch = true } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [offset, setOffset] = useState<number>(0)
  const [hasMore, setHasMore] = useState<boolean>(true)

  const fetchNotifications = useCallback(
    async (reset = false) => {
      try {
        setLoading(true)
        setError(null)

        const currentOffset = reset ? 0 : offset
        const data = await notificationsApi.getAll(category)

        if (reset) {
          setNotifications(data)
          setOffset(data.length)
        } else {
          setNotifications((prev) => [...prev, ...data])
          setOffset((prev) => prev + data.length)
        }

        // If we received fewer items than requested, there are no more
        setHasMore(data.length >= limit)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
      } finally {
        setLoading(false)
      }
    },
    [category, limit, offset]
  )

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationsApi.getUnreadCount()
      setUnreadCount(count)
    } catch (err) {
      // Silently fail for unread count - not critical
    }
  }, [])

  const markAsRead = useCallback(
    async (notification: Notification) => {
      if (notification.isRead) return

      try {
        await notificationsApi.markAsRead(notification.id)

        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to mark notification as read'))
        // Revert optimistic update on error
        await fetchNotifications(true)
        await fetchUnreadCount()
      }
    },
    [fetchNotifications, fetchUnreadCount]
  )

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsApi.markAllAsRead()

      // Optimistically update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark all notifications as read'))
      // Revert optimistic update on error
      await fetchNotifications(true)
      await fetchUnreadCount()
    }
  }, [fetchNotifications, fetchUnreadCount])

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return
    await fetchNotifications(false)
  }, [hasMore, loading, fetchNotifications])

  const refresh = useCallback(async () => {
    await fetchNotifications(true)
    await fetchUnreadCount()
  }, [fetchNotifications, fetchUnreadCount])

  // Fetch notifications and unread count on mount and when category changes
  useEffect(() => {
    if (autoFetch) {
      setOffset(0)
      fetchNotifications(true)
      fetchUnreadCount()
    }
  }, [category, autoFetch]) // Intentionally exclude fetchNotifications and fetchUnreadCount

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
  }
}
