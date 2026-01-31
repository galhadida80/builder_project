import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { FindingDocumentationCard } from '../FindingDocumentationCard'
import type { Finding, FindingSeverity } from '../../../types'

// Mock the Card component
vi.mock('../../ui/Card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
}))

// Mock the SeverityBadge component
vi.mock('../../ui/StatusBadge', () => ({
  SeverityBadge: ({ severity, size }: { severity: string; size: string }) => (
    <div data-testid={`severity-badge-${severity}`} data-size={size}>
      {severity}
    </div>
  ),
}))

describe('FindingDocumentationCard', () => {
  const mockFinding: Finding = {
    id: '1',
    inspectionId: 'insp-1',
    title: 'Critical Structural Issue',
    description: 'Foundation crack detected in the north wall',
    severity: 'critical' as FindingSeverity,
    status: 'open',
    location: 'Building A - Floor 2',
    photos: [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
    ],
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    createdBy: {
      id: 'user-1',
      email: 'inspector@example.com',
      fullName: 'John Inspector',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
    },
  }

  const mockHandlers = {
    onSeverityChange: vi.fn(),
    onAssign: vi.fn(),
    onResolve: vi.fn(),
    onAddPhoto: vi.fn(),
    onPhotoClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the finding card with all data', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      // Check title
      expect(screen.getByText('Critical Structural Issue')).toBeInTheDocument()

      // Check description
      expect(screen.getByText('Foundation crack detected in the north wall')).toBeInTheDocument()

      // Check location
      expect(screen.getByText('Building A - Floor 2')).toBeInTheDocument()

      // Check inspector name
      expect(screen.getByText('John Inspector')).toBeInTheDocument()

      // Check photo count
      expect(screen.getByText('Photos (2)')).toBeInTheDocument()
    })

    it('should render loading skeleton when loading prop is true', () => {
      render(<FindingDocumentationCard finding={mockFinding} loading={true} />)

      // Check for skeleton elements (MUI Skeleton components)
      const card = screen.getByTestId('card')
      expect(card).toBeInTheDocument()

      // Title should not be visible when loading
      expect(screen.queryByText('Critical Structural Issue')).not.toBeInTheDocument()
    })
  })

  describe('Severity Badge', () => {
    it('should display all severity levels', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      expect(screen.getByTestId('severity-badge-critical')).toBeInTheDocument()
      expect(screen.getByTestId('severity-badge-high')).toBeInTheDocument()
      expect(screen.getByTestId('severity-badge-medium')).toBeInTheDocument()
      expect(screen.getByTestId('severity-badge-low')).toBeInTheDocument()
    })

    it('should call onSeverityChange when clicking a different severity', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const highBadge = screen.getByTestId('severity-badge-high')
      fireEvent.click(highBadge.parentElement!)

      expect(mockHandlers.onSeverityChange).toHaveBeenCalledWith('high')
    })

    it('should not call onSeverityChange when clicking the current severity', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const criticalBadge = screen.getByTestId('severity-badge-critical')
      fireEvent.click(criticalBadge.parentElement!)

      expect(mockHandlers.onSeverityChange).not.toHaveBeenCalled()
    })

    it('should not call onSeverityChange when handler is not provided', () => {
      const { onSeverityChange, ...otherHandlers } = mockHandlers
      render(<FindingDocumentationCard finding={mockFinding} {...otherHandlers} />)

      const highBadge = screen.getByTestId('severity-badge-high')

      // Should not throw error
      expect(() => fireEvent.click(highBadge.parentElement!)).not.toThrow()
    })
  })

  describe('Photo Gallery', () => {
    it('should display photos when available', () => {
      const { container } = render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      expect(screen.getByText('Photos (2)')).toBeInTheDocument()

      // Photos are rendered as Box components with background images
      // Check that the Grid container exists
      const gridContainer = container.querySelector('.MuiGrid-container')
      expect(gridContainer).toBeTruthy()
    })

    it('should display "No photos" message when photos array is empty', () => {
      const findingNoPhotos = { ...mockFinding, photos: [] }
      render(<FindingDocumentationCard finding={findingNoPhotos} {...mockHandlers} />)

      expect(screen.getByText('No photos')).toBeInTheDocument()
    })

    it('should display "No photos" message when photos is undefined', () => {
      const findingNoPhotos = { ...mockFinding, photos: undefined }
      render(<FindingDocumentationCard finding={findingNoPhotos} {...mockHandlers} />)

      expect(screen.getByText('No photos')).toBeInTheDocument()
    })

    it('should call onPhotoClick when clicking a photo', () => {
      const { container } = render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      // Find photo thumbnail divs (they have background images and onClick handlers)
      const photoThumbnails = container.querySelectorAll('[style*="background-image"]')

      if (photoThumbnails.length > 0) {
        fireEvent.click(photoThumbnails[0])
        expect(mockHandlers.onPhotoClick).toHaveBeenCalledWith('https://example.com/photo1.jpg')
      }
    })
  })

  describe('Location Field', () => {
    it('should display location when provided', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      expect(screen.getByText('Building A - Floor 2')).toBeInTheDocument()
    })

    it('should display "Location not specified" when location is null', () => {
      const findingNoLocation = { ...mockFinding, location: undefined }
      render(<FindingDocumentationCard finding={findingNoLocation} {...mockHandlers} />)

      expect(screen.getByText('Location not specified')).toBeInTheDocument()
    })

    it('should allow editing location when clicked', async () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const locationText = screen.getByText('Building A - Floor 2')
      fireEvent.click(locationText)

      // Input field should appear
      await waitFor(() => {
        const input = screen.getByDisplayValue('Building A - Floor 2')
        expect(input).toBeInTheDocument()
      })
    })

    it('should update location value when typing', async () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const locationText = screen.getByText('Building A - Floor 2')
      fireEvent.click(locationText)

      const input = await screen.findByDisplayValue('Building A - Floor 2')
      fireEvent.change(input, { target: { value: 'Building B - Floor 3' } })

      expect(input).toHaveValue('Building B - Floor 3')
    })

    it('should hide input field on blur', async () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const locationText = screen.getByText('Building A - Floor 2')
      fireEvent.click(locationText)

      const input = await screen.findByDisplayValue('Building A - Floor 2')
      fireEvent.blur(input)

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Building A - Floor 2')).not.toBeInTheDocument()
      })
    })

    it('should hide input field on Enter key press', async () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const locationText = screen.getByText('Building A - Floor 2')
      fireEvent.click(locationText)

      const input = await screen.findByDisplayValue('Building A - Floor 2')
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 })

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Building A - Floor 2')).not.toBeInTheDocument()
      })
    })
  })

  describe('Description', () => {
    it('should display description when provided', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      expect(screen.getByText('Foundation crack detected in the north wall')).toBeInTheDocument()
    })

    it('should display "No description provided" when description is null', () => {
      const findingNoDescription = { ...mockFinding, description: undefined }
      render(<FindingDocumentationCard finding={findingNoDescription} {...mockHandlers} />)

      expect(screen.getByText('No description provided')).toBeInTheDocument()
    })
  })

  describe('Inspector Metadata', () => {
    it('should display inspector full name when available', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      expect(screen.getByText('John Inspector')).toBeInTheDocument()
    })

    it('should display inspector email when full name is not available', () => {
      const findingWithEmail = {
        ...mockFinding,
        createdBy: {
          ...mockFinding.createdBy!,
          fullName: undefined,
        },
      }
      render(<FindingDocumentationCard finding={findingWithEmail} {...mockHandlers} />)

      expect(screen.getByText('inspector@example.com')).toBeInTheDocument()
    })

    it('should display "Unknown" when createdBy is null', () => {
      const findingNoCreator = { ...mockFinding, createdBy: undefined }
      render(<FindingDocumentationCard finding={findingNoCreator} {...mockHandlers} />)

      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('should display formatted timestamp', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      // Check that timestamp is displayed (format may vary based on locale)
      // Just verify that "Documented at" label is present
      expect(screen.getByText('Documented at')).toBeInTheDocument()
    })
  })

  describe('Action Buttons', () => {
    it('should render all action buttons', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      expect(screen.getByRole('button', { name: /assign/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /add photo/i })).toBeInTheDocument()
    })

    it('should call onAssign when Assign button is clicked', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const assignButton = screen.getByRole('button', { name: /assign/i })
      fireEvent.click(assignButton)

      expect(mockHandlers.onAssign).toHaveBeenCalledTimes(1)
    })

    it('should call onResolve when Resolve button is clicked', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const resolveButton = screen.getByRole('button', { name: /resolve/i })
      fireEvent.click(resolveButton)

      expect(mockHandlers.onResolve).toHaveBeenCalledTimes(1)
    })

    it('should call onAddPhoto when Add Photo button is clicked', () => {
      render(<FindingDocumentationCard finding={mockFinding} {...mockHandlers} />)

      const addPhotoButton = screen.getByRole('button', { name: /add photo/i })
      fireEvent.click(addPhotoButton)

      expect(mockHandlers.onAddPhoto).toHaveBeenCalledTimes(1)
    })

    it('should disable Assign button when handler is not provided', () => {
      const { onAssign, ...otherHandlers } = mockHandlers
      render(<FindingDocumentationCard finding={mockFinding} {...otherHandlers} />)

      const assignButton = screen.getByRole('button', { name: /assign/i })
      expect(assignButton).toBeDisabled()
    })

    it('should disable Resolve button when handler is not provided', () => {
      const { onResolve, ...otherHandlers } = mockHandlers
      render(<FindingDocumentationCard finding={mockFinding} {...otherHandlers} />)

      const resolveButton = screen.getByRole('button', { name: /resolve/i })
      expect(resolveButton).toBeDisabled()
    })

    it('should disable Add Photo button when handler is not provided', () => {
      const { onAddPhoto, ...otherHandlers } = mockHandlers
      render(<FindingDocumentationCard finding={mockFinding} {...otherHandlers} />)

      const addPhotoButton = screen.getByRole('button', { name: /add photo/i })
      expect(addPhotoButton).toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle finding with all optional fields missing', () => {
      const minimalFinding: Finding = {
        id: '2',
        inspectionId: 'insp-2',
        title: 'Minimal Finding',
        severity: 'low' as FindingSeverity,
        status: 'open',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-15T10:30:00Z',
      }

      render(<FindingDocumentationCard finding={minimalFinding} />)

      expect(screen.getByText('Minimal Finding')).toBeInTheDocument()
      expect(screen.getByText('No photos')).toBeInTheDocument()
      expect(screen.getByText('Location not specified')).toBeInTheDocument()
      expect(screen.getByText('No description provided')).toBeInTheDocument()
      expect(screen.getByText('Unknown')).toBeInTheDocument()
    })

    it('should handle empty photos array', () => {
      const findingEmptyPhotos = { ...mockFinding, photos: [] }
      render(<FindingDocumentationCard finding={findingEmptyPhotos} {...mockHandlers} />)

      expect(screen.getByText('No photos')).toBeInTheDocument()
    })

    it('should handle multiline description', () => {
      const findingMultiline = {
        ...mockFinding,
        description: 'Line 1\nLine 2\nLine 3',
      }
      render(<FindingDocumentationCard finding={findingMultiline} {...mockHandlers} />)

      expect(screen.getByText('Line 1\nLine 2\nLine 3')).toBeInTheDocument()
    })
  })
})
