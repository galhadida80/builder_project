export type UserRole = 'project_admin' | 'contractor' | 'consultant' | 'supervisor' | 'inspector'

export type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revision_requested'

export type MeetingStatus = 'scheduled' | 'invitations_sent' | 'completed' | 'cancelled'

export type AreaStatus = 'not_started' | 'in_progress' | 'awaiting_approval' | 'completed'

export interface User {
  id: string
  email: string
  fullName?: string
  phone?: string
  company?: string
  role?: string
  isActive: boolean
  createdAt: string
}

export interface ProjectMember {
  id: string
  userId: string
  user: User
  role: UserRole
  addedAt: string
}

export interface Project {
  id: string
  name: string
  code: string
  description?: string
  address?: string
  startDate?: string
  estimatedEndDate?: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  createdAt: string
  updatedAt: string
  members?: ProjectMember[]
}

export interface Contact {
  id: string
  projectId: string
  contactType: 'contractor' | 'consultant' | 'supervisor' | 'inspector' | 'engineer' | 'manager'
  companyName?: string
  contactName: string
  email?: string
  phone?: string
  roleDescription?: string
  isPrimary: boolean
  createdAt: string
}

export interface Equipment {
  id: string
  projectId: string
  name: string
  equipmentType?: string
  manufacturer?: string
  modelNumber?: string
  serialNumber?: string
  status: ApprovalStatus
  specifications?: Record<string, unknown>
  installationDate?: string
  warrantyExpiry?: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  documents?: FileAttachment[]
  checklists?: EquipmentChecklist[]
  approvals?: ApprovalStep[]
}

export interface EquipmentChecklist {
  id: string
  equipmentId: string
  checklistName: string
  items: ChecklistItem[]
  completedAt?: string
  completedBy?: User
  createdAt: string
}

export interface ChecklistItem {
  id: string
  label: string
  isCompleted: boolean
  completedAt?: string
  notes?: string
}

export interface Material {
  id: string
  projectId: string
  name: string
  materialType?: string
  manufacturer?: string
  modelNumber?: string
  quantity?: number
  unit?: string
  specifications?: Record<string, unknown>
  status: ApprovalStatus
  expectedDelivery?: string
  actualDelivery?: string
  storageLocation?: string
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  documents?: FileAttachment[]
  approvals?: ApprovalStep[]
}

export interface Meeting {
  id: string
  projectId: string
  title: string
  description?: string
  meetingType?: 'site_inspection' | 'approval_meeting' | 'coordination' | 'safety_review' | 'other'
  location?: string
  scheduledDate: string
  scheduledTime?: string
  googleEventId?: string
  summary?: string
  actionItems?: ActionItem[]
  status: MeetingStatus
  createdAt: string
  createdBy?: User
  attendees?: MeetingAttendee[]
}

export interface MeetingAttendee {
  id: string
  meetingId: string
  userId?: string
  user?: User
  email: string
  attendanceStatus: 'pending' | 'accepted' | 'declined' | 'tentative'
}

export interface ActionItem {
  id: string
  description: string
  assigneeId?: string
  assignee?: User
  dueDate?: string
  isCompleted: boolean
}

export interface ApprovalRequest {
  id: string
  projectId: string
  entityType: 'equipment' | 'material'
  entityId: string
  currentStatus: ApprovalStatus
  createdAt: string
  createdBy?: User
  steps: ApprovalStep[]
}

export interface ApprovalStep {
  id: string
  approvalRequestId: string
  stepOrder: number
  approverId?: string
  approver?: User
  approverRole?: UserRole
  status: ApprovalStatus
  comments?: string
  decidedAt?: string
  createdAt: string
}

export interface ConstructionArea {
  id: string
  projectId: string
  parentId?: string
  name: string
  areaType?: 'apartment' | 'facade' | 'basement' | 'parking' | 'roof' | 'infrastructure' | 'common_area'
  floorNumber?: number
  areaCode?: string
  totalUnits?: number
  children?: ConstructionArea[]
  progress?: AreaProgress[]
}

export interface AreaProgress {
  id: string
  areaId: string
  taskCategory: string
  taskName: string
  progressPercent: number
  status: AreaStatus
  notes?: string
  updatedAt: string
  updatedBy?: User
}

export interface FileAttachment {
  id: string
  projectId: string
  entityType: string
  entityId: string
  filename: string
  fileType?: string
  fileSize?: number
  storagePath: string
  uploadedAt: string
  uploadedBy?: User
}

export interface AuditLog {
  id: string
  projectId?: string
  userId?: string
  user?: User
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'status_change' | 'approval' | 'rejection'
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  createdAt: string
}

export interface Notification {
  id: string
  projectId?: string
  userId: string
  notificationType: string
  subject?: string
  body?: string
  isRead: boolean
  createdAt: string
}

export type InspectionStatus = 'pending' | 'in_progress' | 'completed' | 'failed'
export type FindingSeverity = 'low' | 'medium' | 'high' | 'critical'
export type FindingStatus = 'open' | 'resolved'

export interface InspectionConsultantType {
  id: string
  name: string
  nameHe: string
  category?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InspectionStageTemplate {
  id: string
  consultantTypeId: string
  name: string
  nameHe: string
  description?: string
  stageOrder: number
  triggerConditions?: Record<string, unknown>
  requiredDocuments?: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Inspection {
  id: string
  projectId: string
  consultantTypeId: string
  scheduledDate: string
  completedDate?: string
  currentStage?: string
  status: InspectionStatus
  notes?: string
  createdAt: string
  updatedAt: string
  createdBy?: User
  consultantType?: InspectionConsultantType
  findings?: Finding[]
}

export interface Finding {
  id: string
  inspectionId: string
  title: string
  description?: string
  severity: FindingSeverity
  status: FindingStatus
  location?: string
  photos?: string[]
  createdAt: string
  updatedAt: string
  createdBy?: User
}

export interface InspectionSummary {
  totalInspections: number
  pendingCount: number
  inProgressCount: number
  completedCount: number
  failedCount: number
  findingsBySeverity: Record<string, number>
  overdueCount: number
}

export interface InspectionHistoryEvent {
  id: string
  inspectionId: string
  userId?: string
  user?: User
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete' | 'status_change' | 'approval' | 'rejection'
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  createdAt: string
}
