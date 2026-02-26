import { EngineeringIcon, ConstructionIcon, LocalShippingIcon, HealthAndSafetyIcon, BuildIcon } from '@/icons'

export const EQUIPMENT_CATEGORY_CONFIG: Record<string, { icon: typeof BuildIcon; color: string; bgColor: string }> = {
  crane: { icon: EngineeringIcon, color: '#e07842', bgColor: '#FFF7F0' },
  heavy: { icon: ConstructionIcon, color: '#EAB308', bgColor: '#FEF9C3' },
  transport: { icon: LocalShippingIcon, color: '#3B82F6', bgColor: '#DBEAFE' },
  safety: { icon: HealthAndSafetyIcon, color: '#22C55E', bgColor: '#DCFCE7' },
  general: { icon: BuildIcon, color: '#9CA3AF', bgColor: '#F3F4F6' },
}

export function getEquipmentCategoryFromType(equipmentType?: string): string {
  if (!equipmentType) return 'general'
  const lower = equipmentType.toLowerCase()
  if (lower.includes('crane') || lower.includes('מנוף')) return 'crane'
  if (lower.includes('heavy') || lower.includes('כבד') || lower.includes('צמ') || lower.includes('חופר') || lower.includes('מחפר')) return 'heavy'
  if (lower.includes('transport') || lower.includes('הובלה') || lower.includes('משאית') || lower.includes('truck')) return 'transport'
  if (lower.includes('safety') || lower.includes('בטיחות')) return 'safety'
  return 'general'
}

export function getEquipmentCategoryConfig(equipmentType?: string) {
  const cat = getEquipmentCategoryFromType(equipmentType)
  return { category: cat, ...(EQUIPMENT_CATEGORY_CONFIG[cat] || EQUIPMENT_CATEGORY_CONFIG.general) }
}
