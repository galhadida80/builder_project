import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import InspectorDashboard from './InspectorDashboard'
import { inspectionsApi } from '../api/inspections'
import type { Inspection } from '../types'

// Mock the API
vi.mock('../api/inspections', () => ({
  inspectionsApi: {
    getProjectInspections: vi.fn(),
  },
}))

// Mock MobileBottomNav to avoid router issues
vi.mock('../components/layout/MobileBottomNav', () => ({
  default: () => <div data-testid="mobile-bottom-nav">Mobile Nav</div>,
}))

const mockInspections: Inspection[] = [
  {
    id: '1',
    consultantType: { id: '1', name: 'Structural Inspection', nameHe: 'בדיקה קונסטרוקטיבית' },
    scheduledDate: new Date().toISOString(),
    currentStage: '123 Main St, Building A',
    notes: 'Foundation inspection required',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    consultantType: { id: '2', name: 'Electrical Inspection', nameHe: 'בדיקת חשמל' },
    scheduledDate: new Date().toISOString(),
    currentStage: '456 Oak Ave, Unit 5',
    notes: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const renderComponent = () => {
  return render(
    <BrowserRouter>
      <InspectorDashboard />
    </BrowserRouter>
  )
}

describe('InspectorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without errors', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Field Inspector')).toBeInTheDocument()
    })
  })

  it('displays loading state with skeleton', () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    )

    renderComponent()

    // Skeleton should be visible during loading
    expect(screen.queryByText('Today\'s Schedule')).not.toBeInTheDocument()
  })

  it('fetches today\'s inspections from API', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue(mockInspections)

    renderComponent()

    await waitFor(() => {
      expect(inspectionsApi.getProjectInspections).toHaveBeenCalledWith('1')
    })
  })

  it('filters inspections to show only today', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const mixedInspections: Inspection[] = [
      { ...mockInspections[0], id: '1', scheduledDate: yesterday.toISOString() }, // Yesterday
      { ...mockInspections[0], id: '2', scheduledDate: new Date().toISOString() }, // Today
      { ...mockInspections[0], id: '3', scheduledDate: tomorrow.toISOString() }, // Tomorrow
    ]

    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue(mixedInspections)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Today\'s Schedule')).toBeInTheDocument()
    })

    // Should only show 1 inspection (today's)
    const inspectionCards = screen.queryAllByRole('listitem')
    expect(inspectionCards).toHaveLength(1)
  })

  it('shows empty state when no inspections scheduled for today', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('No inspections scheduled')).toBeInTheDocument()
      expect(screen.getByText('You have no inspections scheduled for today')).toBeInTheDocument()
    })
  })

  it('displays all three quick action buttons', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('START INSPECTION')).toBeInTheDocument()
      expect(screen.getByText('TAKE PHOTO')).toBeInTheDocument()
      expect(screen.getByText('REPORT ISSUE')).toBeInTheDocument()
    })
  })

  it('displays offline badge', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('OFFLINE')).toBeInTheDocument()
    })
  })

  it('displays inspection details correctly', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue(mockInspections)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Structural Inspection')).toBeInTheDocument()
      expect(screen.getByText('123 Main St, Building A')).toBeInTheDocument()
      expect(screen.getByText('Foundation inspection required')).toBeInTheDocument()
    })
  })

  it('displays mobile bottom navigation', async () => {
    vi.mocked(inspectionsApi.getProjectInspections).mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument()
    })
  })
})
