/**
 * Formats a date string as relative time (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeTime(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return t('defects.justNow')
  if (diffMinutes < 60) return t('defects.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('defects.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('defects.yesterday')
  if (diffDays < 30) return t('defects.daysAgo', { count: diffDays })

  return date.toLocaleDateString()
}

/**
 * Formats future date as relative time (e.g., "expires tomorrow", "in 5 days")
 */
export function formatFutureRelativeTime(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays < 0) return t('safetyTraining.expired')
  if (diffDays === 0) return t('safetyTraining.expiresTime.today')
  if (diffDays === 1) return t('safetyTraining.expiresTime.tomorrow')
  if (diffDays <= 30) return t('safetyTraining.expiresTime.inDays', { count: diffDays })

  return date.toLocaleDateString()
}
