/**
 * Format a date as relative time for safety-related displays
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

  if (diffMinutes < 60) return t('common.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('common.hoursAgo', { count: diffHours })
  if (diffDays < 7) return t('common.daysAgo', { count: diffDays })
  return date.toLocaleDateString()
}

/**
 * Convert File objects to base64 preview URLs
 */
export async function filesToPreviews(files: File[]): Promise<string[]> {
  const previews = await Promise.all(
    files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })
  )
  return previews
}

/**
 * Convert File objects to base64 strings for API submission
 */
export async function filesToBase64(files: File[]): Promise<string[]> {
  const base64Strings = await Promise.all(
    files.map(async (file) => {
      const preview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      return preview.split(',')[1] // Remove data:image/...;base64, prefix
    })
  )
  return base64Strings
}
