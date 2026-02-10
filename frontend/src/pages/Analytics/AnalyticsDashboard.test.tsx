import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/test-utils'
import AnalyticsDashboard from './AnalyticsDashboard'
import { analyticsService } from '../../services/analyticsService'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('../../components/common/ToastProvider', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}))

vi.mock('../../services/analyticsService', () => ({
  analyticsService: {
    getMetrics: vi.fn(),
    getTrends: vi.fn(),
    getDistributions: vi.fn(),
  },
}))

vi.mock('./components/DateRangeSelector', () => ({
  default: () => <div data-testid="date-range-selector" />,
}))

vi.mock('./components/KPICard', () => ({
  default: ({ title, value }: { title: string; value: string | number }) => (
    <div data-testid="analytics-kpi"><span>{title}</span><span>{value}</span></div>
  ),
}))

vi.mock('./components/ProjectMetricsChart', () => ({
  default: ({ title }: { title: string }) => <div data-testid="metrics-chart">{title}</div>,
}))

vi.mock('./components/DistributionChart', () => ({
  default: ({ title }: { title: string }) => <div data-testid="distribution-chart">{title}</div>,
}))

vi.mock('./components/ExportButton', () => ({
  default: () => <button data-testid="export-button">Export</button>,
}))

const mockMetrics = {
  totalProjects: 12,
  activeInspections: 5,
  pendingRFIs: 3,
  approvalRate: 87.5,
  equipmentUtilization: 0,
  budgetStatus: 0,
  trends: { totalProjects: 10, activeInspections: -5, pendingRFIs: 0, approvalRate: 2.5 },
}

const mockTrends = [
  { date: '2024-06-01', inspectionsCompleted: 5, rfisSubmitted: 2 },
  { date: '2024-06-08', inspectionsCompleted: 8, rfisSubmitted: 3 },
]

const mockDistributions = {
  rfiStatus: [{ id: 1, value: 10, label: 'Open' }],
  inspectionTypes: [{ id: 1, value: 5, label: 'Structural' }],
  equipmentStatus: [{ id: 1, value: 8, label: 'Active' }],
}

describe('AnalyticsDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(analyticsService.getMetrics).mockResolvedValue(mockMetrics)
    vi.mocked(analyticsService.getTrends).mockResolvedValue(mockTrends)
    vi.mocked(analyticsService.getDistributions).mockResolvedValue(mockDistributions)
  })

  it('shows loading skeletons initially', () => {
    const { container } = renderWithProviders(<AnalyticsDashboard />)
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  it('renders title and subtitle after loading', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByText('analytics.title')).toBeInTheDocument()
    })
    expect(screen.getByText('analytics.subtitle')).toBeInTheDocument()
  })

  it('renders 4 KPI cards', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getAllByTestId('analytics-kpi')).toHaveLength(4)
    })
  })

  it('displays metrics values', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByText('analytics.totalProjects')).toBeInTheDocument()
      expect(screen.getByText('analytics.activeInspections')).toBeInTheDocument()
      expect(screen.getByText('analytics.pendingRFIs')).toBeInTheDocument()
      expect(screen.getByText('analytics.approvalRate')).toBeInTheDocument()
    })
  })

  it('renders export button', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByTestId('export-button')).toBeInTheDocument()
    })
  })

  it('renders date range selector', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByTestId('date-range-selector')).toBeInTheDocument()
    })
  })

  it('renders metrics chart container', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByTestId('metrics-chart')).toBeInTheDocument()
    })
  })

  it('renders distribution charts', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getAllByTestId('distribution-chart')).toHaveLength(2)
    })
  })

  it('renders date range text', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByText(/analytics.selectedRange/)).toBeInTheDocument()
    })
  })

  it('calls analytics APIs on mount', async () => {
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(analyticsService.getMetrics).toHaveBeenCalled()
      expect(analyticsService.getTrends).toHaveBeenCalled()
      expect(analyticsService.getDistributions).toHaveBeenCalled()
    })
  })

  it('handles API error gracefully', async () => {
    vi.mocked(analyticsService.getMetrics).mockRejectedValue(new Error('Fail'))
    renderWithProviders(<AnalyticsDashboard />)
    await waitFor(() => {
      expect(screen.getByText('analytics.title')).toBeInTheDocument()
    })
  })
})
