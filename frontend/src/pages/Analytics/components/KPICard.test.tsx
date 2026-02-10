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
})
