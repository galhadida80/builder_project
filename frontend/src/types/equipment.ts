// Re-export Equipment-related types from main types file
export type {
  Equipment,
  EquipmentChecklist,
  ChecklistItem,
  ApprovalStatus,
  User,
  FileAttachment,
  ApprovalStep,
} from './index'

// Equipment table-specific types
export interface EquipmentTableRow {
  id: string
  name: string
  equipmentType: string
  manufacturer: string
  modelNumber: string
  serialNumber: string
  status: string
  installationDate: string
  warrantyExpiry: string
  notes: string
  createdAt: string
  updatedAt: string
}

// Equipment sort fields for table sorting
export type EquipmentSortField =
  | 'name'
  | 'equipmentType'
  | 'manufacturer'
  | 'status'
  | 'installationDate'
  | 'warrantyExpiry'
  | 'createdAt'
  | 'updatedAt'

// Equipment filter options
export interface EquipmentFilters {
  status?: string[]
  equipmentType?: string[]
  manufacturer?: string[]
  searchQuery?: string
}

// Equipment table column configuration
export type EquipmentColumnId =
  | 'name'
  | 'equipmentType'
  | 'manufacturer'
  | 'modelNumber'
  | 'serialNumber'
  | 'status'
  | 'installationDate'
  | 'warrantyExpiry'
  | 'updatedAt'
