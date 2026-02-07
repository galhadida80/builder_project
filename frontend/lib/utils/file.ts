export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getFileTypeCategory(fileType: string): 'pdf' | 'image' | 'document' | 'spreadsheet' | 'other' {
  if (fileType === 'application/pdf') return 'pdf'
  if (fileType.startsWith('image/')) return 'image'
  if (fileType.includes('word') || fileType.includes('document')) return 'document'
  if (fileType.includes('sheet') || fileType.includes('excel')) return 'spreadsheet'
  return 'other'
}
