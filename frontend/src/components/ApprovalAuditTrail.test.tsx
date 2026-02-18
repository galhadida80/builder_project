import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { ApprovalAuditTrail, ApprovalAction } from './ApprovalAuditTrail'
import { renderWithProviders } from '../test/test-utils'

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  }
})

vi.mock('./ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}))

vi.mock('./ui/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}))

const makeAction = (overrides: Partial<ApprovalAction> = {}): ApprovalAction => ({
  id: 'action-1',
  action: 'submitted',
  user: { id: 'user-1', fullName: 'Alice Smith', email: 'alice@test.com' },
  timestamp: '2024-06-15T10:30:00Z',
  ...overrides,
})

describe('ApprovalAuditTrail', () => {
  it('renders loading skeletons when loading', () => {
    const { container } = renderWithProviders(
      <ApprovalAuditTrail actions={[]} loading />
    )
    const skeletons = container.querySelectorAll('.MuiSkeleton-root')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('renders empty state when no actions', () => {
    renderWithProviders(<ApprovalAuditTrail actions={[]} />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(screen.getByText('approvals.noHistory')).toBeInTheDocument()
    expect(screen.getByText('approvals.noHistoryDescription')).toBeInTheDocument()
  })

  it('renders action entries with correct chips', () => {
    const actions = [
      makeAction({ id: '1', action: 'submitted' }),
      makeAction({ id: '2', action: 'approved' }),
    ]
    renderWithProviders(<ApprovalAuditTrail actions={actions} />)
    expect(screen.getByText('approvalAuditTrail.submitted')).toBeInTheDocument()
    expect(screen.getByText('approvalAuditTrail.approved')).toBeInTheDocument()
  })

  it('renders user name and email', () => {
    renderWithProviders(<ApprovalAuditTrail actions={[makeAction()]} />)
    expect(screen.getAllByText('Alice Smith').length).toBeGreaterThan(0)
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
  })

  it('renders comment when present', () => {
    const action = makeAction({ comment: 'Looks good, approved.' })
    renderWithProviders(<ApprovalAuditTrail actions={[action]} />)
    expect(screen.getByText('Looks good, approved.')).toBeInTheDocument()
  })

  it('does not render comment box when no comment', () => {
    const action = makeAction({ comment: undefined })
    renderWithProviders(<ApprovalAuditTrail actions={[action]} />)
    expect(screen.queryByText('Looks good, approved.')).not.toBeInTheDocument()
  })

  it('renders field changes when present', () => {
    const action = makeAction({
      action: 'revised',
      changes: { status: { old: 'draft', new: 'in_review' } },
    })
    renderWithProviders(<ApprovalAuditTrail actions={[action]} />)
    expect(screen.getByText('approvalAuditTrail.changes')).toBeInTheDocument()
    expect(screen.getByText(/draft/)).toBeInTheDocument()
    expect(screen.getByText(/in_review/)).toBeInTheDocument()
  })

  it('renders all action types', () => {
    const types: ApprovalAction['action'][] = ['submitted', 'approved', 'rejected', 'commented', 'revised', 'resubmitted']
    const actions = types.map((action, i) => makeAction({ id: `${i}`, action }))
    renderWithProviders(<ApprovalAuditTrail actions={actions} />)
    types.forEach(type => {
      expect(screen.getByText(`approvalAuditTrail.${type}`)).toBeInTheDocument()
    })
  })

  it('renders timestamp for each action', () => {
    renderWithProviders(<ApprovalAuditTrail actions={[makeAction()]} />)
    expect(screen.getByText(/Jun/)).toBeInTheDocument()
  })

  it('does not show changes section when changes is empty object', () => {
    const action = makeAction({ changes: {} })
    renderWithProviders(<ApprovalAuditTrail actions={[action]} />)
    expect(screen.queryByText('approvalAuditTrail.changes')).not.toBeInTheDocument()
  })
})
