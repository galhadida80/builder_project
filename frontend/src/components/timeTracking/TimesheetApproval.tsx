import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { DataTable, Column } from '../ui/DataTable'
import { StatusBadge } from '../ui/StatusBadge'
import { Tabs } from '../ui/Tabs'
import { SearchField, TextField } from '../ui/TextField'
import { FormModal } from '../ui/Modal'
import { EmptyState } from '../ui/EmptyState'
import { timeTrackingApi } from '../../api/timeTracking'
import { useToast } from '../common/ToastProvider'
import type { Timesheet } from '../../types/timeTracking'
import { CheckCircleIcon, CancelIcon } from '@/icons'
import { Box, Chip, IconButton, Tooltip } from '@/mui'

export default function TimesheetApproval() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [tabValue, setTabValue] = useState('submitted')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      setError(false)
      const data = await timeTrackingApi.listTimesheets(projectId)
      setTimesheets(data)
    } catch {
      setError(true)
      showError(t('timeTracking.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const submittedTimesheets = timesheets.filter((ts) => ts.status === 'submitted')
  const approvedTimesheets = timesheets.filter((ts) => ts.status === 'approved')
  const rejectedTimesheets = timesheets.filter((ts) => ts.status === 'rejected')
  const draftTimesheets = timesheets.filter((ts) => ts.status === 'draft')

  const getDisplayedTimesheets = () => {
    let filtered = timesheets
    if (tabValue === 'submitted') filtered = submittedTimesheets
    else if (tabValue === 'approved') filtered = approvedTimesheets
    else if (tabValue === 'rejected') filtered = rejectedTimesheets
    else if (tabValue === 'draft') filtered = draftTimesheets

    if (searchQuery) {
      filtered = filtered.filter((ts) => {
        const userName = ts.user?.fullName || ts.user?.email || ''
        return userName.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }
    return filtered
  }

  const displayedTimesheets = getDisplayedTimesheets()

  const handleAction = (timesheet: Timesheet, action: 'approve' | 'reject') => {
    setSelectedTimesheet(timesheet)
    setActionType(action)
    setDialogOpen(true)
  }

  const handleSubmitAction = async () => {
    if (!selectedTimesheet || !actionType || !projectId) return
    setSubmitting(true)

    const previousTimesheets = [...timesheets]
    const newStatus = actionType === 'approve' ? 'approved' : 'rejected'

    setTimesheets((prev) =>
      prev.map((ts) => (ts.id === selectedTimesheet.id ? { ...ts, status: newStatus } : ts))
    )

    setDialogOpen(false)
    setSelectedTimesheet(null)
    const savedActionType = actionType
    setActionType(null)
    setRejectionReason('')

    try {
      if (savedActionType === 'approve') {
        await timeTrackingApi.approveTimesheet(projectId, selectedTimesheet.id)
        showSuccess(t('timeTracking.approvedSuccess', { defaultValue: 'Timesheet approved successfully!' }))
      } else {
        await timeTrackingApi.rejectTimesheet(projectId, selectedTimesheet.id, rejectionReason)
        showSuccess(t('timeTracking.rejectedSuccess', { defaultValue: 'Timesheet rejected.' }))
      }
    } catch (err: unknown) {
      setTimesheets(previousTimesheets)
      const axiosErr = err as { response?: { status?: number } }
      if (axiosErr?.response?.status === 403) {
        showError(t('approvalQueue.notAuthorized', { defaultValue: 'Not authorized' }))
      } else {
        showError(
          t('timeTracking.failedToAction', {
            action: savedActionType,
            defaultValue: `Failed to ${savedActionType} timesheet`,
          })
        )
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <EmptyState
        variant="error"
        description={t('timeTracking.loadFailed')}
        action={{ label: t('approvalQueue.retry'), onClick: loadData }}
      />
    )
  }

  const columns: Column<Timesheet>[] = [
    {
      id: 'id',
      label: t('approvalQueue.columnId'),
      minWidth: 80,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{row.id.slice(0, 8)}</Box>
      ),
    },
    {
      id: 'user',
      label: t('timeTracking.worker'),
      minWidth: 150,
      sortable: true,
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{row.user?.fullName || row.user?.email || t('common.unknown')}</Box>
        </Box>
      ),
    },
    {
      id: 'startDate',
      label: t('timeTracking.dateFrom'),
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>{new Date(row.startDate).toLocaleDateString(getDateLocale())}</Box>
      ),
    },
    {
      id: 'endDate',
      label: t('timeTracking.dateTo'),
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>{new Date(row.endDate).toLocaleDateString(getDateLocale())}</Box>
      ),
    },
    {
      id: 'totalHours',
      label: t('timeTracking.totalHours'),
      minWidth: 100,
      sortable: true,
      align: 'right',
      render: (row) => <Box sx={{ fontWeight: 600 }}>{row.totalHours?.toFixed(2) || '0.00'}</Box>,
    },
    {
      id: 'status',
      label: t('timeTracking.status'),
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'createdAt',
      label: t('approvalQueue.columnCreatedDate'),
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>{new Date(row.createdAt).toLocaleDateString(getDateLocale())}</Box>
      ),
    },
    {
      id: 'actions',
      label: t('approvalQueue.columnActions'),
      minWidth: 150,
      align: 'center',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
          {tabValue === 'submitted' && (
            <>
              <Tooltip title={t('approvals.approve', { defaultValue: 'Approve' })}>
                <IconButton
                  size="small"
                  color="success"
                  aria-label={t('approvals.approve')}
                  onClick={() => handleAction(row, 'approve')}
                >
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('approvals.reject', { defaultValue: 'Reject' })}>
                <IconButton
                  size="small"
                  color="error"
                  aria-label={t('approvals.reject')}
                  onClick={() => handleAction(row, 'reject')}
                >
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
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
            placeholder={t('timeTracking.searchPlaceholder', { defaultValue: 'Search timesheets...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ maxWidth: 400 }}
          />
        </Box>
        <Chip
          label={t('approvalQueue.itemsCount', { count: displayedTimesheets.length })}
          size="small"
        />
      </Box>

      <Tabs
        items={[
          {
            label: t('timeTracking.submitted', { defaultValue: 'Submitted' }),
            value: 'submitted',
            badge: submittedTimesheets.length,
          },
          {
            label: t('approvals.approved', { defaultValue: 'Approved' }),
            value: 'approved',
            badge: approvedTimesheets.length,
          },
          {
            label: t('approvals.rejected', { defaultValue: 'Rejected' }),
            value: 'rejected',
            badge: rejectedTimesheets.length,
          },
          {
            label: t('common.all', { defaultValue: 'All' }),
            value: 'all',
            badge: timesheets.length,
          },
        ]}
        value={tabValue}
        onChange={setTabValue}
        size="small"
      />

      <Box sx={{ mt: 3 }}>
        {!loading && displayedTimesheets.length === 0 ? (
          <EmptyState
            icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
            title={
              tabValue === 'submitted'
                ? t('timeTracking.noSubmittedTimesheets', { defaultValue: 'No submitted timesheets' })
                : searchQuery
                ? t('approvalQueue.noApprovalsFound')
                : tabValue === 'approved'
                ? t('approvalQueue.noApprovedRequests')
                : tabValue === 'rejected'
                ? t('approvalQueue.noRejectedRequests')
                : t('approvalQueue.noApprovalsFound')
            }
            description={
              tabValue === 'submitted'
                ? t('timeTracking.allTimesheetsProcessed', { defaultValue: 'All timesheets have been processed.' })
                : searchQuery
                ? t('approvalQueue.adjustSearch')
                : t('approvalQueue.noRequestsInCategory')
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={displayedTimesheets}
            loading={loading}
            getRowId={(row) => row.id}
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
        title={
          actionType === 'approve'
            ? t('timeTracking.approveTimesheet', { defaultValue: 'Approve Timesheet' })
            : t('timeTracking.rejectTimesheet', { defaultValue: 'Reject Timesheet' })
        }
        submitLabel={
          actionType === 'approve'
            ? t('approvalQueue.confirmApproval')
            : t('approvalQueue.confirmRejection')
        }
        loading={submitting}
        submitDisabled={actionType === 'reject' && !rejectionReason}
      >
        <Box sx={{ pt: 1 }}>
          {selectedTimesheet && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mb: 0.5 }}>
                {t('approvalQueue.aboutToAction', { action: actionType })}
              </Box>
              <Box sx={{ fontWeight: 600 }}>
                {selectedTimesheet.user?.fullName || selectedTimesheet.user?.email || t('common.unknown')}
              </Box>
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary', mt: 1 }}>
                {new Date(selectedTimesheet.startDate).toLocaleDateString(getDateLocale())} -{' '}
                {new Date(selectedTimesheet.endDate).toLocaleDateString(getDateLocale())}
              </Box>
            </Box>
          )}
          {actionType === 'reject' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label={t('approvalQueue.rejectionReason')}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
              placeholder={t('timeTracking.rejectionPlaceholder', {
                defaultValue: 'Please provide a reason for rejecting this timesheet...',
              })}
            />
          )}
        </Box>
      </FormModal>
    </Box>
  )
}
