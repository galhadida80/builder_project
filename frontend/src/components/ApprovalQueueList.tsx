import { useState, useEffect } from 'react'
import { Box, Chip, IconButton, Tooltip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { DataTable, Column } from './ui/DataTable'
import { StatusBadge } from './ui/StatusBadge'
import { Tabs } from './ui/Tabs'
import { SearchField, TextField } from './ui/TextField'
import { FormModal } from './ui/Modal'
import { EmptyState } from './ui/EmptyState'
import { approvalsApi } from '../api/approvals'
import { useToast } from './common/ToastProvider'
import type { ApprovalRequest } from '../types'

interface ApprovalQueueListProps {
  onViewDetails?: (approval: ApprovalRequest) => void
}

interface ApprovalRow extends ApprovalRequest {
  entityName: string
  requesterName: string
  projectName?: string
}

export function ApprovalQueueList({ onViewDetails }: ApprovalQueueListProps) {
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [approvals, setApprovals] = useState<ApprovalRow[]>([])
  const [tabValue, setTabValue] = useState('pending')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await approvalsApi.myPending()

      // Transform data to include entity names
      const transformedData: ApprovalRow[] = data.map((approval) => ({
        ...approval,
        entityName: `${approval.entityType.charAt(0).toUpperCase() + approval.entityType.slice(1)} ${approval.entityId}`,
        requesterName: approval.createdBy?.fullName || approval.createdBy?.email || 'Unknown',
        projectName: approval.projectId,
      }))

      setApprovals(transformedData)
    } catch {
      setError(true)
      showError('Failed to load approvals. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pendingApprovals = approvals.filter(
    (a) => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected'
  )
  const approvedApprovals = approvals.filter((a) => a.currentStatus === 'approved')
  const rejectedApprovals = approvals.filter((a) => a.currentStatus === 'rejected')

  const getDisplayedApprovals = () => {
    let filtered = approvals
    if (tabValue === 'pending') filtered = pendingApprovals
    else if (tabValue === 'approved') filtered = approvedApprovals
    else if (tabValue === 'rejected') filtered = rejectedApprovals

    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.requesterName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return filtered
  }

  const displayedApprovals = getDisplayedApprovals()

  const handleAction = (approval: ApprovalRow, action: 'approve' | 'reject') => {
    setSelectedApproval(approval)
    setActionType(action)
    setDialogOpen(true)
  }

  const handleSubmitAction = async () => {
    if (!selectedApproval) return
    setSubmitting(true)
    try {
      if (actionType === 'approve') {
        await approvalsApi.approve(selectedApproval.id, comment || undefined)
        showSuccess('Request approved successfully!')
      } else {
        await approvalsApi.reject(selectedApproval.id, comment)
        showSuccess('Request rejected.')
      }
      setDialogOpen(false)
      setSelectedApproval(null)
      setActionType(null)
      setComment('')
      loadData()
    } catch {
      showError(`Failed to ${actionType} request. Please try again.`)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        description="Failed to load approvals. Please try again."
        action={{ label: 'Retry', onClick: loadData }}
      />
    )
  }

  const columns: Column<ApprovalRow>[] = [
    {
      id: 'id',
      label: 'ID',
      minWidth: 80,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
          {row.id.slice(0, 8)}
        </Box>
      ),
    },
    {
      id: 'entityName',
      label: 'Title',
      minWidth: 200,
      sortable: true,
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{row.entityName}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
            {row.entityType.charAt(0).toUpperCase() + row.entityType.slice(1)}
          </Box>
        </Box>
      ),
    },
    {
      id: 'projectName',
      label: 'Project',
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.projectName || 'N/A'}
        </Box>
      ),
    },
    {
      id: 'requesterName',
      label: 'Requester',
      minWidth: 150,
      sortable: true,
    },
    {
      id: 'currentStatus',
      label: 'Status',
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge status={row.currentStatus} />,
    },
    {
      id: 'createdAt',
      label: 'Created Date',
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {new Date(row.createdAt).toLocaleDateString()}
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 180,
      align: 'center',
      render: (row) => (
        <Box
          sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          {tabValue === 'pending' && (
            <>
              <Tooltip title="Approve">
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleAction(row, 'approve')}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reject">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleAction(row, 'reject')}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          {onViewDetails && (
            <Tooltip title="View Details">
              <IconButton
                size="small"
                onClick={() => onViewDetails(row)}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
          <SearchField
            placeholder="Search approvals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ maxWidth: 400 }}
          />
        </Box>
        <Chip label={`${displayedApprovals.length} items`} size="small" />
      </Box>

      <Tabs
        items={[
          { label: 'Pending', value: 'pending', badge: pendingApprovals.length },
          { label: 'Approved', value: 'approved', badge: approvedApprovals.length },
          { label: 'Rejected', value: 'rejected', badge: rejectedApprovals.length },
          { label: 'All', value: 'all', badge: approvals.length },
        ]}
        value={tabValue}
        onChange={setTabValue}
        size="small"
      />

      <Box sx={{ mt: 3 }}>
        {!loading && displayedApprovals.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
            title={
              tabValue === 'pending'
                ? 'No pending approvals'
                : searchQuery
                ? 'No approvals found'
                : tabValue === 'approved'
                ? 'No approved requests'
                : tabValue === 'rejected'
                ? 'No rejected requests'
                : 'No approvals found'
            }
            description={
              tabValue === 'pending'
                ? 'All requests have been processed.'
                : searchQuery
                ? 'Try adjusting your search criteria.'
                : 'No approval requests in this category yet.'
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={displayedApprovals}
            loading={loading}
            getRowId={(row) => row.id}
            onRowClick={onViewDetails}
            pagination
            pageSize={25}
            emptyMessage="No data available"
          />
        )}
      </Box>

      <FormModal
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        onSubmit={handleSubmitAction}
        title={actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
        submitLabel={actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        loading={submitting}
        submitDisabled={actionType === 'reject' && !comment}
      >
        <Box sx={{ pt: 1 }}>
          {selectedApproval && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>
                You are about to {actionType} the request for:
              </Box>
              <Box sx={{ fontWeight: 600 }}>{selectedApproval.entityName}</Box>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label={actionType === 'approve' ? 'Comments (optional)' : 'Rejection Reason'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={actionType === 'reject'}
            placeholder={
              actionType === 'approve'
                ? 'Add any comments for this approval...'
                : 'Please provide a reason for rejection...'
            }
          />
        </Box>
      </FormModal>
    </Box>
  )
}
