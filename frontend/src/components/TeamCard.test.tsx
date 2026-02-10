import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { TeamCard } from './TeamCard'
import { renderWithProviders } from '../test/test-utils'
import type { TeamMember } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => opts?.count !== undefined ? `${key}(${opts.count})` : opts?.defaultValue ? String(opts.defaultValue) : key, i18n: { language: 'en' } }),
}))

vi.mock('../utils/workloadCalculation', () => ({
  getWorkloadColor: (percent: number) => {
    if (percent <= 60) return 'success'
    if (percent <= 90) return 'warning'
    return 'error'
  },
}))

vi.mock('./ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
  AvatarGroup: ({ users }: { users: { name: string }[] }) => (
    <div data-testid="avatar-group">{users.map(u => u.name).join(', ')}</div>
  ),
}))

const makeMember = (overrides: Partial<TeamMember> = {}): TeamMember => ({
  id: 'member-1',
  userId: 'user-1',
  user: { id: 'user-1', email: 'alice@test.com', fullName: 'Alice Smith', isActive: true, createdAt: '2024-01-01' },
  role: 'inspector',
  availableHours: 40,
  assignedHours: 30,
  workloadPercent: 75,
  createdAt: '2024-01-01',
  ...overrides,
})

describe('TeamCard', () => {
  const members = [
    makeMember({ id: 'm1', userId: 'u1', user: { id: 'u1', email: 'a@t.com', fullName: 'Alice', isActive: true, createdAt: '2024-01-01' }, workloadPercent: 70, assignedHours: 28, availableHours: 40 }),
    makeMember({ id: 'm2', userId: 'u2', user: { id: 'u2', email: 'b@t.com', fullName: 'Bob', isActive: true, createdAt: '2024-01-01' }, workloadPercent: 90, assignedHours: 36, availableHours: 40 }),
  ]

  it('renders team name', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} />)
    expect(screen.getByText('Electrical')).toBeInTheDocument()
  })

  it('renders member count', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} />)
    expect(screen.getByText('teamCard.memberCount(2)')).toBeInTheDocument()
  })

  it('renders average workload chip', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} />)
    expect(screen.getByText('80% teamCard.avg')).toBeInTheDocument()
  })

  it('renders avatar group when not showing details', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} showDetails={false} />)
    expect(screen.getByTestId('avatar-group')).toBeInTheDocument()
  })

  it('hides avatar group when showing details', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} showDetails />)
    expect(screen.queryByTestId('avatar-group')).not.toBeInTheDocument()
  })

  it('shows team capacity in collapsed view', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} />)
    expect(screen.getByText('teamCard.teamCapacity')).toBeInTheDocument()
    expect(screen.getByText('teamCard.assigned')).toBeInTheDocument()
    expect(screen.getByText('teamCard.available')).toBeInTheDocument()
    expect(screen.getByText('teamCard.utilization')).toBeInTheDocument()
    expect(screen.getByText('64h')).toBeInTheDocument()
    expect(screen.getByText('80h')).toBeInTheDocument()
  })

  it('shows member details in expanded view', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} showDetails />)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(0)
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('shows hours chip for each member in expanded view', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={members} showDetails />)
    expect(screen.getByText('28/40h')).toBeInTheDocument()
    expect(screen.getByText('36/40h')).toBeInTheDocument()
  })

  it('calls onClick when card is clicked', () => {
    const onClick = vi.fn()
    renderWithProviders(<TeamCard teamName="Electrical" members={members} onClick={onClick} />)
    fireEvent.click(screen.getByText('Electrical'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('shows no members message in expanded view with empty members', () => {
    renderWithProviders(<TeamCard teamName="Electrical" members={[]} showDetails />)
    expect(screen.getByText('teamCard.noMembers')).toBeInTheDocument()
  })

  it('renders 0% avg workload for empty members', () => {
    renderWithProviders(<TeamCard teamName="Empty" members={[]} />)
    expect(screen.getByText('0% teamCard.avg')).toBeInTheDocument()
  })
})
