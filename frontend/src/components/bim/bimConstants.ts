export const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  uploaded: 'default',
  translating: 'warning',
  complete: 'success',
  failed: 'error',
}

export const FILE_TYPE_COLORS: Record<string, string> = {
  '.rvt': 'primary.main',
  '.ifc': 'info.main',
  '.nwc': 'warning.main',
  '.nwd': 'warning.main',
  '.dwg': 'secondary.main',
}

export const FILE_TYPE_BG: Record<string, string> = {
  '.rvt': 'primary.light',
  '.ifc': 'info.light',
  '.nwc': 'warning.light',
  '.nwd': 'warning.light',
  '.dwg': 'secondary.light',
}

export const FILE_FORMAT_LABEL: Record<string, string> = {
  '.rvt': 'REVIT',
  '.ifc': 'IFC',
  '.nwc': 'NWC',
  '.nwd': 'NWD',
  '.dwg': 'DWG',
}

export function getFileExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  return ext ? `.${ext}` : ''
}

export function isIfc(filename: string): boolean {
  return filename.toLowerCase().endsWith('.ifc')
}
