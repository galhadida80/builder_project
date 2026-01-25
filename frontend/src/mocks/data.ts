import type { Project, User, Contact, Equipment, Material, Meeting, ConstructionArea, ApprovalRequest, AuditLog } from '../types'

export const mockUsers: User[] = [
  { id: '1', email: 'admin@builder.com', fullName: 'David Cohen', phone: '050-1234567', company: 'Builder Pro Ltd', isActive: true, createdAt: '2024-01-01T00:00:00Z' },
  { id: '2', email: 'contractor@builder.com', fullName: 'Moshe Levy', phone: '050-2345678', company: 'Levy Construction', isActive: true, createdAt: '2024-01-02T00:00:00Z' },
  { id: '3', email: 'consultant@builder.com', fullName: 'Sarah Mizrahi', phone: '050-3456789', company: 'SM Engineering', isActive: true, createdAt: '2024-01-03T00:00:00Z' },
  { id: '4', email: 'inspector@builder.com', fullName: 'Yossi Ben-David', phone: '050-4567890', company: 'City Inspections', isActive: true, createdAt: '2024-01-04T00:00:00Z' },
]

export const mockProjects: Project[] = [
  { id: '1', name: 'Ramat Aviv Tower', code: 'RAT-001', description: 'Luxury residential tower with 40 floors', address: '123 Ramat Aviv, Tel Aviv', startDate: '2024-01-15', estimatedEndDate: '2026-06-30', status: 'active', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
  { id: '2', name: 'Herzliya Marina Complex', code: 'HMC-002', description: 'Mixed-use development with offices and retail', address: '45 Marina Blvd, Herzliya', startDate: '2024-03-01', estimatedEndDate: '2025-12-31', status: 'active', createdAt: '2024-02-01T00:00:00Z', updatedAt: '2024-03-01T00:00:00Z' },
  { id: '3', name: 'Jerusalem Heights', code: 'JH-003', description: 'Residential project with 120 units', address: '78 King David St, Jerusalem', startDate: '2023-06-01', estimatedEndDate: '2025-03-31', status: 'active', createdAt: '2023-05-01T00:00:00Z', updatedAt: '2024-01-10T00:00:00Z' },
]

export const mockContacts: Contact[] = [
  { id: '1', projectId: '1', contactType: 'contractor', companyName: 'Levy Construction', contactName: 'Moshe Levy', email: 'moshe@levy.co.il', phone: '050-2345678', roleDescription: 'Main contractor', isPrimary: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: '2', projectId: '1', contactType: 'consultant', companyName: 'SM Engineering', contactName: 'Sarah Mizrahi', email: 'sarah@sm-eng.co.il', phone: '050-3456789', roleDescription: 'Structural engineer', isPrimary: true, createdAt: '2024-01-15T00:00:00Z' },
  { id: '3', projectId: '1', contactType: 'inspector', companyName: 'City Inspections', contactName: 'Yossi Ben-David', email: 'yossi@cityinsp.gov.il', phone: '050-4567890', roleDescription: 'Building inspector', isPrimary: false, createdAt: '2024-01-16T00:00:00Z' },
  { id: '4', projectId: '1', contactType: 'engineer', companyName: 'Electric Pro', contactName: 'Avi Goldstein', email: 'avi@electricpro.co.il', phone: '050-5678901', roleDescription: 'Electrical engineer', isPrimary: false, createdAt: '2024-01-17T00:00:00Z' },
]

export const mockEquipment: Equipment[] = [
  { id: '1', projectId: '1', name: 'Tower Crane TC-500', equipmentCode: 'EQ-001', category: 'Heavy Machinery', manufacturer: 'Liebherr', model: 'TC-500', serialNumber: 'LH2024001', status: 'approved', location: 'Building A - North', createdAt: '2024-01-20T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z', createdBy: mockUsers[1] },
  { id: '2', projectId: '1', name: 'Concrete Pump CP-200', equipmentCode: 'EQ-002', category: 'Heavy Machinery', manufacturer: 'Putzmeister', model: 'CP-200', serialNumber: 'PM2024002', status: 'under_review', location: 'Site Entrance', createdAt: '2024-02-05T00:00:00Z', updatedAt: '2024-02-10T00:00:00Z', createdBy: mockUsers[1] },
  { id: '3', projectId: '1', name: 'Passenger Hoist PH-100', equipmentCode: 'EQ-003', category: 'Lifting Equipment', manufacturer: 'Alimak', model: 'PH-100', serialNumber: 'AL2024003', status: 'submitted', location: 'Building A - East', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-15T00:00:00Z', createdBy: mockUsers[1] },
  { id: '4', projectId: '1', name: 'Generator 500KVA', equipmentCode: 'EQ-004', category: 'Power Equipment', manufacturer: 'Caterpillar', model: 'G500', serialNumber: 'CAT2024004', status: 'draft', location: 'Power Station', createdAt: '2024-02-20T00:00:00Z', updatedAt: '2024-02-20T00:00:00Z', createdBy: mockUsers[1] },
]

export const mockMaterials: Material[] = [
  { id: '1', projectId: '1', name: 'Reinforcement Steel B500', materialCode: 'MAT-001', category: 'Structural', supplier: 'Israel Steel Ltd', unit: 'ton', quantityOrdered: 500, quantityReceived: 350, unitPrice: 4500, status: 'approved', deliveryDate: '2024-02-01', createdAt: '2024-01-25T00:00:00Z', updatedAt: '2024-02-01T00:00:00Z', createdBy: mockUsers[1] },
  { id: '2', projectId: '1', name: 'Ready-Mix Concrete C30', materialCode: 'MAT-002', category: 'Structural', supplier: 'Readymix Industries', unit: 'm3', quantityOrdered: 2000, quantityReceived: 1200, unitPrice: 450, status: 'approved', deliveryDate: '2024-01-20', createdAt: '2024-01-18T00:00:00Z', updatedAt: '2024-01-20T00:00:00Z', createdBy: mockUsers[1] },
  { id: '3', projectId: '1', name: 'Aluminum Window Frames', materialCode: 'MAT-003', category: 'Finishing', supplier: 'Aluminco', unit: 'unit', quantityOrdered: 400, quantityReceived: 0, unitPrice: 2800, status: 'submitted', deliveryDate: '2024-04-01', createdAt: '2024-02-10T00:00:00Z', updatedAt: '2024-02-10T00:00:00Z', createdBy: mockUsers[1] },
  { id: '4', projectId: '1', name: 'Fire-Rated Doors', materialCode: 'MAT-004', category: 'Safety', supplier: 'SafeDoor Ltd', unit: 'unit', quantityOrdered: 80, quantityReceived: 0, unitPrice: 3500, status: 'under_review', deliveryDate: '2024-05-01', createdAt: '2024-02-15T00:00:00Z', updatedAt: '2024-02-18T00:00:00Z', createdBy: mockUsers[1] },
]

export const mockMeetings: Meeting[] = [
  { id: '1', projectId: '1', title: 'Weekly Site Coordination', description: 'Regular weekly meeting to review progress', meetingType: 'coordination', location: 'Site Office', startTime: '2024-02-26T09:00:00Z', endTime: '2024-02-26T10:30:00Z', status: 'scheduled', createdAt: '2024-02-20T00:00:00Z', createdBy: mockUsers[0] },
  { id: '2', projectId: '1', title: 'Crane Installation Inspection', description: 'Safety inspection for tower crane', meetingType: 'site_inspection', location: 'Building A - North', startTime: '2024-02-27T14:00:00Z', endTime: '2024-02-27T16:00:00Z', status: 'scheduled', createdAt: '2024-02-21T00:00:00Z', createdBy: mockUsers[0] },
  { id: '3', projectId: '1', title: 'Material Approval Review', description: 'Review pending material approvals', meetingType: 'approval_meeting', location: 'Main Office', startTime: '2024-02-28T11:00:00Z', endTime: '2024-02-28T12:00:00Z', status: 'invitations_sent', createdAt: '2024-02-22T00:00:00Z', createdBy: mockUsers[0] },
]

export const mockAreas: ConstructionArea[] = [
  {
    id: '1', projectId: '1', name: 'Building A', areaType: 'apartment', areaCode: 'BLD-A', totalUnits: 40,
    children: [
      { id: '1-1', projectId: '1', parentId: '1', name: 'Basement Level', areaType: 'basement', floorNumber: -1, areaCode: 'BLD-A-B1' },
      { id: '1-2', projectId: '1', parentId: '1', name: 'Ground Floor', areaType: 'common_area', floorNumber: 0, areaCode: 'BLD-A-G' },
      { id: '1-3', projectId: '1', parentId: '1', name: 'Floors 1-10', areaType: 'apartment', floorNumber: 1, areaCode: 'BLD-A-1-10', totalUnits: 20 },
      { id: '1-4', projectId: '1', parentId: '1', name: 'Floors 11-20', areaType: 'apartment', floorNumber: 11, areaCode: 'BLD-A-11-20', totalUnits: 20 },
    ]
  },
  {
    id: '2', projectId: '1', name: 'Parking Structure', areaType: 'parking', areaCode: 'PARK', totalUnits: 200,
    children: [
      { id: '2-1', projectId: '1', parentId: '2', name: 'Level P1', areaType: 'parking', floorNumber: -1, areaCode: 'PARK-P1' },
      { id: '2-2', projectId: '1', parentId: '2', name: 'Level P2', areaType: 'parking', floorNumber: -2, areaCode: 'PARK-P2' },
    ]
  },
  { id: '3', projectId: '1', name: 'External Facades', areaType: 'facade', areaCode: 'FACADE' },
  { id: '4', projectId: '1', name: 'Roof Structure', areaType: 'roof', areaCode: 'ROOF' },
]

export const mockApprovals: ApprovalRequest[] = [
  {
    id: '1', projectId: '1', entityType: 'equipment', entityId: '2', currentStatus: 'under_review', createdAt: '2024-02-05T00:00:00Z', createdBy: mockUsers[1],
    steps: [
      { id: '1-1', approvalRequestId: '1', stepOrder: 1, approverId: '3', approver: mockUsers[2], approverRole: 'consultant', status: 'approved', comments: 'Technical specs verified', decidedAt: '2024-02-08T00:00:00Z', createdAt: '2024-02-05T00:00:00Z' },
      { id: '1-2', approvalRequestId: '1', stepOrder: 2, approverId: '4', approver: mockUsers[3], approverRole: 'inspector', status: 'under_review', createdAt: '2024-02-08T00:00:00Z' },
    ]
  },
  {
    id: '2', projectId: '1', entityType: 'equipment', entityId: '3', currentStatus: 'submitted', createdAt: '2024-02-15T00:00:00Z', createdBy: mockUsers[1],
    steps: [
      { id: '2-1', approvalRequestId: '2', stepOrder: 1, approverRole: 'consultant', status: 'draft', createdAt: '2024-02-15T00:00:00Z' },
      { id: '2-2', approvalRequestId: '2', stepOrder: 2, approverRole: 'inspector', status: 'draft', createdAt: '2024-02-15T00:00:00Z' },
    ]
  },
  {
    id: '3', projectId: '1', entityType: 'material', entityId: '4', currentStatus: 'under_review', createdAt: '2024-02-15T00:00:00Z', createdBy: mockUsers[1],
    steps: [
      { id: '3-1', approvalRequestId: '3', stepOrder: 1, approverId: '3', approver: mockUsers[2], approverRole: 'consultant', status: 'under_review', createdAt: '2024-02-15T00:00:00Z' },
    ]
  },
]

export const mockAuditLogs: AuditLog[] = [
  { id: '1', projectId: '1', userId: '2', user: mockUsers[1], entityType: 'equipment', entityId: '1', action: 'create', newValues: { name: 'Tower Crane TC-500' }, createdAt: '2024-01-20T10:00:00Z' },
  { id: '2', projectId: '1', userId: '3', user: mockUsers[2], entityType: 'equipment', entityId: '1', action: 'approval', oldValues: { status: 'submitted' }, newValues: { status: 'approved' }, createdAt: '2024-02-01T14:30:00Z' },
  { id: '3', projectId: '1', userId: '2', user: mockUsers[1], entityType: 'material', entityId: '1', action: 'update', oldValues: { quantityReceived: 200 }, newValues: { quantityReceived: 350 }, createdAt: '2024-02-10T09:15:00Z' },
  { id: '4', projectId: '1', userId: '1', user: mockUsers[0], entityType: 'meeting', entityId: '1', action: 'create', newValues: { title: 'Weekly Site Coordination' }, createdAt: '2024-02-20T11:00:00Z' },
]

export const currentUser: User = mockUsers[0]
