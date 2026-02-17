import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import AnalyticsKPICard from './KPICard'
import { renderWithProviders } from '../../../test/test-utils'

describe('AnalyticsKPICard', () => {
  it('renders title and value', () => {
    renderWithProviders(<AnalyticsKPICard title="Total Projects" value={42} />)
    expect(screen.getByText('Total Projects')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders string value', () => {
    renderWithProviders(<AnalyticsKPICard title="Rate" value="85.5%" />)
    expect(screen.getByText('85.5%')).toBeInTheDocument()
  })

  it('renders loading skeleton', () => {
    const { container } = renderWithProviders(
      <AnalyticsKPICard title="Loading" value={0} loading />
    )
    const skeletons = container.querySelectorAll('.MuiSkeleton-root')
    expect(skeletons.length).toBe(3)
    expect(screen.queryByText('Loading')).not.toBeInTheDocument()
  })

  it('renders positive trend with up arrow and plus sign', () => {
    renderWithProviders(
      <AnalyticsKPICard title="Projects" value={10} trend={5} trendLabel="vs last month" />
    )
    expect(screen.getByText('+5%')).toBeInTheDocument()
    expect(screen.getByText('vs last month')).toBeInTheDocument()
    expect(screen.getByTestId('TrendingUpIcon')).toBeInTheDocument()
  })

  it('renders negative trend with down arrow', () => {
    renderWithProviders(
      <AnalyticsKPICard title="Issues" value={3} trend={-10} />
    )
    expect(screen.getByText('-10%')).toBeInTheDocument()
    expect(screen.getByTestId('TrendingDownIcon')).toBeInTheDocument()
  })

  it('renders zero trend with flat arrow', () => {
    renderWithProviders(
      <AnalyticsKPICard title="Stable" value={5} trend={0} />
    )
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByTestId('TrendingFlatIcon')).toBeInTheDocument()
  })

  it('does not render trend section when trend is undefined', () => {
    renderWithProviders(<AnalyticsKPICard title="No Trend" value={7} />)
    expect(screen.queryByTestId('TrendingUpIcon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('TrendingDownIcon')).not.toBeInTheDocument()
    expect(screen.queryByTestId('TrendingFlatIcon')).not.toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    renderWithProviders(
      <AnalyticsKPICard title="With Icon" value={1} icon={<span data-testid="custom-icon" />} />
    )
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn()
    renderWithProviders(
      <AnalyticsKPICard title="Clickable" value={5} onClick={onClick} />
    )
    fireEvent.click(screen.getByText('Clickable'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not crash when onClick is not provided', () => {
    renderWithProviders(<AnalyticsKPICard title="Not Clickable" value={0} />)
    expect(() => fireEvent.click(screen.getByText('Not Clickable'))).not.toThrow()
  })

  it('renders trend label only when provided', () => {
    renderWithProviders(
      <AnalyticsKPICard title="Test" value={5} trend={3} />
    )
    expect(screen.getByText('+3%')).toBeInTheDocument()
    expect(screen.queryByText('vs last month')).not.toBeInTheDocument()
  })

  describe('Keyboard Accessibility', () => {
    it('is keyboard accessible when onClick is provided', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('has descriptive aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Total Users" value={150} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Total Users: 150')
    })

    it('includes positive trend in aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Revenue" value="$5000" trend={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Revenue: $5000, up 10%')
    })

    it('includes negative trend in aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Errors" value={5} trend={-15} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Errors: 5, down 15%')
    })

    it('includes stable trend in aria-label', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Users" value={100} trend={0} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).toHaveAttribute('aria-label', 'Users: 100, stable 0%')
    })

    it('responds to Enter key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: 'Enter' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('responds to Space key', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: ' ' })
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('does not respond to other keys', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement
      fireEvent.keyDown(card, { key: 'a' })
      fireEvent.keyDown(card, { key: 'Escape' })
      fireEvent.keyDown(card, { key: 'Tab' })
      expect(onClick).not.toHaveBeenCalled()
    })

    it('prevents default behavior on Enter and Space', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Test" value={10} onClick={onClick} />
      )
      const card = container.firstChild as HTMLElement

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      const spaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      const preventDefaultSpy1 = vi.spyOn(enterEvent, 'preventDefault')
      const preventDefaultSpy2 = vi.spyOn(spaceEvent, 'preventDefault')

      card.dispatchEvent(enterEvent)
      card.dispatchEvent(spaceEvent)

      expect(preventDefaultSpy1).toHaveBeenCalled()
      expect(preventDefaultSpy2).toHaveBeenCalled()
    })

    it('is not keyboard accessible when onClick is not provided', () => {
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Test" value={10} />
      )
      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveAttribute('role', 'button')
      expect(card).not.toHaveAttribute('tabIndex')
      expect(card).not.toHaveAttribute('aria-label')
    })

    it('is not keyboard accessible when loading', () => {
      const onClick = vi.fn()
      const { container } = renderWithProviders(
        <AnalyticsKPICard title="Test" value={10} onClick={onClick} loading />
      )
      const card = container.firstChild as HTMLElement
      expect(card).not.toHaveAttribute('role', 'button')
      expect(card).not.toHaveAttribute('tabIndex')
      expect(card).not.toHaveAttribute('aria-label')
    })
  })
})
