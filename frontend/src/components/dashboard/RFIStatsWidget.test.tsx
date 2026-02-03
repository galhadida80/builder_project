import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import RFIStatsWidget from './RFIStatsWidget'
import { rfiApi } from '../../api/rfi'

jest.mock('../../api/rfi')
jest.mock('../common/ToastProvider', () => ({
  useToast: () => ({ showError: jest.fn() })
}))

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}))

const mockStats = {
  total_rfis: 10,
  draft_count: 1,
  open_count: 3,
  waiting_response_count: 2,
  answered_count: 2,
  closed_count: 2,
  overdue_count: 1,
  by_priority: {},
  by_category: {}
}

describe('RFIStatsWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    (rfiApi.getSummary as jest.Mock).mockReturnValue(new Promise(() => {}))

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    expect(screen.getByText('RFI Statistics')).toBeInTheDocument()
    // Check for skeleton loaders (4 of them)
    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons).toHaveLength(4)
  })

  it('renders all 4 stat cards when data loads', async () => {
    (rfiApi.getSummary as jest.Mock).mockResolvedValue(mockStats)

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Open RFIs')).toBeInTheDocument()
      expect(screen.getByText('Overdue')).toBeInTheDocument()
      expect(screen.getByText('Answered')).toBeInTheDocument()
      expect(screen.getByText('Closed')).toBeInTheDocument()
    })

    // Verify stat values are displayed
    expect(screen.getByText('3')).toBeInTheDocument() // open_count
    expect(screen.getByText('1')).toBeInTheDocument() // overdue_count
    expect(screen.getByText('2')).toBeInTheDocument() // answered_count (2 instances)
  })

  it('displays error state when API fails', async () => {
    (rfiApi.getSummary as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to load RFI statistics/i)).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('shows "Select a project" when no projectId provided', () => {
    render(
      <BrowserRouter>
        <RFIStatsWidget />
      </BrowserRouter>
    )

    expect(screen.getByText('Select a project to view RFI statistics')).toBeInTheDocument()
  })

  it('navigates to RFI list with correct filter on stat click', async () => {
    (rfiApi.getSummary as jest.Mock).mockResolvedValue(mockStats)

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-123" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Open RFIs')).toBeInTheDocument()
    })

    // Click on "Open RFIs" stat
    const openCard = screen.getByText('Open RFIs').closest('div[role="button"]')
    fireEvent.click(openCard!)

    expect(mockNavigate).toHaveBeenCalledWith('/projects/test-123/rfis?status=open')
  })

  it('retry button reloads data after error', async () => {
    (rfiApi.getSummary as jest.Mock)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockStats)

    render(
      <BrowserRouter>
        <RFIStatsWidget projectId="test-project-id" />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Retry'))

    await waitFor(() => {
      expect(screen.getByText('Open RFIs')).toBeInTheDocument()
    })

    expect(rfiApi.getSummary).toHaveBeenCalledTimes(2)
  })
})
