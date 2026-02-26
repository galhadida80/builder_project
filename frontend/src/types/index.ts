export type UserRole = 'project_admin' | 'contractor' | 'consultant' | 'supervisor' | 'inspector'

export type ApprovalStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revision_requested'

export type MeetingStatus = 'scheduled' | 'invitations_sent' | 'pending_votes' | 'completed' | 'cancelled'

export type AreaStatus = 'not_started' | 'in_progress' | 'awaiting_approval' | 'completed'

export type Permission = 'create' | 'edit' | 'delete' | 'approve' | 'view_all' | 'manage_members' | 'manage_settings'

export interface User {
  id: string
  email: string
  fullName?: string
  phone?: string
  company?: string
  role?: string
  isActive: boolean
  isSuperAdmin?: boolean
  createdAt: string
  signatureUrl?: string
  avatarUrl?: string
}

export interface Invitation {
  id: string
  projectId: string
  email: string
  role: string
  token: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  inviteUrl: string
  invitedById: string
  expiresAt: string
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
  description?: string
  address?: string
  startDate?: string
  estimatedEndDate?: string
  status: 'active' | 'on_hold' | 'completed' | 'archived'
  completionPercentage?: number
  createdAt: string
  updatedAt: string
  members?: ProjectMember[]
  locationLat?: number
  locationLng?: number
  locationAddress?: string
  imageUrl?: string
  website?: string
  notificationDigestIntervalHours?: number
  lastDigestSentAt?: string
}

export interface LinkedUser {
  id: string
  email: string
  fullName?: string
}

