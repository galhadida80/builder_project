export type UserRole = 'project_admin' | 'contractor' | 'consultant' | 'supervisor' | 'inspector'

export type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revision_requested'

export type MeetingStatus = 'scheduled' | 'invitations_sent' | 'completed' | 'cancelled'

export type AreaStatus = 'not_started' | 'in_progress' | 'awaiting_approval' | 'completed'

export interface User {
  id: string
  email: string
  fullName: string
  phone?: string
  company?: string
  avatarUrl?: string
  isActive: boolean
  createdAt: string
}

export interface ProjectMember {
  id: string
  userId: string
  user: User
  role: UserRole
  joinedAt: string
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
  equipmentCode?: string
  category?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
  status: ApprovalStatus
  location?: string
  specifications?: Record<string, unknown>
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
  materialCode?: string
  category?: string
  supplier?: string
  unit?: string
  quantityOrdered?: number
  quantityReceived?: number
  unitPrice?: number
  status: ApprovalStatus
  deliveryDate?: string
  specifications?: Record<string, unknown>
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
  startTime: string
  endTime: string
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
  entityType?: string
  entityId?: string
  fileName: string
  originalName: string
  fileType?: string
  fileSize?: number
  gcsPath: string
  version: number
  parentFileId?: string
  uploadedBy?: User
  createdAt: string
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
