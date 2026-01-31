import { render, screen } from '@testing-library/react'
import { InspectionHistoryTimeline } from './InspectionHistoryTimeline'
import type { InspectionHistoryEvent } from '../types'

describe('InspectionHistoryTimeline', () => {
  const mockUser = {
    id: '1',
    fullName: 'John Doe',
    email: 'john@example.com',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z'
  }

  const mockEvent: InspectionHistoryEvent = {
    id: '1',
    action: 'create',
    createdAt: '2026-01-15T10:30:00Z',
    user: mockUser,
    entityType: 'inspection',
    entityId: '123'
  }

  it('renders without crashing with mock data', () => {
    render(<InspectionHistoryTimeline events={[mockEvent]} />)
    expect(screen.getByText(/Inspection created/i)).toBeInTheDocument()
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
  })

  it('shows empty state when no events', () => {
    render(<InspectionHistoryTimeline events={[]} />)
    expect(screen.getByText(/No history available/i)).toBeInTheDocument()
  })

  it('displays timestamp, icon, user, and description for each event', () => {
    render(<InspectionHistoryTimeline events={[mockEvent]} />)

    // Check timestamp
    expect(screen.getByText(/Jan 15, 2026/i)).toBeInTheDocument()

    // Check user attribution
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument()

    // Check description
    expect(screen.getByText(/Inspection created/i)).toBeInTheDocument()

    // Check chip/badge for action
    expect(screen.getByText(/create/i)).toBeInTheDocument()
  })
})
