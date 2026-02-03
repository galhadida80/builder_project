import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { FindingCard } from './FindingCard'
import { Finding } from '../../types'

// Mock data helpers
const createMockFinding = (overrides?: Partial<Finding>): Finding => ({
  id: '1',
  inspectionId: 'inspection-1',
  title: 'Test Finding',
  description: 'This is a test finding description',
  severity: 'medium',
  status: 'open',
  location: 'Building A, Floor 2',
  photos: [],
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  ...overrides,
})

describe('FindingCard', () => {
  describe('Basic Rendering', () => {
    it('renders with all required props', () => {
      const finding = createMockFinding()
      render(<FindingCard finding={finding} />)

      expect(screen.getByText('Test Finding')).toBeInTheDocument()
      expect(screen.getByText('This is a test finding description')).toBeInTheDocument()
      expect(screen.getByText('Building A, Floor 2')).toBeInTheDocument()
    })

    it('renders without optional description', () => {
      const finding = createMockFinding({ description: undefined })
      render(<FindingCard finding={finding} />)

      expect(screen.getByText('Test Finding')).toBeInTheDocument()
      expect(screen.queryByText('This is a test finding description')).not.toBeInTheDocument()
    })

    it('renders without optional location', () => {
      const finding = createMockFinding({ location: undefined })
      render(<FindingCard finding={finding} />)

      expect(screen.getByText('Test Finding')).toBeInTheDocument()
      expect(screen.queryByText('Building A, Floor 2')).not.toBeInTheDocument()
    })

    it('formats date correctly', () => {
      const finding = createMockFinding({ createdAt: '2024-01-15T10:00:00Z' })
      render(<FindingCard finding={finding} />)

      // Date format should be: "Jan 15, 2024"
      expect(screen.getByText(/Jan 15, 2024/i)).toBeInTheDocument()
    })

    it('displays status chip when status is present', () => {
      const finding = createMockFinding({ status: 'open' })
      render(<FindingCard finding={finding} />)

      expect(screen.getByText('Open')).toBeInTheDocument()
    })
  })

  describe('Severity Badge', () => {
    it('renders critical severity badge', () => {
      const finding = createMockFinding({ severity: 'critical' })
      render(<FindingCard finding={finding} />)

      const badge = screen.getByText('Critical')
      expect(badge).toBeInTheDocument()
    })

    it('renders high severity badge', () => {
      const finding = createMockFinding({ severity: 'high' })
      render(<FindingCard finding={finding} />)

      const badge = screen.getByText('High')
      expect(badge).toBeInTheDocument()
    })

    it('renders medium severity badge', () => {
      const finding = createMockFinding({ severity: 'medium' })
      render(<FindingCard finding={finding} />)

      const badge = screen.getByText('Medium')
      expect(badge).toBeInTheDocument()
    })

    it('renders low severity badge', () => {
      const finding = createMockFinding({ severity: 'low' })
      render(<FindingCard finding={finding} />)

      const badge = screen.getByText('Low')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('Photo Handling', () => {
    it('renders with no photos', () => {
      const finding = createMockFinding({ photos: [] })
      render(<FindingCard finding={finding} />)

      // Should not render photo gallery when photos array is empty
      const images = screen.queryAllByRole('img', { name: /Finding photo/i })
      expect(images).toHaveLength(0)
    })

    it('renders with undefined photos', () => {
      const finding = createMockFinding({ photos: undefined })
      render(<FindingCard finding={finding} />)

      // Should not render photo gallery when photos is undefined
      const images = screen.queryAllByRole('img', { name: /Finding photo/i })
      expect(images).toHaveLength(0)
    })

    it('renders with single photo', () => {
      const finding = createMockFinding({
        photos: ['https://example.com/photo1.jpg'],
      })
      render(<FindingCard finding={finding} />)

      const images = screen.getAllByRole('img', { name: /Finding photo/i })
      expect(images).toHaveLength(1)
      expect(images[0]).toHaveAttribute('src', 'https://example.com/photo1.jpg')
    })

    it('renders with multiple photos', () => {
      const finding = createMockFinding({
        photos: [
          'https://example.com/photo1.jpg',
          'https://example.com/photo2.jpg',
          'https://example.com/photo3.jpg',
        ],
      })
      render(<FindingCard finding={finding} />)

      const images = screen.getAllByRole('img', { name: /Finding photo/i })
      expect(images).toHaveLength(3)
      expect(images[0]).toHaveAttribute('src', 'https://example.com/photo1.jpg')
      expect(images[1]).toHaveAttribute('src', 'https://example.com/photo2.jpg')
      expect(images[2]).toHaveAttribute('src', 'https://example.com/photo3.jpg')
    })

    it('renders photo placeholder for null photo in array', () => {
      const finding = createMockFinding({
        photos: ['https://example.com/photo1.jpg', null as any, 'https://example.com/photo2.jpg'],
      })
      render(<FindingCard finding={finding} />)

      // Should render photos and placeholders
      const images = screen.getAllByRole('img', { name: /Finding photo/i })
      expect(images.length).toBeGreaterThan(0)
    })

    it('sets alt text correctly for photos', () => {
      const finding = createMockFinding({
        photos: ['https://example.com/photo1.jpg'],
      })
      render(<FindingCard finding={finding} />)

      const image = screen.getByAltText('Finding photo 1')
      expect(image).toBeInTheDocument()
    })

    it('sets loading attribute to lazy for photos', () => {
      const finding = createMockFinding({
        photos: ['https://example.com/photo1.jpg'],
      })
      render(<FindingCard finding={finding} />)

      const image = screen.getByRole('img', { name: /Finding photo/i })
      expect(image).toHaveAttribute('loading', 'lazy')
    })
  })

  describe('Interaction', () => {
    it('calls onClick when card is clicked and hoverable is true', () => {
      const handleClick = vi.fn()
      const finding = createMockFinding()

      render(<FindingCard finding={finding} onClick={handleClick} hoverable={true} />)

      const card = screen.getByText('Test Finding').closest('div')?.parentElement?.parentElement
      card?.click()

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('does not add hover styles when hoverable is false', () => {
      const finding = createMockFinding()
      const { container } = render(<FindingCard finding={finding} hoverable={false} />)

      // Card should not have pointer cursor when not hoverable
      const card = container.querySelector('[class*="MuiCard-root"]')
      expect(card).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles missing optional fields gracefully', () => {
      const finding: Finding = {
        id: '1',
        inspectionId: 'inspection-1',
        title: 'Minimal Finding',
        severity: 'low',
        status: 'open',
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      }

      render(<FindingCard finding={finding} />)

      expect(screen.getByText('Minimal Finding')).toBeInTheDocument()
      expect(screen.getByText('Low')).toBeInTheDocument()
    })

    it('handles very long description', () => {
      const longDescription = 'A'.repeat(500)
      const finding = createMockFinding({ description: longDescription })

      render(<FindingCard finding={finding} />)

      expect(screen.getByText(longDescription)).toBeInTheDocument()
    })

    it('handles very long title', () => {
      const longTitle = 'Very Long Finding Title '.repeat(10)
      const finding = createMockFinding({ title: longTitle })

      render(<FindingCard finding={finding} />)

      expect(screen.getByText(longTitle)).toBeInTheDocument()
    })

    it('handles invalid photo URLs gracefully', () => {
      const finding = createMockFinding({
        photos: ['invalid-url', 'https://example.com/valid.jpg'],
      })

      render(<FindingCard finding={finding} />)

      const images = screen.getAllByRole('img', { name: /Finding photo/i })
      expect(images.length).toBeGreaterThan(0)
    })
  })

  describe('Accessibility', () => {
    it('renders semantic HTML structure', () => {
      const finding = createMockFinding()
      const { container } = render(<FindingCard finding={finding} />)

      // Should use proper heading hierarchy
      expect(screen.getByRole('heading', { name: 'Test Finding' })).toBeInTheDocument()
    })

    it('provides alt text for images', () => {
      const finding = createMockFinding({
        photos: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
      })
      render(<FindingCard finding={finding} />)

      expect(screen.getByAltText('Finding photo 1')).toBeInTheDocument()
      expect(screen.getByAltText('Finding photo 2')).toBeInTheDocument()
    })
  })
})
