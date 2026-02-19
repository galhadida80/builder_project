import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import DashboardPage from './DashboardPage'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { meetingsApi } from '../api/meetings'
import { approvalsApi } from '../api/approvals'
import { auditApi } from '../api/audit'
import { workloadApi } from '../api/workload'
import { dashboardStatsApi } from '../api/dashboardStats'

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => opts?.defaultValue ? String(opts.defaultValue) : key,
      i18n: { language: 'en' },
    }),
  }
})

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ selectedProjectId: 'test-project-id' }),
}))

vi.mock('../components/common/ToastProvider', () => ({
  useToast: () => ({ showError: vi.fn(), showWarning: vi.fn(), showSuccess: vi.fn() }),
}))

vi.mock('../api/equipment', () => ({ equipmentApi: { list: vi.fn() } }))
vi.mock('../api/materials', () => ({ materialsApi: { list: vi.fn() } }))
vi.mock('../api/meetings', () => ({ meetingsApi: { list: vi.fn() } }))
vi.mock('../api/approvals', () => ({ approvalsApi: { list: vi.fn() } }))
vi.mock('../api/audit', () => ({ auditApi: { listAll: vi.fn(), listByProject: vi.fn() } }))
vi.mock('../api/workload', () => ({ workloadApi: { getTeamMembers: vi.fn() } }))
vi.mock('../api/dashboardStats', () => ({ dashboardStatsApi: { getStats: vi.fn() } }))

vi.mock('@mui/x-charts/BarChart', () => ({
  BarChart: () => <div data-testid="bar-chart" />,
}))

vi.mock('../pages/Analytics/components/DistributionChart', () => ({
  default: () => <div data-testid="distribution-chart" />,
}))

vi.mock('../pages/Analytics/components/ProjectMetricsChart', () => ({
  default: () => <div data-testid="project-metrics-chart" />,
}))

vi.mock('../components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  KPICard: ({ title, value }: { title: string; value: number | string }) => (
    <div data-testid="kpi-card"><span>{title}</span><span>{value}</span></div>
  ),
}))

vi.mock('../components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}))

vi.mock('../components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
  AvatarGroup: ({ users }: { users: { name: string }[] }) => <div data-testid="avatar-group">{users.length}</div>,
}))

vi.mock('../components/ui/ProgressBar', () => ({
  ProgressBar: ({ value }: { value: number }) => <div data-testid="progress-bar" data-value={value} />,
  CircularProgressDisplay: ({ value }: { value: number }) => <div data-testid="circular-progress">{value}%</div>,
}))

