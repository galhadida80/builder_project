import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/test-utils'
import { ApprovalQueueList } from './ApprovalQueueList'
import { approvalsApi } from '../api/approvals'

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>()
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => opts?.count !== undefined ? `${key}(${opts.count})` : opts?.action ? `${key}(${opts.action})` : key,
      i18n: { language: 'en' },
    }),
  }
})

vi.mock('../components/common/ToastProvider', () => ({
  useToast: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}))

vi.mock('../api/approvals', () => ({
  approvalsApi: {
    myPending: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
  },
}))

vi.mock('./ui/DataTable', () => ({
  DataTable: ({ rows, loading, columns }: { rows: unknown[]; loading: boolean; columns: { id: string; label: string }[] }) => (
    <div data-testid="data-table">
      {loading && <div data-testid="table-loading">Loading...</div>}
      <table>
        <thead>
          <tr>
            {columns.map(col => <th key={col.id}>{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: Record<string, unknown>, i: number) => (
            <tr key={i} data-testid="table-row">
              <td>{String(row.id).slice(0, 8)}</td>
              <td>{String(row.entityName)}</td>
              <td>{String(row.requesterName)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ),
}))

vi.mock('./ui/StatusBadge', () => ({
  StatusBadge: ({ status }: { status: string }) => <span data-testid="status-badge">{status}</span>,
}))

vi.mock('./ui/Tabs', () => ({
  Tabs: ({ items, value, onChange }: { items: { label: string; value: string; badge?: number }[]; value: string; onChange: (v: string) => void }) => (
    <div data-testid="tabs">
      {items.map(item => (
        <button key={item.value} data-testid={`tab-${item.value}`} onClick={() => onChange(item.value)} aria-selected={item.value === value}>
          {item.label} {item.badge !== undefined && `(${item.badge})`}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('./ui/TextField', () => ({
  SearchField: ({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (e: { target: { value: string } }) => void }) => (
    <input data-testid="search-field" placeholder={placeholder} value={value} onChange={onChange} />
  ),
  TextField: ({ label, value, onChange }: { label: string; value: string; onChange: (e: { target: { value: string } }) => void }) => (
    <input data-testid="text-field" aria-label={label} value={value} onChange={onChange} />
  ),
}))

vi.mock('./ui/Modal', () => ({
  FormModal: ({ open, title, children, onSubmit, onClose, submitDisabled }: { open: boolean; title: string; children: React.ReactNode; onSubmit: () => void; onClose: () => void; submitDisabled?: boolean }) => (
    open ? (
      <div data-testid="form-modal">
        <h2>{title}</h2>
        {children}
        <button data-testid="modal-submit" onClick={onSubmit} disabled={submitDisabled}>Submit</button>
        <button data-testid="modal-close" onClick={onClose}>Close</button>
      </div>
    ) : null
  ),
}))

vi.mock('./ui/EmptyState', () => ({
  EmptyState: ({ title, description, action }: { title: string; description?: string; action?: { label: string; onClick: () => void } }) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      {description && <span>{description}</span>}
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
}))

const mockApprovals = [
  {
    id: 'appr-1',
    projectId: 'proj-1',
    entityType: 'equipment',
    entityId: 'eq-1',
    currentStatus: 'submitted',
    createdAt: '2024-06-15T10:00:00Z',
    steps: [],
    createdBy: { id: 'u1', fullName: 'John Doe', email: 'john@test.com', isActive: true, createdAt: '2024-01-01' },
  },
  {
    id: 'appr-2',
    projectId: 'proj-1',
    entityType: 'material',
    entityId: 'mat-1',
    currentStatus: 'approved',
    createdAt: '2024-06-14T10:00:00Z',
    steps: [],
    createdBy: { id: 'u2', fullName: 'Jane Smith', email: 'jane@test.com', isActive: true, createdAt: '2024-01-01' },
  },
  {
    id: 'appr-3',
    projectId: 'proj-2',
    entityType: 'equipment',
    entityId: 'eq-3',
    currentStatus: 'rejected',
    createdAt: '2024-06-13T10:00:00Z',
    steps: [],
    createdBy: { id: 'u3', fullName: 'Bob Wilson', email: 'bob@test.com', isActive: true, createdAt: '2024-01-01' },
  },
]

describe('ApprovalQueueList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(approvalsApi.myPending).mockResolvedValue(mockApprovals as never)
    vi.mocked(approvalsApi.approve).mockResolvedValue(undefined as never)
    vi.mocked(approvalsApi.reject).mockResolvedValue(undefined as never)
  })

  it('renders loading state initially', () => {
    renderWithProviders(<ApprovalQueueList />)
    expect(screen.getByTestId('data-table')).toBeInTheDocument()
  })

  it('renders tabs after loading', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })
    expect(screen.getByTestId('tab-pending')).toBeInTheDocument()
    expect(screen.getByTestId('tab-approved')).toBeInTheDocument()
    expect(screen.getByTestId('tab-rejected')).toBeInTheDocument()
    expect(screen.getByTestId('tab-all')).toBeInTheDocument()
  })

  it('renders search field', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByTestId('search-field')).toBeInTheDocument()
    })
  })

  it('shows pending approvals by default', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      const rows = screen.getAllByTestId('table-row')
      expect(rows).toHaveLength(1)
    })
    expect(screen.getByText('John Doe')).toBeInTheDocument()
  })

  it('shows all approvals when all tab is clicked', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByTestId('tab-all')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('tab-all'))
    await waitFor(() => {
      const rows = screen.getAllByTestId('table-row')
      expect(rows).toHaveLength(3)
    })
  })

  it('shows approved tab content', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByTestId('tab-approved')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('tab-approved'))
    await waitFor(() => {
      const rows = screen.getAllByTestId('table-row')
      expect(rows).toHaveLength(1)
    })
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
  })

  it('shows rejected tab content', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByTestId('tab-rejected')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('tab-rejected'))
    await waitFor(() => {
      const rows = screen.getAllByTestId('table-row')
      expect(rows).toHaveLength(1)
    })
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument()
  })

  it('filters by search query', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByTestId('search-field')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('tab-all'))
    await waitFor(() => {
      expect(screen.getAllByTestId('table-row')).toHaveLength(3)
    })
    fireEvent.change(screen.getByTestId('search-field'), { target: { value: 'Jane' } })
    await waitFor(() => {
      expect(screen.getAllByTestId('table-row')).toHaveLength(1)
    })
  })

  it('shows empty state when no pending approvals', async () => {
    vi.mocked(approvalsApi.myPending).mockResolvedValue([
      { ...mockApprovals[1] },
    ] as never)
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByText('approvalQueue.noPendingApprovals')).toBeInTheDocument()
    })
  })

  it('shows error state and retry button on API failure', async () => {
    vi.mocked(approvalsApi.myPending).mockRejectedValue(new Error('Network error'))
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByText('approvalQueue.failedToLoad')).toBeInTheDocument()
    })
    expect(screen.getByText('approvalQueue.retry')).toBeInTheDocument()
  })

  it('retries loading on retry button click', async () => {
    vi.mocked(approvalsApi.myPending).mockRejectedValueOnce(new Error('Network error'))
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByText('approvalQueue.retry')).toBeInTheDocument()
    })
    vi.mocked(approvalsApi.myPending).mockResolvedValue(mockApprovals as never)
    fireEvent.click(screen.getByText('approvalQueue.retry'))
    await waitFor(() => {
      expect(approvalsApi.myPending).toHaveBeenCalledTimes(2)
    })
  })

  it('calls approvalsApi.myPending on mount', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(approvalsApi.myPending).toHaveBeenCalledTimes(1)
    })
  })

  it('displays items count chip', async () => {
    renderWithProviders(<ApprovalQueueList />)
    await waitFor(() => {
      expect(screen.getByText('approvalQueue.itemsCount(1)')).toBeInTheDocument()
    })
  })
})
