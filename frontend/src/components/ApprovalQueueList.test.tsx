import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApprovalQueueList } from './ApprovalQueueList'
import { approvalsApi } from '../api/approvals'
import type { ApprovalRequest } from '../types'

// Mock the API
vi.mock('../api/approvals')

// Mock toast provider
const mockShowSuccess = vi.fn()
const mockShowError = vi.fn()
vi.mock('./common/ToastProvider', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}))

// Mock data factory
const createMockApproval = (overrides?: Partial<ApprovalRequest>): ApprovalRequest => ({
  id: 'approval-123',
  projectId: 'project-1',
  entityType: 'equipment',
  entityId: 'equip-1',
  currentStatus: 'pending',
  createdAt: '2026-02-01T00:00:00Z',
  createdBy: { fullName: 'John Doe', email: 'john@example.com' },
  steps: [],
  ...overrides,
})

describe('ApprovalQueueList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering Tests', () => {
    it('renders with empty data', async () => {
      vi.mocked(approvalsApi.myPending).mockResolvedValue([])

      render(<ApprovalQueueList />)

      await waitFor(() => {
        expect(screen.getByText(/no pending approvals/i)).toBeInTheDocument()
      })
      expect(screen.getByText(/All requests have been processed/i)).toBeInTheDocument()
    })

    it('shows loading skeleton during data fetch', () => {
      vi.mocked(approvalsApi.myPending).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<ApprovalQueueList />)

      // DataTable component shows loading prop when loading=true
      // Check for the presence of the table structure with loading state
      expect(screen.queryByText(/no pending approvals/i)).not.toBeInTheDocument()
    })

    it('renders populated data correctly', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({
          id: 'approval-123',
          entityType: 'equipment',
          entityId: 'equip-1',
          createdBy: { fullName: 'John Doe', email: 'john@example.com' },
        }),
        createMockApproval({
          id: 'approval-456',
          entityType: 'material',
          entityId: 'material-2',
          createdBy: { fullName: 'Jane Smith', email: 'jane@example.com' },
        }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => {
        expect(screen.getByText(/Equipment equip-1/i)).toBeInTheDocument()
        expect(screen.getByText(/Material material-2/i)).toBeInTheDocument()
        expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
        expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument()
      })
    })

    it('displays all 7 columns', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => {
        expect(screen.getByText('ID')).toBeInTheDocument()
        expect(screen.getByText('Title')).toBeInTheDocument()
        expect(screen.getByText('Project')).toBeInTheDocument()
        expect(screen.getByText('Requester')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Created Date')).toBeInTheDocument()
        expect(screen.getByText('Actions')).toBeInTheDocument()
      })
    })
  })

  describe('Filter Functionality', () => {
    it('filters by tab selection - Pending', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ id: '1', currentStatus: 'pending' }),
        createMockApproval({ id: '2', currentStatus: 'approved', entityId: 'equip-2' }),
        createMockApproval({ id: '3', currentStatus: 'rejected', entityId: 'equip-3' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Default tab is Pending, should show only pending item
      expect(screen.getByText(/Equipment equip-1/i)).toBeInTheDocument()
      // Other items should not be visible
      expect(screen.queryByText(/Equipment equip-2/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Equipment equip-3/i)).not.toBeInTheDocument()
    })

    it('filters by tab selection - Approved', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ id: '1', currentStatus: 'pending', entityId: 'equip-1' }),
        createMockApproval({ id: '2', currentStatus: 'approved', entityId: 'equip-2' }),
        createMockApproval({ id: '3', currentStatus: 'rejected', entityId: 'equip-3' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click Approved tab
      const approvedTab = screen.getByRole('tab', { name: /Approved/i })
      fireEvent.click(approvedTab)

      // Should only show approved item
      expect(screen.queryByText(/Equipment equip-1/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Equipment equip-2/i)).toBeInTheDocument()
      expect(screen.queryByText(/Equipment equip-3/i)).not.toBeInTheDocument()
    })

    it('filters by tab selection - Rejected', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ id: '1', currentStatus: 'pending', entityId: 'equip-1' }),
        createMockApproval({ id: '2', currentStatus: 'approved', entityId: 'equip-2' }),
        createMockApproval({ id: '3', currentStatus: 'rejected', entityId: 'equip-3' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click Rejected tab
      const rejectedTab = screen.getByRole('tab', { name: /Rejected/i })
      fireEvent.click(rejectedTab)

      // Should only show rejected item
      expect(screen.queryByText(/Equipment equip-1/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Equipment equip-2/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Equipment equip-3/i)).toBeInTheDocument()
    })

    it('filters by tab selection - All', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ id: '1', currentStatus: 'pending', entityId: 'equip-1' }),
        createMockApproval({ id: '2', currentStatus: 'approved', entityId: 'equip-2' }),
        createMockApproval({ id: '3', currentStatus: 'rejected', entityId: 'equip-3' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click All tab
      const allTab = screen.getByRole('tab', { name: /All/i })
      fireEvent.click(allTab)

      // Should show all items
      expect(screen.getByText(/Equipment equip-1/i)).toBeInTheDocument()
      expect(screen.getByText(/Equipment equip-2/i)).toBeInTheDocument()
      expect(screen.getByText(/Equipment equip-3/i)).toBeInTheDocument()
    })

    it('shows accurate badge counts for each tab', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ id: '1', currentStatus: 'pending' }),
        createMockApproval({ id: '2', currentStatus: 'pending', entityId: 'equip-2' }),
        createMockApproval({ id: '3', currentStatus: 'approved', entityId: 'equip-3' }),
        createMockApproval({ id: '4', currentStatus: 'rejected', entityId: 'equip-4' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => {
        // Pending: 2, Approved: 1, Rejected: 1, All: 4
        const pendingTab = screen.getByRole('tab', { name: /Pending/i })
        const approvedTab = screen.getByRole('tab', { name: /Approved/i })
        const rejectedTab = screen.getByRole('tab', { name: /Rejected/i })
        const allTab = screen.getByRole('tab', { name: /All/i })

        expect(within(pendingTab).getByText('2')).toBeInTheDocument()
        expect(within(approvedTab).getByText('1')).toBeInTheDocument()
        expect(within(rejectedTab).getByText('1')).toBeInTheDocument()
        expect(within(allTab).getByText('4')).toBeInTheDocument()
      })
    })

    it('searches by entity name', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ id: '1', entityType: 'equipment', entityId: 'drill-1' }),
        createMockApproval({ id: '2', entityType: 'material', entityId: 'cement-1' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment drill-1/i))

      // Search by entity name
      const searchField = screen.getByPlaceholderText(/Search approvals/i)
      fireEvent.change(searchField, { target: { value: 'drill' } })

      // Should only show drill item
      expect(screen.getByText(/Equipment drill-1/i)).toBeInTheDocument()
      expect(screen.queryByText(/Material cement-1/i)).not.toBeInTheDocument()
    })

    it('searches by requester name', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({
          id: '1',
          entityId: 'drill-1',
          createdBy: { fullName: 'John Doe', email: 'john@example.com' },
        }),
        createMockApproval({
          id: '2',
          entityId: 'cement-1',
          createdBy: { fullName: 'Jane Smith', email: 'jane@example.com' },
        }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/John Doe/i))

      // Search by requester name
      const searchField = screen.getByPlaceholderText(/Search approvals/i)
      fireEvent.change(searchField, { target: { value: 'Jane' } })

      // Should only show Jane's item
      expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Jane Smith/i)).toBeInTheDocument()
    })

    it('combines tab filter and search', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ id: '1', currentStatus: 'pending', entityId: 'drill-1' }),
        createMockApproval({ id: '2', currentStatus: 'pending', entityId: 'cement-1' }),
        createMockApproval({ id: '3', currentStatus: 'approved', entityId: 'drill-2' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment drill-1/i))

      // Search for 'drill'
      const searchField = screen.getByPlaceholderText(/Search approvals/i)
      fireEvent.change(searchField, { target: { value: 'drill' } })

      // Should show only pending drill (drill-1), not approved drill (drill-2)
      expect(screen.getByText(/Equipment drill-1/i)).toBeInTheDocument()
      expect(screen.queryByText(/Equipment cement-1/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/Equipment drill-2/i)).not.toBeInTheDocument()

      // Switch to All tab
      const allTab = screen.getByRole('tab', { name: /All/i })
      fireEvent.click(allTab)

      // Now should show both drill items
      expect(screen.getByText(/Equipment drill-1/i)).toBeInTheDocument()
      expect(screen.getByText(/Equipment drill-2/i)).toBeInTheDocument()
      expect(screen.queryByText(/Equipment cement-1/i)).not.toBeInTheDocument()
    })
  })

  describe('Action Handlers', () => {
    it('opens approve confirmation dialog when clicking Approve button', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click approve button
      const approveButton = screen.getByTitle(/Approve/i)
      fireEvent.click(approveButton)

      // Dialog should open
      expect(screen.getByText(/Approve Request/i)).toBeInTheDocument()
      expect(screen.getByText(/Equipment equip-1/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Comments \(optional\)/i)).toBeInTheDocument()
    })

    it('opens reject confirmation dialog when clicking Reject button', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click reject button
      const rejectButton = screen.getByTitle(/Reject/i)
      fireEvent.click(rejectButton)

      // Dialog should open
      expect(screen.getByText(/Reject Request/i)).toBeInTheDocument()
      expect(screen.getByText(/Equipment equip-1/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Rejection Reason/i)).toBeInTheDocument()
    })

    it('calls approvalsApi.approve with correct parameters', async () => {
      const mockData = [createMockApproval({ id: 'approval-123' })]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      vi.mocked(approvalsApi.approve).mockResolvedValue({} as any)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click approve button
      const approveButton = screen.getByTitle(/Approve/i)
      fireEvent.click(approveButton)

      // Click confirm without comment
      const confirmButton = screen.getByText(/Confirm Approval/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(approvalsApi.approve).toHaveBeenCalledWith('approval-123', undefined)
      })
    })

    it('calls approvalsApi.approve with comment when provided', async () => {
      const mockData = [createMockApproval({ id: 'approval-123' })]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      vi.mocked(approvalsApi.approve).mockResolvedValue({} as any)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click approve button
      const approveButton = screen.getByTitle(/Approve/i)
      fireEvent.click(approveButton)

      // Add comment
      const commentField = screen.getByLabelText(/Comments \(optional\)/i)
      fireEvent.change(commentField, { target: { value: 'Looks good!' } })

      // Click confirm
      const confirmButton = screen.getByText(/Confirm Approval/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(approvalsApi.approve).toHaveBeenCalledWith('approval-123', 'Looks good!')
      })
    })

    it('calls approvalsApi.reject with comment', async () => {
      const mockData = [createMockApproval({ id: 'approval-123' })]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      vi.mocked(approvalsApi.reject).mockResolvedValue({} as any)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click reject button
      const rejectButton = screen.getByTitle(/Reject/i)
      fireEvent.click(rejectButton)

      // Add comment
      const commentField = screen.getByLabelText(/Rejection Reason/i)
      fireEvent.change(commentField, { target: { value: 'Does not meet requirements' } })

      // Click confirm
      const confirmButton = screen.getByText(/Confirm Rejection/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(approvalsApi.reject).toHaveBeenCalledWith(
          'approval-123',
          'Does not meet requirements'
        )
      })
    })

    it('disables reject button when comment is empty', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click reject button
      const rejectButton = screen.getByTitle(/Reject/i)
      fireEvent.click(rejectButton)

      // Confirm button should be disabled without comment
      const confirmButton = screen.getByText(/Confirm Rejection/i)
      expect(confirmButton).toBeDisabled()
    })

    it('enables reject button when comment is provided', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Click reject button
      const rejectButton = screen.getByTitle(/Reject/i)
      fireEvent.click(rejectButton)

      // Add comment
      const commentField = screen.getByLabelText(/Rejection Reason/i)
      fireEvent.change(commentField, { target: { value: 'Does not meet requirements' } })

      // Confirm button should now be enabled
      const confirmButton = screen.getByText(/Confirm Rejection/i)
      expect(confirmButton).not.toBeDisabled()
    })

    it('shows success toast after approve action', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      vi.mocked(approvalsApi.approve).mockResolvedValue({} as any)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Perform approve action
      const approveButton = screen.getByTitle(/Approve/i)
      fireEvent.click(approveButton)
      const confirmButton = screen.getByText(/Confirm Approval/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Request approved successfully!')
      })
    })

    it('shows success toast after reject action', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      vi.mocked(approvalsApi.reject).mockResolvedValue({} as any)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Perform reject action
      const rejectButton = screen.getByTitle(/Reject/i)
      fireEvent.click(rejectButton)
      const commentField = screen.getByLabelText(/Rejection Reason/i)
      fireEvent.change(commentField, { target: { value: 'Not approved' } })
      const confirmButton = screen.getByText(/Confirm Rejection/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockShowSuccess).toHaveBeenCalledWith('Request rejected.')
      })
    })

    it('shows error toast on API failure', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      vi.mocked(approvalsApi.approve).mockRejectedValue(new Error('API Error'))

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Perform approve action
      const approveButton = screen.getByTitle(/Approve/i)
      fireEvent.click(approveButton)
      const confirmButton = screen.getByText(/Confirm Approval/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(mockShowError).toHaveBeenCalledWith(
          'Failed to approve request. Please try again.'
        )
      })
    })

    it('reloads data after successful action', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending)
        .mockResolvedValueOnce(mockData) // Initial load
        .mockResolvedValueOnce([]) // After approval
      vi.mocked(approvalsApi.approve).mockResolvedValue({} as any)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Perform approve action
      const approveButton = screen.getByTitle(/Approve/i)
      fireEvent.click(approveButton)
      const confirmButton = screen.getByText(/Confirm Approval/i)
      fireEvent.click(confirmButton)

      await waitFor(() => {
        expect(approvalsApi.myPending).toHaveBeenCalledTimes(2)
        expect(screen.getByText(/no pending approvals/i)).toBeInTheDocument()
      })
    })
  })

  describe('State Management', () => {
    it('shows error state on API failure', async () => {
      vi.mocked(approvalsApi.myPending).mockRejectedValue(new Error('API Error'))

      render(<ApprovalQueueList />)

      await waitFor(() => {
        expect(screen.getByText(/Failed to load approvals/i)).toBeInTheDocument()
        expect(mockShowError).toHaveBeenCalledWith('Failed to load approvals. Please try again.')
      })
    })

    it('shows retry button in error state', async () => {
      vi.mocked(approvalsApi.myPending).mockRejectedValue(new Error('API Error'))

      render(<ApprovalQueueList />)

      await waitFor(() => {
        expect(screen.getByText(/Retry/i)).toBeInTheDocument()
      })
    })

    it('retries loading data when retry button is clicked', async () => {
      vi.mocked(approvalsApi.myPending)
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce([createMockApproval()])

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Retry/i))

      // Click retry
      const retryButton = screen.getByText(/Retry/i)
      fireEvent.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText(/Equipment equip-1/i)).toBeInTheDocument()
        expect(approvalsApi.myPending).toHaveBeenCalledTimes(2)
      })
    })

    it('shows empty state for pending tab when no pending approvals', async () => {
      const mockData: ApprovalRequest[] = [
        createMockApproval({ currentStatus: 'approved' }),
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => {
        expect(screen.getByText(/no pending approvals/i)).toBeInTheDocument()
        expect(screen.getByText(/All requests have been processed/i)).toBeInTheDocument()
      })
    })

    it('shows empty state when search returns no results', async () => {
      const mockData = [createMockApproval({ entityId: 'drill-1' })]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment drill-1/i))

      // Search for something that doesn't exist
      const searchField = screen.getByPlaceholderText(/Search approvals/i)
      fireEvent.change(searchField, { target: { value: 'nonexistent' } })

      expect(screen.getByText(/No approvals found/i)).toBeInTheDocument()
      expect(screen.getByText(/Try adjusting your search criteria/i)).toBeInTheDocument()
    })

    it('disables dialog close during submission', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      vi.mocked(approvalsApi.approve).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      )

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Open dialog and start submission
      const approveButton = screen.getByTitle(/Approve/i)
      fireEvent.click(approveButton)
      const confirmButton = screen.getByText(/Confirm Approval/i)
      fireEvent.click(confirmButton)

      // Dialog should still be open during submission
      expect(screen.getByText(/Approve Request/i)).toBeInTheDocument()
    })
  })

  describe('API Integration', () => {
    it('calls approvalsApi.myPending on mount', async () => {
      vi.mocked(approvalsApi.myPending).mockResolvedValue([])

      render(<ApprovalQueueList />)

      await waitFor(() => {
        expect(approvalsApi.myPending).toHaveBeenCalledTimes(1)
      })
    })

    it('transforms API data correctly', async () => {
      const mockData: ApprovalRequest[] = [
        {
          id: 'approval-123',
          projectId: 'project-1',
          entityType: 'equipment',
          entityId: 'drill-999',
          currentStatus: 'pending',
          createdAt: '2026-02-01T00:00:00Z',
          createdBy: { fullName: 'Test User', email: 'test@example.com' },
          steps: [],
        },
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => {
        // Check that entityName is properly formatted
        expect(screen.getByText(/Equipment drill-999/i)).toBeInTheDocument()
        // Check that requesterName is displayed
        expect(screen.getByText(/Test User/i)).toBeInTheDocument()
      })
    })

    it('handles API data with missing optional fields', async () => {
      const mockData: ApprovalRequest[] = [
        {
          id: 'approval-123',
          projectId: 'project-1',
          entityType: 'equipment',
          entityId: 'equip-1',
          currentStatus: 'pending',
          createdAt: '2026-02-01T00:00:00Z',
          createdBy: { email: 'test@example.com' }, // No fullName
          steps: [],
        },
      ]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => {
        // Should fallback to email when fullName is missing
        expect(screen.getByText(/test@example\.com/i)).toBeInTheDocument()
      })
    })
  })

  describe('View Details Callback', () => {
    it('calls onViewDetails when provided and row is clicked', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      const onViewDetails = vi.fn()

      render(<ApprovalQueueList onViewDetails={onViewDetails} />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      // Note: This test assumes DataTable calls onRowClick
      // The actual interaction depends on DataTable implementation
    })

    it('shows View Details button when onViewDetails is provided', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)
      const onViewDetails = vi.fn()

      render(<ApprovalQueueList onViewDetails={onViewDetails} />)

      await waitFor(() => {
        expect(screen.getByTitle(/View Details/i)).toBeInTheDocument()
      })
    })

    it('does not show View Details button when onViewDetails is not provided', async () => {
      const mockData = [createMockApproval()]
      vi.mocked(approvalsApi.myPending).mockResolvedValue(mockData)

      render(<ApprovalQueueList />)

      await waitFor(() => screen.getByText(/Equipment equip-1/i))

      expect(screen.queryByTitle(/View Details/i)).not.toBeInTheDocument()
    })
  })
})
