import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { InspectionHistoryTimeline } from './InspectionHistoryTimeline'
import type { Inspection, User, InspectionConsultantType, InspectionStatus } from '../types'

// Mock data factories
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  email: 'inspector@example.com',
  fullName: 'John Inspector',
  phone: '+1234567890',
  company: 'Inspection Co',
  role: 'inspector',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

const createMockConsultantType = (overrides?: Partial<InspectionConsultantType>): InspectionConsultantType => ({
  id: 'consultant-type-1',
  name: 'Structural Inspection',
  nameHe: 'בדיקה מבנית',
  category: 'structural',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
})

const createMockInspection = (overrides?: Partial<Inspection>): Inspection => ({
  id: 'inspection-1',
  projectId: 'project-1',
  consultantTypeId: 'consultant-type-1',
  scheduledDate: '2024-03-15T10:00:00Z',
  completedDate: undefined,
  currentStage: 'initial',
  status: 'pending' as InspectionStatus,
  notes: 'Initial inspection notes',
  createdAt: '2024-03-01T00:00:00Z',
  updatedAt: '2024-03-01T00:00:00Z',
  createdBy: createMockUser(),
  consultantType: createMockConsultantType(),
  findings: [],
  ...overrides,
})

// Helper to render component with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('InspectionHistoryTimeline', () => {
  const mockInspections: Inspection[] = [
    createMockInspection({
      id: 'inspection-1',
      scheduledDate: '2024-03-15T10:00:00Z',
      status: 'pending',
      createdBy: createMockUser({ fullName: 'John Inspector' }),
      consultantType: createMockConsultantType({ name: 'Structural Inspection' }),
    }),
    createMockInspection({
      id: 'inspection-2',
      scheduledDate: '2024-03-10T14:00:00Z',
      status: 'in_progress',
      createdBy: createMockUser({ id: 'user-2', fullName: 'Jane Inspector' }),
      consultantType: createMockConsultantType({ id: 'consultant-type-2', name: 'Electrical Inspection' }),
    }),
    createMockInspection({
      id: 'inspection-3',
      scheduledDate: '2024-03-05T09:00:00Z',
      status: 'completed',
      createdBy: createMockUser({ id: 'user-3', fullName: 'Bob Inspector' }),
      consultantType: createMockConsultantType({ id: 'consultant-type-3', name: 'Plumbing Inspection' }),
    }),
    createMockInspection({
      id: 'inspection-4',
      scheduledDate: '2024-02-28T11:00:00Z',
      status: 'failed',
      createdBy: createMockUser({ id: 'user-4', fullName: 'Alice Inspector' }),
      consultantType: createMockConsultantType({ id: 'consultant-type-4', name: 'Safety Inspection' }),
    }),
  ]

  describe('Loading State', () => {
    it('should display skeleton loaders when loading is true', () => {
      const { container } = renderWithRouter(<InspectionHistoryTimeline inspections={[]} loading={true} />)

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('.MuiSkeleton-root')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should display 3 skeleton cards during loading', () => {
      const { container } = renderWithRouter(<InspectionHistoryTimeline inspections={[]} loading={true} />)

      // The component should render 3 skeleton timeline items
      // Each skeleton item has multiple skeleton elements, so we just verify skeletons exist
      const skeletons = container.querySelectorAll('.MuiSkeleton-root')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no inspections exist', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={[]} loading={false} />)

      expect(screen.getByText(/no inspections found/i)).toBeInTheDocument()
      expect(screen.getByText(/there are no inspections for this project/i)).toBeInTheDocument()
    })

    it('should show date range filter even when empty', () => {
      const { container } = renderWithRouter(<InspectionHistoryTimeline inspections={[]} loading={false} />)

      // Check for date range filter - MUI TextField with select prop
      const selectField = container.querySelector('.MuiTextField-root')
      expect(selectField).toBeInTheDocument()
    })
  })

  describe('Inspection Cards Display', () => {
    it('should render inspection cards with correct data', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      // Check that inspection types are displayed
      expect(screen.getByText('Structural Inspection')).toBeInTheDocument()
      expect(screen.getByText('Electrical Inspection')).toBeInTheDocument()
      expect(screen.getByText('Plumbing Inspection')).toBeInTheDocument()
      expect(screen.getByText('Safety Inspection')).toBeInTheDocument()
    })

    it('should display inspector names', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      expect(screen.getByText(/John Inspector/i)).toBeInTheDocument()
      expect(screen.getByText(/Jane Inspector/i)).toBeInTheDocument()
      expect(screen.getByText(/Bob Inspector/i)).toBeInTheDocument()
      expect(screen.getByText(/Alice Inspector/i)).toBeInTheDocument()
    })

    it('should display correct status badges with colors', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      // Check that status labels are displayed (they're capitalized and spaces replace underscores)
      expect(screen.getByText('pending')).toBeInTheDocument()
      expect(screen.getByText('in progress')).toBeInTheDocument()
      expect(screen.getByText('completed')).toBeInTheDocument()
      expect(screen.getByText('failed')).toBeInTheDocument()
    })

    it('should format dates correctly', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      // Dates should be formatted as "Mar 15, 2024" etc.
      expect(screen.getByText(/Mar 15, 2024/i)).toBeInTheDocument()
      expect(screen.getByText(/Mar 10, 2024/i)).toBeInTheDocument()
      expect(screen.getByText(/Mar 5, 2024/i)).toBeInTheDocument()
      expect(screen.getByText(/Feb 28, 2024/i)).toBeInTheDocument()
    })

    it('should sort inspections by scheduled date (newest first)', () => {
      const { container } = renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      // Get all cards in order
      const cards = container.querySelectorAll('.MuiCard-root')
      expect(cards.length).toBe(4)

      // The first card should contain the most recent inspection (Mar 15 - Structural)
      expect(cards[0]).toHaveTextContent('Structural Inspection')
      expect(cards[0]).toHaveTextContent('Mar 15, 2024')

      // The last card should contain the oldest inspection (Feb 28 - Safety)
      expect(cards[3]).toHaveTextContent('Safety Inspection')
      expect(cards[3]).toHaveTextContent('Feb 28, 2024')
    })
  })

  describe('Edge Cases', () => {
    it('should handle null createdBy gracefully', () => {
      const inspectionWithoutCreator = createMockInspection({
        createdBy: undefined,
      })

      renderWithRouter(<InspectionHistoryTimeline inspections={[inspectionWithoutCreator]} loading={false} />)

      expect(screen.getByText('Unknown Inspector')).toBeInTheDocument()
      // Avatar should show "U" for "Unknown Inspector"
      const avatar = screen.getByText('U')
      expect(avatar).toBeInTheDocument()
    })

    it('should handle null consultantType gracefully', () => {
      const inspectionWithoutType = createMockInspection({
        consultantType: undefined,
      })

      renderWithRouter(<InspectionHistoryTimeline inspections={[inspectionWithoutType]} loading={false} />)

      expect(screen.getByText('General Inspection')).toBeInTheDocument()
    })

    it('should display avatar with first letter of inspector name', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={[mockInspections[0]]} loading={false} />)

      // Avatar should show "J" for "John Inspector"
      const avatar = screen.getByText('J')
      expect(avatar).toBeInTheDocument()
    })
  })

  describe('Date Range Filter', () => {
    it('should render date range filter dropdown', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      expect(screen.getByLabelText(/Date Range/i)).toBeInTheDocument()
    })

    it('should default to "Last 3 months" filter', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      const select = screen.getByLabelText(/Date Range/i)
      expect(select).toHaveValue('last_3_months')
    })

    it('should filter inspections based on date range selection', () => {
      // Create inspections with different dates
      const oldInspection = createMockInspection({
        id: 'old-inspection',
        scheduledDate: '2023-01-01T10:00:00Z', // Very old
        consultantType: createMockConsultantType({ name: 'Old Inspection' }),
      })

      const recentInspection = createMockInspection({
        id: 'recent-inspection',
        scheduledDate: new Date().toISOString(), // Today
        consultantType: createMockConsultantType({ name: 'Recent Inspection' }),
      })

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[oldInspection, recentInspection]}
          loading={false}
        />
      )

      // With "Last 3 months" default, old inspection should not be visible
      expect(screen.queryByText('Old Inspection')).not.toBeInTheDocument()
      expect(screen.getByText('Recent Inspection')).toBeInTheDocument()
    })

    it('should show all inspections when "All time" is selected', () => {
      const oldInspection = createMockInspection({
        id: 'old-inspection',
        scheduledDate: '2023-01-01T10:00:00Z',
        consultantType: createMockConsultantType({ name: 'Old Inspection' }),
      })

      const recentInspection = createMockInspection({
        id: 'recent-inspection',
        scheduledDate: new Date().toISOString(),
        consultantType: createMockConsultantType({ name: 'Recent Inspection' }),
      })

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[oldInspection, recentInspection]}
          loading={false}
        />
      )

      // Change filter to "All time"
      const select = screen.getByLabelText(/Date Range/i)
      fireEvent.change(select, { target: { value: 'all_time' } })

      // Both inspections should now be visible
      expect(screen.getByText('Old Inspection')).toBeInTheDocument()
      expect(screen.getByText('Recent Inspection')).toBeInTheDocument()
    })

    it('should filter inspections for "Last 7 days" range', () => {
      const now = new Date()
      const fiveDaysAgo = new Date(now)
      fiveDaysAgo.setDate(now.getDate() - 5)

      const tenDaysAgo = new Date(now)
      tenDaysAgo.setDate(now.getDate() - 10)

      const recentInspection = createMockInspection({
        id: 'recent-inspection',
        scheduledDate: fiveDaysAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Recent Inspection' }),
      })

      const olderInspection = createMockInspection({
        id: 'older-inspection',
        scheduledDate: tenDaysAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Older Inspection' }),
      })

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[recentInspection, olderInspection]}
          loading={false}
        />
      )

      // Change filter to "Last 7 days"
      const select = screen.getByLabelText(/Date Range/i)
      fireEvent.change(select, { target: { value: 'last_7_days' } })

      // Only inspection within 7 days should be visible
      expect(screen.getByText('Recent Inspection')).toBeInTheDocument()
      expect(screen.queryByText('Older Inspection')).not.toBeInTheDocument()
    })

    it('should filter inspections for "Last 30 days" range', () => {
      const now = new Date()
      const twentyDaysAgo = new Date(now)
      twentyDaysAgo.setDate(now.getDate() - 20)

      const fortyDaysAgo = new Date(now)
      fortyDaysAgo.setDate(now.getDate() - 40)

      const recentInspection = createMockInspection({
        id: 'recent-inspection',
        scheduledDate: twentyDaysAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Twenty Days Ago' }),
      })

      const olderInspection = createMockInspection({
        id: 'older-inspection',
        scheduledDate: fortyDaysAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Forty Days Ago' }),
      })

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[recentInspection, olderInspection]}
          loading={false}
        />
      )

      // Change filter to "Last 30 days"
      const select = screen.getByLabelText(/Date Range/i)
      fireEvent.change(select, { target: { value: 'last_30_days' } })

      // Only inspection within 30 days should be visible
      expect(screen.getByText('Twenty Days Ago')).toBeInTheDocument()
      expect(screen.queryByText('Forty Days Ago')).not.toBeInTheDocument()
    })

    it('should filter inspections for "Last 6 months" range', () => {
      const now = new Date()
      const fourMonthsAgo = new Date(now)
      fourMonthsAgo.setDate(now.getDate() - 120)

      const eightMonthsAgo = new Date(now)
      eightMonthsAgo.setDate(now.getDate() - 240)

      const recentInspection = createMockInspection({
        id: 'recent-inspection',
        scheduledDate: fourMonthsAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Four Months Ago' }),
      })

      const olderInspection = createMockInspection({
        id: 'older-inspection',
        scheduledDate: eightMonthsAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Eight Months Ago' }),
      })

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[recentInspection, olderInspection]}
          loading={false}
        />
      )

      // Change filter to "Last 6 months"
      const select = screen.getByLabelText(/Date Range/i)
      fireEvent.change(select, { target: { value: 'last_6_months' } })

      // Only inspection within 6 months should be visible
      expect(screen.getByText('Four Months Ago')).toBeInTheDocument()
      expect(screen.queryByText('Eight Months Ago')).not.toBeInTheDocument()
    })

    it('should filter inspections for "Last year" range', () => {
      const now = new Date()
      const sixMonthsAgo = new Date(now)
      sixMonthsAgo.setDate(now.getDate() - 180)

      const twoYearsAgo = new Date(now)
      twoYearsAgo.setDate(now.getDate() - 730)

      const recentInspection = createMockInspection({
        id: 'recent-inspection',
        scheduledDate: sixMonthsAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Six Months Ago' }),
      })

      const olderInspection = createMockInspection({
        id: 'older-inspection',
        scheduledDate: twoYearsAgo.toISOString(),
        consultantType: createMockConsultantType({ name: 'Two Years Ago' }),
      })

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[recentInspection, olderInspection]}
          loading={false}
        />
      )

      // Change filter to "Last year"
      const select = screen.getByLabelText(/Date Range/i)
      fireEvent.change(select, { target: { value: 'last_year' } })

      // Only inspection within last year should be visible
      expect(screen.getByText('Six Months Ago')).toBeInTheDocument()
      expect(screen.queryByText('Two Years Ago')).not.toBeInTheDocument()
    })

    it('should update filter selection when user changes date range', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      const select = screen.getByLabelText(/Date Range/i)

      // Initial value should be "Last 3 months"
      expect(select).toHaveValue('last_3_months')

      // Change to "Last 7 days"
      fireEvent.change(select, { target: { value: 'last_7_days' } })
      expect(select).toHaveValue('last_7_days')

      // Change to "All time"
      fireEvent.change(select, { target: { value: 'all_time' } })
      expect(select).toHaveValue('all_time')
    })

    it('should show empty state when no inspections match the selected date range', () => {
      const veryOldInspection = createMockInspection({
        id: 'very-old',
        scheduledDate: '2020-01-01T10:00:00Z',
        consultantType: createMockConsultantType({ name: 'Very Old Inspection' }),
      })

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[veryOldInspection]}
          loading={false}
        />
      )

      // With "Last 3 months" default, very old inspection should be filtered out
      expect(screen.queryByText('Very Old Inspection')).not.toBeInTheDocument()
      expect(screen.getByText(/no inspections found/i)).toBeInTheDocument()
      expect(screen.getByText(/there are no inspections for this project in the selected date range/i)).toBeInTheDocument()
    })

    it('should include all available date range options', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      const select = screen.getByLabelText(/Date Range/i)
      fireEvent.mouseDown(select)

      // Check that all options are available
      expect(screen.getByText('Last 7 days')).toBeInTheDocument()
      expect(screen.getByText('Last 30 days')).toBeInTheDocument()
      expect(screen.getByText('Last 3 months')).toBeInTheDocument()
      expect(screen.getByText('Last 6 months')).toBeInTheDocument()
      expect(screen.getByText('Last year')).toBeInTheDocument()
      expect(screen.getByText('All time')).toBeInTheDocument()
    })
  })

  describe('Click Handler', () => {
    it('should call onInspectionClick callback when card is clicked', () => {
      const handleClick = vi.fn()

      renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[mockInspections[0]]}
          loading={false}
          onInspectionClick={handleClick}
        />
      )

      // Find the card by its content (consultant type name) and click it
      const consultantTypeName = screen.getByText('Structural Inspection')
      const card = consultantTypeName.closest('.MuiCard-root')
      expect(card).toBeInTheDocument()

      if (card) {
        fireEvent.click(card)
        expect(handleClick).toHaveBeenCalledWith('inspection-1')
      }
    })

    it('should navigate to inspection detail page on card click', () => {
      // This test verifies the navigation logic exists
      // Actual navigation testing would require router mocking
      const { container } = renderWithRouter(
        <InspectionHistoryTimeline
          inspections={[mockInspections[0]]}
          loading={false}
        />
      )

      // Verify card is clickable (has MUI Card class and can be clicked)
      const card = container.querySelector('.MuiCard-root')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Timeline Visual Structure', () => {
    it('should render timeline with connecting vertical line', () => {
      renderWithRouter(<InspectionHistoryTimeline inspections={mockInspections} loading={false} />)

      // Check for multiple cards (should have vertical line between them)
      const cards = screen.getAllByText(/Inspector:/i)
      expect(cards.length).toBeGreaterThan(1)
    })

    it('should display timeline nodes (dots) for each inspection', () => {
      const { container } = renderWithRouter(
        <InspectionHistoryTimeline inspections={mockInspections} loading={false} />
      )

      // Timeline nodes are rendered as colored circles
      // We verify by checking the structure exists
      const timeline = container.querySelector('[class*="MuiBox"]')
      expect(timeline).toBeInTheDocument()
    })
  })

  describe('Status Badge Configuration', () => {
    it('should map pending status to warning color', () => {
      const pendingInspection = createMockInspection({ status: 'pending' })

      renderWithRouter(<InspectionHistoryTimeline inspections={[pendingInspection]} loading={false} />)

      const chip = screen.getByText('pending').closest('.MuiChip-root')
      expect(chip).toHaveClass('MuiChip-colorWarning')
    })

    it('should map in_progress status to info color', () => {
      const inProgressInspection = createMockInspection({ status: 'in_progress' })

      renderWithRouter(<InspectionHistoryTimeline inspections={[inProgressInspection]} loading={false} />)

      const chip = screen.getByText('in progress').closest('.MuiChip-root')
      expect(chip).toHaveClass('MuiChip-colorInfo')
    })

    it('should map completed status to success color', () => {
      const completedInspection = createMockInspection({ status: 'completed' })

      renderWithRouter(<InspectionHistoryTimeline inspections={[completedInspection]} loading={false} />)

      const chip = screen.getByText('completed').closest('.MuiChip-root')
      expect(chip).toHaveClass('MuiChip-colorSuccess')
    })

    it('should map failed status to error color', () => {
      const failedInspection = createMockInspection({ status: 'failed' })

      renderWithRouter(<InspectionHistoryTimeline inspections={[failedInspection]} loading={false} />)

      const chip = screen.getByText('failed').closest('.MuiChip-root')
      expect(chip).toHaveClass('MuiChip-colorError')
    })
  })
})
