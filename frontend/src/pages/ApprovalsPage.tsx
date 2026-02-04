import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import BuildIcon from '@mui/icons-material/Build'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingIcon from '@mui/icons-material/Pending'
import FilterListIcon from '@mui/icons-material/FilterList'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import { Card, KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { FormModal } from '../components/ui/Modal'
import { TextField, SearchField } from '../components/ui/TextField'
import { ProgressBar } from '../components/ui/ProgressBar'
import { approvalsApi } from '../api/approvals'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { useToast } from '../components/common/ToastProvider'
import type { ApprovalRequest, ApprovalStep, Equipment, Material } from '../types'

export default function ApprovalsPage() {
  const { showError, showSuccess } = useToast()
  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [tabValue, setTabValue] = useState('pending')
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [approvalsData, equipmentData, materialsData] = await Promise.all([
        approvalsApi.list().catch(() => []),
        equipmentApi.list().catch(() => []),
        materialsApi.list().catch(() => [])
      ])
      setApprovals(approvalsData)
      setEquipment(equipmentData)
      setMaterials(materialsData)
    } catch {
      showError('Failed to load approval data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pendingApprovals = approvals.filter(a => a.currentStatus !== 'approved' && a.currentStatus !== 'rejected')
  const approvedApprovals = approvals.filter(a => a.currentStatus === 'approved')
  const rejectedApprovals = approvals.filter(a => a.currentStatus === 'rejected')

  const getDisplayedApprovals = () => {
    let filtered = approvals
    if (tabValue === 'pending') filtered = pendingApprovals
    else if (tabValue === 'approved') filtered = approvedApprovals
    else if (tabValue === 'rejected') filtered = rejectedApprovals

    if (searchQuery) {
      filtered = filtered.filter(a => {
        const entity = getEntityDetails(a)
        return entity?.name.toLowerCase().includes(searchQuery.toLowerCase())
      })
    }
    return filtered
  }

  const displayedApprovals = getDisplayedApprovals()

  const getEntityDetails = (approval: ApprovalRequest) => {
    if (approval.entityType === 'equipment') {
      return equipment.find(e => e.id === approval.entityId)
    }
    return materials.find(m => m.id === approval.entityId)
  }

  const getStepStatus = (step: ApprovalStep) => {
    switch (step.status) {
      case 'approved': return { icon: <CheckCircleIcon sx={{ fontSize: 18 }} />, color: 'success.main', bg: 'success.light' }
      case 'rejected': return { icon: <CancelIcon sx={{ fontSize: 18 }} />, color: 'error.main', bg: 'error.light' }
      case 'under_review': return { icon: <PendingIcon sx={{ fontSize: 18 }} />, color: 'warning.main', bg: 'warning.light' }
      default: return { icon: <PendingIcon sx={{ fontSize: 18 }} />, color: 'text.disabled', bg: 'action.hover' }
    }
  }

  const handleAction = (approval: ApprovalRequest, action: 'approve' | 'reject') => {
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 4 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 4 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Approvals"
        subtitle="Review and manage approval requests"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Approvals' }]}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 4,
        }}
      >
        <KPICard
          title="Total Requests"
          value={approvals.length}
          icon={<CheckCircleIcon />}
          color="primary"
        />
        <KPICard
          title="Pending"
          value={pendingApprovals.length}
          icon={<PendingIcon />}
          color="warning"
        />
        <KPICard
          title="Approved"
          value={approvedApprovals.length}
          icon={<ThumbUpIcon />}
          color="success"
        />
        <KPICard
          title="Rejected"
          value={rejectedApprovals.length}
          icon={<ThumbDownIcon />}
          color="error"
        />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <SearchField
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="secondary" size="small" icon={<FilterListIcon />}>
                Filters
              </Button>
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

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedApprovals.length === 0 ? (
              <EmptyState
                title={tabValue === 'pending' ? 'No pending approvals' : 'No approvals found'}
                description={tabValue === 'pending' ? 'All requests have been processed.' : 'Try adjusting your search criteria.'}
                icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
              />
            ) : (
              displayedApprovals.map((approval) => {
                const entity = getEntityDetails(approval)
                const completedSteps = approval.steps?.filter(s => s.status === 'approved').length || 0
                const totalSteps = approval.steps?.length || 1
                const progress = Math.round((completedSteps / totalSteps) * 100)

                return (
                  <Card key={approval.id} hoverable>
                    <Box sx={{ p: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1 }}>
                          <Box
                            sx={{
                              width: 48,
                              height: 48,
                              borderRadius: 2,
                              bgcolor: approval.entityType === 'equipment' ? 'primary.light' : 'warning.light',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {approval.entityType === 'equipment' ? (
                              <BuildIcon sx={{ color: 'primary.main' }} />
                            ) : (
                              <InventoryIcon sx={{ color: 'warning.main' }} />
                            )}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {entity?.name || 'Unknown'}
                              </Typography>
                              <StatusBadge status={approval.currentStatus} />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {approval.entityType.charAt(0).toUpperCase() + approval.entityType.slice(1)} approval request
                            </Typography>

                            <Box sx={{ maxWidth: 400 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Progress
                                </Typography>
                                <Typography variant="caption" fontWeight={600}>
                                  Step {completedSteps} of {totalSteps}
                                </Typography>
                              </Box>
                              <ProgressBar
                                value={progress}
                                showValue={false}
                                size="small"
                                color={approval.currentStatus === 'rejected' ? 'error' : 'primary'}
                              />
                            </Box>
                          </Box>
                        </Box>

                        {tabValue === 'pending' && (
                          <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                            <Button
                              variant="success"
                              size="small"
                              icon={<CheckCircleIcon />}
                              onClick={() => handleAction(approval, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="small"
                              icon={<CancelIcon />}
                              onClick={() => handleAction(approval, 'reject')}
                            >
                              Reject
                            </Button>
                          </Box>
                        )}
                      </Box>

                      {approval.steps && approval.steps.length > 0 && (
                        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                            APPROVAL WORKFLOW
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {approval.steps.map((step, index) => {
                              const status = getStepStatus(step)
                              return (
                                <Box
                                  key={step.id}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    flex: 1,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      flex: 1,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        bgcolor: status.bg,
                                        color: status.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 0.5,
                                      }}
                                    >
                                      {status.icon}
                                    </Box>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ textAlign: 'center', fontSize: '0.65rem' }}
                                    >
                                      {step.approverRole?.replace('_', ' ')}
                                    </Typography>
                                    {step.comments && (
                                      <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                          textAlign: 'center',
                                          fontSize: '0.6rem',
                                          fontStyle: 'italic',
                                          maxWidth: 80,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        }}
                                      >
                                        "{step.comments}"
                                      </Typography>
                                    )}
                                  </Box>
                                  {index < approval.steps!.length - 1 && (
                                    <Box
                                      sx={{
                                        flex: 0.5,
                                        height: 2,
                                        bgcolor: step.status === 'approved' ? 'success.main' : 'divider',
                                        borderRadius: 1,
                                        mx: 1,
                                        mt: -2,
                                      }}
                                    />
                                  )}
                                </Box>
                              )
                            })}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </Card>
                )
              })
            )}
          </Box>
        </Box>
      </Card>

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
              <Typography variant="body2" color="text.secondary">
                You are about to {actionType} the request for:
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                {getEntityDetails(selectedApproval)?.name || 'Unknown'}
              </Typography>
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
            placeholder={actionType === 'approve'
              ? 'Add any comments for this approval...'
              : 'Please provide a reason for rejection...'}
          />
        </Box>
      </FormModal>
    </Box>
  )
}
