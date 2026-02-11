import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { WorkloadBar } from './WorkloadBar'
import { renderWithProviders } from '../test/test-utils'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))

vi.mock('../utils/workloadCalculation', () => ({
  getWorkloadColor: (percent: number) => {
    if (percent <= 60) return 'success'
    if (percent <= 90) return 'warning'
    return 'error'
  },
}))

describe('WorkloadBar', () => {
  it('renders with default props', () => {
    renderWithProviders(<WorkloadBar value={50} />)
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('renders custom label', () => {
    renderWithProviders(<WorkloadBar value={70} label="Dev Team" />)
    expect(screen.getByText('Dev Team')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('hides value when showValue is false', () => {
    renderWithProviders(<WorkloadBar value={50} showValue={false} />)
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('renders hours when showHours is true', () => {
    renderWithProviders(
      <WorkloadBar value={75} showHours assignedHours={30} availableHours={40} />
    )
    expect(screen.getByText(/30common\.hoursShort.*40common\.hoursShort/)).toBeInTheDocument()
  })

  it('does not show hours when showHours is false', () => {
    renderWithProviders(
      <WorkloadBar value={75} showHours={false} assignedHours={30} availableHours={40} />
    )
    expect(screen.queryByText(/30common\.hoursShort/)).not.toBeInTheDocument()
  })

  it('shows over-capacity warning when value > 100', () => {
    renderWithProviders(<WorkloadBar value={120} />)
    expect(screen.getByText(/workloadBar.overAllocated/)).toBeInTheDocument()
    expect(screen.getByText(/workloadBar.overCapacity/)).toBeInTheDocument()
  })

  it('does not show warning when value is 100', () => {
    renderWithProviders(<WorkloadBar value={100} />)
    expect(screen.queryByText(/workloadBar.overCapacity/)).not.toBeInTheDocument()
  })

  it('does not show warning when value < 100', () => {
    renderWithProviders(<WorkloadBar value={60} />)
    expect(screen.queryByText(/workloadBar.overCapacity/)).not.toBeInTheDocument()
  })

  it('renders 0% value correctly', () => {
    renderWithProviders(<WorkloadBar value={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '0')
  })

  it('clamps progress bar at 100 for display', () => {
    renderWithProviders(<WorkloadBar value={150} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('150%')).toBeInTheDocument()
  })

  it('clamps negative values to 0 for progress bar', () => {
    renderWithProviders(<WorkloadBar value={-10} />)
    const progressbar = screen.getByRole('progressbar')
    expect(progressbar).toHaveAttribute('aria-valuenow', '0')
  })

  it('rounds display value to integer', () => {
    renderWithProviders(<WorkloadBar value={75.6} />)
    expect(screen.getByText('76%')).toBeInTheDocument()
  })
})
