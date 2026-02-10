import { useState, useEffect } from 'react'
import { Box, Chip, IconButton, Tooltip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
        requesterName: approval.createdBy?.fullName || approval.createdBy?.email || t('common.unknown'),
        projectName: approval.projectId?.substring(0, 8) || 'N/A',
      }))

      setApprovals(transformedData)
    } catch {
      setError(true)
      showError(t('approvalQueue.failedToLoad'))
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
        showSuccess(t('approvalQueue.approvedSuccess'))
      } else {
        await approvalsApi.reject(selectedApproval.id, comment)
        showSuccess(t('approvalQueue.rejectedSuccess'))
      }
      setDialogOpen(false)
      setSelectedApproval(null)
      setActionType(null)
      setComment('')
      loadData()
    } catch {
      showError(t('approvalQueue.failedToAction', { action: actionType }))
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        description={t('approvalQueue.failedToLoad')}
        action={{ label: t('approvalQueue.retry'), onClick: loadData }}
      />
    )
  }

  const columns: Column<ApprovalRow>[] = [
    {
      id: 'id',
      label: t('approvalQueue.columnId'),
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
      label: t('approvalQueue.columnTitle'),
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
      label: t('approvalQueue.columnProject'),
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
      label: t('approvalQueue.columnRequester'),
      minWidth: 150,
      sortable: true,
    },
    {
      id: 'currentStatus',
      label: t('approvalQueue.columnStatus'),
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge status={row.currentStatus} />,
    },
    {
      id: 'createdAt',
      label: t('approvalQueue.columnCreatedDate'),
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
      label: t('approvalQueue.columnActions'),
      minWidth: 180,
      align: 'center',
      render: (row) => (
        <Box
          sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          {tabValue === 'pending' && (
            <>
              <Tooltip title={t('approvals.approve')}>
                <IconButton
                  size="small"
                  color="success"
                  onClick={() => handleAction(row, 'approve')}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('approvals.reject')}>
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
            <Tooltip title={t('approvals.viewDetails')}>
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
            placeholder={t('approvalQueue.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ maxWidth: 400 }}
          />
        </Box>
        <Chip label={t('approvalQueue.itemsCount', { count: displayedApprovals.length })} size="small" />
      </Box>

      <Tabs
        items={[
          { label: t('approvals.pending'), value: 'pending', badge: pendingApprovals.length },
          { label: t('approvals.approved'), value: 'approved', badge: approvedApprovals.length },
          { label: t('approvals.rejected'), value: 'rejected', badge: rejectedApprovals.length },
          { label: t('common.all'), value: 'all', badge: approvals.length },
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
                ? t('approvalQueue.noPendingApprovals')
                : searchQuery
                ? t('approvalQueue.noApprovalsFound')
                : tabValue === 'approved'
                ? t('approvalQueue.noApprovedRequests')
                : tabValue === 'rejected'
                ? t('approvalQueue.noRejectedRequests')
                : t('approvalQueue.noApprovalsFound')
            }
            description={
              tabValue === 'pending'
                ? t('approvalQueue.allProcessed')
                : searchQuery
                ? t('approvalQueue.adjustSearch')
                : t('approvalQueue.noRequestsInCategory')
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
            emptyMessage={t('approvalQueue.noDataAvailable')}
          />
        )}
      </Box>

      <FormModal
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        onSubmit={handleSubmitAction}
        title={actionType === 'approve' ? t('approvalQueue.approveRequest') : t('approvalQueue.rejectRequest')}
        submitLabel={actionType === 'approve' ? t('approvalQueue.confirmApproval') : t('approvalQueue.confirmRejection')}
        loading={submitting}
        submitDisabled={actionType === 'reject' && !comment}
      >
        <Box sx={{ pt: 1 }}>
          {selectedApproval && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>
                {t('approvalQueue.aboutToAction', { action: actionType })}
              </Box>
              <Box sx={{ fontWeight: 600 }}>{selectedApproval.entityName}</Box>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label={actionType === 'approve' ? t('approvalQueue.commentsOptional') : t('approvalQueue.rejectionReason')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={actionType === 'reject'}
            placeholder={
              actionType === 'approve'
                ? t('approvalQueue.approvalCommentPlaceholder')
                : t('approvalQueue.rejectionPlaceholder')
            }
          />
        </Box>
      </FormModal>
    </Box>
  )
}
