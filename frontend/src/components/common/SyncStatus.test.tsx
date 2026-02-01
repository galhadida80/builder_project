import { render, screen } from '@testing-library/react'
import SyncStatus from './SyncStatus'

describe('SyncStatus', () => {
  describe('Status Labels', () => {
    it('displays "Idle" label for idle status', () => {
      render(<SyncStatus status="idle" />)
      expect(screen.getByText('Idle')).toBeInTheDocument()
    })

    it('displays "Syncing" label for syncing status', () => {
      render(<SyncStatus status="syncing" />)
      expect(screen.getByText('Syncing')).toBeInTheDocument()
    })

    it('displays "Synced" label for synced status', () => {
      render(<SyncStatus status="synced" />)
      expect(screen.getByText('Synced')).toBeInTheDocument()
    })

    it('displays "Sync Error" label for error status', () => {
      render(<SyncStatus status="error" />)
      expect(screen.getByText('Sync Error')).toBeInTheDocument()
    })
  })

  describe('Icons', () => {
    it('shows circle icon for idle status', () => {
      const { container } = render(<SyncStatus status="idle" />)
      const icon = container.querySelector('[data-testid="CloudQueueIcon"]')
      expect(icon).toBeInTheDocument()
    })

    it('shows circular progress for syncing status', () => {
      const { container } = render(<SyncStatus status="syncing" />)
      const progress = container.querySelector('.MuiCircularProgress-root')
      expect(progress).toBeInTheDocument()
    })

    it('shows check circle icon for synced status', () => {
      const { container } = render(<SyncStatus status="synced" />)
      const icon = container.querySelector('[data-testid="CheckCircleIcon"]')
      expect(icon).toBeInTheDocument()
    })

    it('shows error icon for error status', () => {
      const { container } = render(<SyncStatus status="error" />)
      const icon = container.querySelector('[data-testid="ErrorIcon"]')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Colors', () => {
    it('uses default color for idle status', () => {
      const { container } = render(<SyncStatus status="idle" />)
      const chip = container.querySelector('.MuiChip-colorDefault')
      expect(chip).toBeInTheDocument()
    })

    it('uses info color for syncing status', () => {
      const { container } = render(<SyncStatus status="syncing" />)
      const chip = container.querySelector('.MuiChip-colorInfo')
      expect(chip).toBeInTheDocument()
    })

    it('uses success color for synced status', () => {
      const { container } = render(<SyncStatus status="synced" />)
      const chip = container.querySelector('.MuiChip-colorSuccess')
      expect(chip).toBeInTheDocument()
    })

    it('uses error color for error status', () => {
      const { container } = render(<SyncStatus status="error" />)
      const chip = container.querySelector('.MuiChip-colorError')
      expect(chip).toBeInTheDocument()
    })
  })

  describe('Size Prop', () => {
    it('renders with small size', () => {
      const { container } = render(<SyncStatus status="idle" size="small" />)
      const chip = container.querySelector('.MuiChip-sizeSmall')
      expect(chip).toBeInTheDocument()
    })

    it('renders with medium size by default', () => {
      const { container } = render(<SyncStatus status="idle" />)
      const chip = container.querySelector('.MuiChip-sizeMedium')
      expect(chip).toBeInTheDocument()
    })

    it('scales icon size based on chip size - small', () => {
      const { container } = render(<SyncStatus status="idle" size="small" />)
      const icon = container.querySelector('[data-testid="CloudQueueIcon"]')
      // Small size should use 16px icon
      expect(icon).toHaveStyle({ fontSize: '16px' })
    })

    it('scales icon size based on chip size - medium', () => {
      const { container } = render(<SyncStatus status="idle" size="medium" />)
      const icon = container.querySelector('[data-testid="CloudQueueIcon"]')
      // Medium size should use 20px icon
      expect(icon).toHaveStyle({ fontSize: '20px' })
    })
  })

  describe('Component Integration', () => {
    it('renders as MUI Chip component', () => {
      const { container } = render(<SyncStatus status="idle" />)
      const chip = container.querySelector('.MuiChip-root')
      expect(chip).toBeInTheDocument()
    })

    it('all status values render without errors', () => {
      const statuses: Array<'idle' | 'syncing' | 'synced' | 'error'> = [
        'idle',
        'syncing',
        'synced',
        'error',
      ]

      statuses.forEach(status => {
        const { unmount } = render(<SyncStatus status={status} />)
        expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
        unmount()
      })
    })
  })
})