export interface Contact {
  id: string
  projectId: string
  contactType: string
  companyName?: string
  contactName: string
  email?: string
  phone?: string
  roleDescription?: string
  isPrimary: boolean
  userId?: string
  user?: LinkedUser
  pendingApprovalsCount?: number
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

export interface MeetingTimeSlot {
  id: string
  meetingId: string
  slotNumber: number
  proposedStart: string
  proposedEnd?: string
  voteCount: number
}

export interface MeetingTimeVote {
  id: string
  meetingId: string
  attendeeId: string
  timeSlotId?: string
  votedAt?: string
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
  hasTimeSlots: boolean
  calendarSynced: boolean
  meetingFormat?: 'in_person' | 'online' | 'hybrid'
  onlineLink?: string
  createdAt: string
  createdBy?: User
  attendees?: MeetingAttendee[]
  timeSlots?: MeetingTimeSlot[]
  timeVotes?: MeetingTimeVote[]
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
  approvedById?: string
  approvedBy?: User
  approverRole?: UserRole
  contactId?: string
  status: ApprovalStatus
  comments?: string
  approvedAt?: string
  createdAt?: string
}

export interface ConstructionArea {
  id: string
  projectId: string
  parentId?: string
  name: string
  areaType?: string
  areaLevel?: string
  status?: string
  order?: number
  floorNumber?: number
  areaCode?: string
  totalUnits?: number
  currentProgress?: number
  children?: ConstructionArea[]
  progressUpdates?: AreaProgress[]
}

export interface AreaProgress {
  id: string
  areaId: string
  progressPercentage: number
  notes?: string
  photos?: string[]
  reportedAt: string
  reportedBy?: User
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

export interface TeamMember {
  id: string
  userId: string
  user: User
  role: UserRole
  teamName?: string
  availableHours: number
  assignedHours: number
  workloadPercent: number
  assignments?: WorkloadAssignment[]
  createdAt: string
}

export interface Workload {
  id: string
  teamMemberId: string
  teamMember?: TeamMember
  periodStart: string
  periodEnd: string
  totalAssignedHours: number
  totalAvailableHours: number
  workloadPercent: number
  assignments: WorkloadAssignment[]
  createdAt: string
  updatedAt: string
}

export interface WorkloadAssignment {
  id: string
  type: 'meeting' | 'inspection' | 'approval' | 'task'
  entityId: string
  title: string
  estimatedHours: number
  scheduledDate?: string
  status: string
}

export interface FileRecord {
  id: string
  projectId: string
  entityType: string
  entityId: string
  filename: string
  fileType: string
  fileSize: number
  storagePath: string
  uploadedBy?: User
  uploadedAt: string
  folderId?: string
}

export interface Folder {
  id: string
  projectId: string
  name: string
  parentId?: string
  children?: Folder[]
  createdAt: string
  updatedAt: string
}

// Checklist types use snake_case intentionally because backend schemas use BaseModel (not CamelCaseModel)
export interface ChecklistItemTemplate {
  id: string
  subsection_id: string
  name: string
  category?: string
  description?: string
  must_image: boolean
  must_note: boolean
  must_signature: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface ChecklistSubSection {
  id: string
  template_id: string
  name: string
  order: number
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  items: ChecklistItemTemplate[]
}

export interface ChecklistTemplate {
  id: string
  project_id?: string
  name: string
  level: string
  group: string
  category?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  created_by?: User
  subsections: ChecklistSubSection[]
}

export interface ChecklistTemplateCreate {
  name: string
  level: string
  group: string
  category?: string
  metadata?: Record<string, unknown>
}

export interface ChecklistTemplateUpdate {
  name?: string
  level?: string
  group?: string
  category?: string
  metadata?: Record<string, unknown>
}

export interface ChecklistInstance {
  id: string
  template_id: string
  project_id: string
  unit_identifier: string
  area_id?: string
  status: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
  created_by?: User
  responses: ChecklistItemResponse[]
}

export interface ChecklistInstanceCreate {
  template_id: string
  unit_identifier: string
  area_id?: string
}

export interface ChecklistInstanceUpdate {
  unit_identifier?: string
  status?: string
  area_id?: string
}

export interface BuildingDefinition {
  name: string
  floorCount: number
  hasBasement: boolean
  hasParking: boolean
  hasLobby: boolean
}

export interface FloorDefinition {
  buildingIndex: number
  floorNumber: number
  unitCount: number
  unitType: string
}

export interface CommonAreaDefinition {
  name: string
  areaType: string
}

export interface AreaChecklistAssignment {
  id: string
  projectId: string
  areaType: string
  templateId: string
  autoCreate: boolean
  createdAt: string
  createdById?: string
}

export interface BulkAreaNode {
  name: string
  area_type?: string
  area_level?: string
  floor_number?: number
  area_code?: string
  total_units?: number
  children?: BulkAreaNode[]
}

export interface BulkAreaCreate {
  areas: BulkAreaNode[]
  auto_assign_checklists: boolean
}

export interface BulkAreaCreateResponse {
  createdCount: number
  checklistInstancesCreated: number
  areas: ConstructionArea[]
}

export interface AreaChecklistSummary {
  totalInstances: number
  completedInstances: number
  totalItems: number
  completedItems: number
  completionPercentage: number
}

export interface ChecklistItemResponse {
  id: string
  instance_id: string
  item_template_id: string
  status: 'pending' | 'approved' | 'rejected' | 'not_applicable'
  notes?: string
  image_urls?: string[]
  signature_url?: string
  completed_at?: string
  completed_by_id?: string
  created_at: string
  updated_at: string
}

export interface ChecklistItemResponseCreate {
  item_template_id: string
  status?: string
  notes?: string
  image_urls?: string[]
  signature_url?: string
}

export interface ChecklistItemResponseUpdate {
  status?: string
  notes?: string
  image_urls?: string[]
  signature_url?: string
}

export interface InspectionHistoryEvent {
  id: string
  entityType: string
  entityId: string
  action: string
  userId?: string
  user?: User
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  createdAt: string
}

export type TranslationStatus = 'uploaded' | 'translating' | 'complete' | 'failed'

export interface BimModel {
  id: string
  projectId: string
  filename: string
  fileSize?: number
  storagePath?: string
  urn?: string
  translationStatus: TranslationStatus
  translationProgress: number
  metadataJson?: Record<string, unknown>
  uploadedById?: string
  uploadedBy?: User
  createdAt: string
  updatedAt: string
}

export interface BimExtractedArea {
  bimObjectId: number
  name: string
  areaType?: string
  floorNumber?: number
  areaCode?: string
}

export interface BimExtractedEquipment {
  bimObjectId: number
  name: string
  equipmentType?: string
  manufacturer?: string
  modelNumber?: string
  specifications?: Record<string, unknown>
}

export interface BimExtractedMaterial {
  bimObjectId: number
  name: string
  materialType?: string
  manufacturer?: string
  modelNumber?: string
}

export interface BimExtractionResponse {
  modelId: string
  extractedAt?: string
  areas: BimExtractedArea[]
  equipment: BimExtractedEquipment[]
  materials: BimExtractedMaterial[]
  totalObjects: number
}

export interface BimImportResult {
  importedCount: number
  skippedCount: number
  entityType: string
}

export interface ContactGroupListItem {
  id: string
  projectId: string
  name: string
  description?: string
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface ContactGroup {
  id: string
  projectId: string
  name: string
  description?: string
  contacts: Contact[]
  createdAt: string
  updatedAt: string
}

export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type DefectSeverity = 'low' | 'medium' | 'high' | 'critical'
export type DefectCategory =
  | 'concrete_structure' | 'structural' | 'wet_room_waterproofing' | 'plaster'
  | 'roof' | 'roof_waterproofing' | 'painting' | 'plumbing' | 'flooring'
  | 'tiling' | 'fire_passage_sealing' | 'fire_safety' | 'building_general'
  | 'moisture' | 'waterproofing' | 'insulation' | 'hvac' | 'electrical'
  | 'lighting' | 'solar_system' | 'windows_doors' | 'drainage' | 'elevator'
  | 'gas' | 'accessibility' | 'exterior_cladding' | 'landscaping' | 'other'

export interface DefectContactBrief {
  id: string
  contactName: string
  companyName?: string
  email?: string
  phone?: string
}

export interface DefectAreaBrief {
  id: string
  name: string
  areaCode?: string
  floorNumber?: number
}

export interface DefectAssignee {
  id: string
  contactId: string
  contact?: DefectContactBrief
}

export interface Defect {
  id: string
  projectId: string
  defectNumber: number
  category: DefectCategory
  defectType: string
  description: string
  areaId?: string
  status: DefectStatus
  severity: DefectSeverity
  isRepeated: boolean
  dueDate?: string
  resolvedAt?: string
  reporterId?: string
  assignedContactId?: string
  followupContactId?: string
  checklistInstanceId?: string
  createdById: string
  createdAt: string
  updatedAt: string
  area?: DefectAreaBrief
  reporter?: DefectContactBrief
  assignedContact?: DefectContactBrief
  followupContact?: DefectContactBrief
  createdBy?: User
  assignees: DefectAssignee[]
}

export interface DefectSummary {
  total: number
  openCount: number
  inProgressCount: number
  resolvedCount: number
  closedCount: number
  criticalCount: number
  highCount: number
  byCategory: Record<string, number>
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  projectId: string
  taskNumber: number
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId?: string
  reporterId?: string
  startDate?: string
  dueDate?: string
  completedAt?: string
  estimatedHours?: number
  actualHours?: number
  createdById: string
  createdAt: string
  updatedAt: string
  assignee?: User
  reporter?: User
  createdBy?: User
  dependencies: TaskDependency[]
}

export interface TaskDependency {
  id: string
  taskId: string
  dependsOnId: string
  dependencyType: string
}

export interface TaskSummary {
  total: number
  notStartedCount: number
  inProgressCount: number
  completedCount: number
  onHoldCount: number
  overdueCount: number
}

export type BudgetCategory = 'labor' | 'materials' | 'equipment' | 'subcontractor' | 'permits' | 'overhead' | 'other'
export type ChangeOrderStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

export interface BudgetLineItem {
  id: string
  projectId: string
  name: string
  category: BudgetCategory
  description?: string
  budgetedAmount: number
  sortOrder: number
  actualAmount: number
  remainingAmount: number
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface CostEntry {
  id: string
  budgetItemId: string
  projectId: string
  description?: string
  amount: number
  entryDate: string
  vendor?: string
  referenceNumber?: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface ChangeOrder {
  id: string
  projectId: string
  changeOrderNumber: number
  title: string
  description?: string
  amount: number
  status: ChangeOrderStatus
  budgetItemId?: string
  requestedById?: string
  approvedById?: string
  requestedDate?: string
  approvedDate?: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export interface BudgetSummary {
  totalBudgeted: number
  totalActual: number
  totalVariance: number
  totalChangeOrders: number
  approvedChangeOrders: number
  lineItemCount: number
  costEntryCount: number
}

export interface Organization {
  id: string
  name: string
  code: string
  description?: string
  logoUrl?: string
  settings?: Record<string, unknown>
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: 'org_admin' | 'org_member'
  addedAt: string
  user?: User
}

export interface QuantityDoorWindow {
  doorType?: string
  windowType?: string
  widthCm?: number
  heightCm?: number
  quantity: number
}

export interface QuantityRoomFinishes {
  floorMaterial?: string
  wallMaterial?: string
  ceilingMaterial?: string
}

export interface QuantityRoomData {
  name: string
  roomType?: string
  areaSqm?: number
  perimeterM?: number
  heightM?: number
  doors: QuantityDoorWindow[]
  windows: QuantityDoorWindow[]
  finishes?: QuantityRoomFinishes
}

export interface QuantityFloorData {
  floorNumber: number
  floorName?: string
  totalAreaSqm?: number
  rooms: QuantityRoomData[]
}

export interface QuantitySummary {
  totalFloors: number
  totalRooms: number
  totalAreaSqm: number
  totalDoors: number
  totalWindows: number
}

export interface QuantityExtractionResponse {
  floors: QuantityFloorData[]
  summary: QuantitySummary
  processingTimeMs: number
}

export interface CustomKpiDefinition {
  id: string
  projectId?: string
  name: string
  description?: string
  kpiType: string
  entityType: string
  filterConfig?: Record<string, unknown>
  calculation: string
  fieldName?: string
  targetValue?: number
  warningThreshold?: number
  unit?: string
  displayOrder: number
  isActive: boolean
  icon?: string
  color?: string
  createdById: string
  createdAt: string
  updatedAt: string
}

export type KpiStatus = 'on_track' | 'warning' | 'off_track' | 'no_target'

export interface KpiSnapshotPoint {
  snapshotDate: string
  value: number
}

export interface KpiValue {
  kpiId: string
  name: string
  value: number
  entityType: string
  kpiType: string
  targetValue?: number
  warningThreshold?: number
  unit?: string
  icon?: string
  color?: string
  status: KpiStatus
  trend: KpiSnapshotPoint[]
}

export interface KpiSnapshot {
  kpiId: string
  value: number
  snapshotDate: string
}