vi.mock('../components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}))

vi.mock('../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

const mockEquipment = {
  items: [
    { id: 'eq-1', projectId: 'p1', name: 'Crane A', status: 'approved', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
    { id: 'eq-2', projectId: 'p1', name: 'Crane B', status: 'submitted', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  total: 2, page: 1, page_size: 20, total_pages: 1,
}

const mockMaterials = {
  items: [
    { id: 'mat-1', projectId: 'p1', name: 'Steel', status: 'approved', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  ],
  total: 1, page: 1, page_size: 20, total_pages: 1,
}

const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
const mockMeetings = [
  { id: 'mtg-1', projectId: 'p1', title: 'Site Review', status: 'scheduled', scheduledDate: threeDaysFromNow, createdAt: '2024-01-01' },
]

const mockApprovals = [
  { id: 'appr-1', projectId: 'p1', entityType: 'equipment', entityId: 'eq-2', currentStatus: 'submitted', createdAt: '2024-01-01', steps: [{ id: 's1', approvalRequestId: 'appr-1', stepOrder: 1, status: 'submitted', createdAt: '2024-01-01' }] },
]

const mockAuditLogs = [
  { id: 'log-1', entityType: 'equipment', entityId: 'eq-1', action: 'create', createdAt: '2024-01-01T10:00:00Z', user: { id: 'u1', fullName: 'John', email: 'j@t.com', isActive: true, createdAt: '2024-01-01' } },
]

const mockTeam = [
  { id: 'tm-1', userId: 'u1', user: { id: 'u1', fullName: 'Alice', email: 'a@t.com', isActive: true, createdAt: '2024-01-01' }, role: 'inspector', workloadPercent: 70, assignedHours: 28, availableHours: 40, createdAt: '2024-01-01' },
]

const mockDashboardStats = {
  equipmentDistribution: [],
  materialDistribution: [],
  rfiDistribution: [],
  findingsSeverity: [],
  weeklyActivity: [],
  areaProgressByFloor: [],
  overallProgress: 0,
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(equipmentApi.list).mockResolvedValue(mockEquipment as never)
    vi.mocked(materialsApi.list).mockResolvedValue(mockMaterials as never)
    vi.mocked(meetingsApi.list).mockResolvedValue(mockMeetings as never)
    vi.mocked(approvalsApi.list).mockResolvedValue(mockApprovals as never)
    vi.mocked(auditApi.listByProject).mockResolvedValue(mockAuditLogs as never)
    vi.mocked(auditApi.listAll).mockResolvedValue(mockAuditLogs as never)
    vi.mocked(workloadApi.getTeamMembers).mockResolvedValue(mockTeam as never)
    vi.mocked(dashboardStatsApi.getStats).mockResolvedValue(mockDashboardStats as never)
  })

  it('shows loading skeletons initially', () => {
    const { container } = renderWithProviders(<DashboardPage />)
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('renders title and subtitle after loading', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.title')).toBeInTheDocument()
    })
    expect(screen.getByText('dashboard.overviewSubtitle')).toBeInTheDocument()
  })

  it('renders 4 KPI cards', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getAllByTestId('kpi-card')).toHaveLength(4)
    })
  })

  it('displays equipment count KPI', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.equipmentItems')).toBeInTheDocument()
    })
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('displays pending approvals count', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getAllByText('dashboard.pendingApprovals').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('renders completion rate section', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.completionRate')).toBeInTheDocument()
    })
    expect(screen.getAllByTestId('circular-progress').length).toBeGreaterThanOrEqual(1)
  })

  it('renders quick actions section', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.quickActions')).toBeInTheDocument()
    })
    expect(screen.getByText('dashboard.addEquipment')).toBeInTheDocument()
    expect(screen.getByText('dashboard.addMaterial')).toBeInTheDocument()
    expect(screen.getByText('dashboard.scheduleMeeting')).toBeInTheDocument()
    expect(screen.getByText('dashboard.newInspection')).toBeInTheDocument()
  })

  it('renders upcoming meetings section', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getAllByText('dashboard.upcomingMeetings').length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getByText('Site Review')).toBeInTheDocument()
  })

  it('renders recent activity section', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.recentActivity')).toBeInTheDocument()
    })
  })

  it('renders team overview section', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.teamOverview')).toBeInTheDocument()
    })
    expect(screen.getByTestId('avatar-group')).toBeInTheDocument()
  })

  it('shows empty meetings state when no meetings', async () => {
    vi.mocked(meetingsApi.list).mockResolvedValue([])
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.noMeetingsScheduled')).toBeInTheDocument()
    })
  })

  it('shows empty activity state when no audit logs', async () => {
    vi.mocked(auditApi.listByProject).mockResolvedValue([])
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.noActivityYet')).toBeInTheDocument()
    })
  })

  it('shows empty approvals state when all approved', async () => {
    vi.mocked(approvalsApi.list).mockResolvedValue([
      { id: 'a1', projectId: 'p1', entityType: 'equipment', entityId: 'eq-1', currentStatus: 'approved', createdAt: '2024-01-01', steps: [] },
    ] as never)
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('dashboard.allCaughtUp')).toBeInTheDocument()
    })
  })

  it('calls all APIs on mount', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(equipmentApi.list).toHaveBeenCalled()
      expect(materialsApi.list).toHaveBeenCalled()
      expect(meetingsApi.list).toHaveBeenCalled()
      expect(approvalsApi.list).toHaveBeenCalled()
      expect(auditApi.listByProject).toHaveBeenCalled()
      expect(workloadApi.getTeamMembers).toHaveBeenCalled()
    })
  })

  it('handles API error gracefully', async () => {
    vi.mocked(equipmentApi.list).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.queryByText('dashboard.title')).not.toBeInTheDocument()
    })
  })
})
