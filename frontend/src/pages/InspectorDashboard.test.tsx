import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import InspectorDashboard from './InspectorDashboard'
import { inspectionsApi } from '../api/inspections'

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: 'en' },
    }),
  }
})

vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => ({ selectedProjectId: 'test-project-id' }),
}))

vi.mock('../api/inspections', () => ({
  inspectionsApi: { getProjectInspections: vi.fn() },
}))

vi.mock('../components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
}))

vi.mock('../components/ui/Button', () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

vi.mock('../components/ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty-state"><span>{title}</span>{description && <span>{description}</span>}</div>
  ),
}))

vi.mock('../utils/dateLocale', () => ({
  getDateLocale: () => 'en-US',
}))


const today = new Date()
today.setHours(10, 0, 0, 0)

const mockInspections = [
  {
    id: 'insp-1',
    projectId: 'test-project-id',
    consultantTypeId: 'ct-1',
    scheduledDate: today.toISOString(),
    status: 'pending',
    currentStage: 'Floor 3 - East Wing',
    notes: 'Check structural integrity',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    consultantType: { id: 'ct-1', name: 'Structural Engineer', nameHe: 'מהנדס מבנים', isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  },
  {
    id: 'insp-2',
    projectId: 'test-project-id',
    consultantTypeId: 'ct-2',
    scheduledDate: today.toISOString(),
    status: 'pending',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    consultantType: { id: 'ct-2', name: 'Fire Safety', nameHe: '', isActive: true, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  },
]

describe('InspectorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue(mockInspections as never)
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true })
  })

  it('shows loading skeletons initially', () => {
    const { container } = renderWithProviders(<InspectorDashboard />)
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('renders title after loading', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('inspector.title')).toBeInTheDocument()
    })
  })

  it('renders quick action buttons', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('inspector.startInspection')).toBeInTheDocument()
    })
    expect(screen.getByText('inspector.takePhoto')).toBeInTheDocument()
    expect(screen.getByText('inspector.reportIssue')).toBeInTheDocument()
  })

  it('renders today schedule section', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('inspector.todaySchedule')).toBeInTheDocument()
    })
  })

  it('renders inspection cards with consultant type', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Structural Engineer')).toBeInTheDocument()
      expect(screen.getByText('Fire Safety')).toBeInTheDocument()
    })
  })

  it('renders Hebrew name when available', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('מהנדס מבנים')).toBeInTheDocument()
    })
  })

  it('renders inspection location', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Floor 3 - East Wing')).toBeInTheDocument()
    })
  })

  it('renders inspection notes', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('Check structural integrity')).toBeInTheDocument()
    })
  })

  it('shows empty state when no inspections today', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('inspector.noInspections')).toBeInTheDocument()
    })
  })

  it('renders current date', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      const dateText = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
      expect(screen.getByText(dateText)).toBeInTheDocument()
    })
  })

  it('calls inspections API on mount', async () => {
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(inspectionsApi.getProjectInspections).toHaveBeenCalledWith('test-project-id')
    })
  })

  it('handles API error gracefully (shows empty inspections)', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<InspectorDashboard />)
    await waitFor(() => {
      expect(screen.getByText('inspector.noInspections')).toBeInTheDocument()
    })
  })
})
