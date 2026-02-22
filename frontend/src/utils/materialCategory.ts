import { FoundationIcon, ConstructionIcon, ElectricalServicesIcon, PlumbingIcon, CategoryIcon, InventoryIcon } from '@/icons'

export const CATEGORY_CONFIG: Record<string, { icon: typeof InventoryIcon; color: string; bgColor: string }> = {
  concrete: { icon: FoundationIcon, color: '#795548', bgColor: '#EFEBE9' },
  steel: { icon: ConstructionIcon, color: '#546E7A', bgColor: '#ECEFF1' },
  electrical: { icon: ElectricalServicesIcon, color: '#F57C00', bgColor: '#FFF3E0' },
  plumbing: { icon: PlumbingIcon, color: '#0288D1', bgColor: '#E1F5FE' },
  general: { icon: CategoryIcon, color: '#7B1FA2', bgColor: '#F3E5F5' },
}

export function getCategoryFromType(materialType?: string): string {
  if (!materialType) return 'general'
  const lower = materialType.toLowerCase()
  if (lower.includes('בטון') || lower.includes('concrete')) return 'concrete'
  if (lower.includes('פלדה') || lower.includes('steel') || lower.includes('ברזל') || lower.includes('iron')) return 'steel'
  if (lower.includes('חשמל') || lower.includes('electric') || lower.includes('cable') || lower.includes('כבל')) return 'electrical'
  if (lower.includes('אינסטלציה') || lower.includes('plumb') || lower.includes('pipe') || lower.includes('צינור')) return 'plumbing'
  return 'general'
}

export function getCategoryConfig(materialType?: string) {
  const cat = getCategoryFromType(materialType)
  return { category: cat, ...(CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general) }
}
