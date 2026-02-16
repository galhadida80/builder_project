import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import TeamWorkloadView from './TeamWorkloadView'
import { workloadApi } from '../api/workload'
import type { TeamMember } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}))

vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ selectedProjectId: 'proj-1' }),
}))

vi.mock('../components/common/ToastProvider', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}))

vi.mock('../api/workload', () => ({
  workloadApi: { getTeamMembers: vi.fn() },
}))

vi.mock('../components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  KPICard: ({ title, value }: { title: string; value: number | string }) => (
    <div data-testid="kpi-card"><span>{title}</span><span>{value}</span></div>
  ),
}))

vi.mock('../components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state"><span>{title}</span>{description && <span>{description}</span>}</div>
  ),
}))

const makeMember = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 'member-1',
  userId: 'user-1',
  user: { id: 'user-1', email: 'alice@test.com', fullName: 'Alice', isActive: true, createdAt: '2024-01-01' },
  role: 'inspector',
  teamName: 'Structural',
  availableHours: 40,
  assignedHours: 30,
  workloadPercent: 75,
  createdAt: '2024-01-01',
  ...overrides,
})

const mockMembers: TeamMember[] = [
  makeMember({ id: 'm1', userId: 'u1', teamName: 'Structural', workloadPercent: 75, assignedHours: 30, availableHours: 40 }),
  makeMember({ id: 'm2', userId: 'u2', user: { id: 'u2', email: 'bob@t.com', fullName: 'Bob', isActive: true, createdAt: '2024-01-01' }, teamName: 'Structural', workloadPercent: 110, assignedHours: 44, availableHours: 40 }),
  makeMember({ id: 'm3', userId: 'u3', user: { id: 'u3', email: 'carol@t.com', fullName: 'Carol', isActive: true, createdAt: '2024-01-01' }, teamName: 'Electrical', workloadPercent: 50, assignedHours: 20, availableHours: 40 }),
]

describe('TeamWorkloadView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(workloadApi.getTeamMembers).mockResolvedValue(mockMembers as never)
  })

  it('shows loading skeletons initially', () => {
    const { container } = renderWithProviders(<TeamWorkloadView />)
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('renders title and subtitle after loading', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.title')).toBeInTheDocument()
    })
    expect(screen.getByText('teamWorkload.subtitle')).toBeInTheDocument()
  })

  it('renders 4 KPI cards', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getAllByTestId('kpi-card')).toHaveLength(4)
    })
  })

  it('displays team members KPI', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.teamMembers')).toBeInTheDocument()
    })
  })

  it('displays avg workload KPI', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.avgWorkload')).toBeInTheDocument()
    })
  })

  it('displays over capacity KPI', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.overCapacity')).toBeInTheDocument()
    })
  })

  it('renders table with all team members', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('renders table headers', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.memberName')).toBeInTheDocument()
    })
    expect(screen.getByText('teamWorkload.role')).toBeInTheDocument()
    expect(screen.getByText('teamWorkload.team')).toBeInTheDocument()
    expect(screen.getByText('teamCard.assigned')).toBeInTheDocument()
    expect(screen.getByText('teamCard.available')).toBeInTheDocument()
    expect(screen.getByText('teamCard.utilization')).toBeInTheDocument()
  })

  it('renders overall capacity progress bar', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.overallCapacity')).toBeInTheDocument()
    })
  })

  it('renders team overview section', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.teamOverview')).toBeInTheDocument()
    })
  })

  it('shows empty state when no team members', async () => {
    vi.mocked(workloadApi.getTeamMembers).mockResolvedValue([])
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.noMembers')).toBeInTheDocument()
    })
  })

  it('calls workload API on mount', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(workloadApi.getTeamMembers).toHaveBeenCalled()
    })
  })

  it('handles API error gracefully', async () => {
    vi.mocked(workloadApi.getTeamMembers).mockRejectedValue(new Error('Fail'))
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('teamWorkload.noMembers')).toBeInTheDocument()
    })
  })

  it('sorts members by workload descending', async () => {
    renderWithProviders(<TeamWorkloadView />)
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument()
    })
    const rows = screen.getAllByRole('row')
    const dataRows = rows.slice(1)
    expect(dataRows[0]).toHaveTextContent('Bob')
    expect(dataRows[1]).toHaveTextContent('Alice')
    expect(dataRows[2]).toHaveTextContent('Carol')
  })
})
