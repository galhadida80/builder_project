import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import ProjectManagerDashboard from './ProjectManagerDashboard'
import { projectsApi } from '../api/projects'
import { workloadApi } from '../api/workload'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => opts?.defaultValue ? String(opts.defaultValue) : key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('../components/common/ToastProvider', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}))

vi.mock('../api/projects', () => ({ projectsApi: { list: vi.fn() } }))
vi.mock('../api/workload', () => ({ workloadApi: { getTeamMembers: vi.fn() } }))

vi.mock('../components/ui/Card', () => ({
  Card: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <div data-testid="card" onClick={onClick}>{children}</div>
  ),
  KPICard: ({ title, value }: { title: string; value: number | string }) => (
    <div data-testid="kpi-card"><span>{title}</span><span>{value}</span></div>
  ),
}))

vi.mock('../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('../components/ui/Breadcrumbs', () => ({
  PageHeader: ({ title }: { title: string }) => <h1 data-testid="page-header">{title}</h1>,
}))

vi.mock('../components/ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}))

vi.mock('../components/ui/ProgressBar', () => ({
  ProgressBar: ({ value }: { value: number }) => <div data-testid="progress-bar" data-value={value} />,
}))

vi.mock('../components/ui/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}))

const mockProjects = [
  { id: 'p1-abc-def', name: 'Tower Alpha', status: 'active', completionPercentage: 45, startDate: '2024-01-01', estimatedEndDate: '2025-01-01', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'p2-xyz-ghi', name: 'Bridge Beta', status: 'active', completionPercentage: 80, startDate: '2024-03-01', estimatedEndDate: '2025-06-01', createdAt: '2024-03-01', updatedAt: '2024-03-01' },
]

const mockTeam = [
  { id: 'tm-1', userId: 'u1', user: { id: 'u1', fullName: 'Alice', email: 'a@t.com', isActive: true, createdAt: '2024-01-01' }, role: 'inspector', workloadPercent: 70, assignedHours: 28, availableHours: 40, createdAt: '2024-01-01' },
  { id: 'tm-2', userId: 'u2', user: { id: 'u2', fullName: 'Bob', email: 'b@t.com', isActive: true, createdAt: '2024-01-01' }, role: 'supervisor', workloadPercent: 95, assignedHours: 38, availableHours: 40, createdAt: '2024-01-01' },
]

describe('ProjectManagerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(projectsApi.list).mockResolvedValue(mockProjects as never)
    vi.mocked(workloadApi.getTeamMembers).mockResolvedValue(mockTeam as never)
  })

  it('shows loading skeletons initially', () => {
    const { container } = renderWithProviders(<ProjectManagerDashboard />)
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('renders page header', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('pmDashboard.title')).toBeInTheDocument()
    })
  })

  it('renders 4 KPI cards after loading', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getAllByTestId('kpi-card')).toHaveLength(4)
    })
  })

  it('displays active projects KPI', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('pmDashboard.activeProjects')).toBeInTheDocument()
    })
  })

  it('displays team members KPI', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('pmDashboard.teamMembers')).toBeInTheDocument()
    })
  })

  it('renders project cards', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Tower Alpha')).toBeInTheDocument()
      expect(screen.getByText('Bridge Beta')).toBeInTheDocument()
    })
  })

  it('shows project short IDs', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('P1-ABC-D')).toBeInTheDocument()
      expect(screen.getByText('P2-XYZ-G')).toBeInTheDocument()
    })
  })

  it('renders team workload section', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('pmDashboard.teamWorkload')).toBeInTheDocument()
    })
  })

  it('renders team member cards', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
  })

  it('shows empty state when no projects', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([])
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('pmDashboard.noProjects')).toBeInTheDocument()
    })
  })

  it('shows empty state when no team members', async () => {
    vi.mocked(workloadApi.getTeamMembers).mockResolvedValue([])
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.getByText('pmDashboard.noTeamMembers')).toBeInTheDocument()
    })
  })

  it('calls APIs on mount', async () => {
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(projectsApi.list).toHaveBeenCalled()
      expect(workloadApi.getTeamMembers).toHaveBeenCalled()
    })
  })

  it('handles API error gracefully', async () => {
    vi.mocked(projectsApi.list).mockRejectedValue(new Error('Fail'))
    renderWithProviders(<ProjectManagerDashboard />)
    await waitFor(() => {
      expect(screen.queryByText('Tower Alpha')).not.toBeInTheDocument()
    })
  })
})
