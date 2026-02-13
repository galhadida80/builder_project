import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
import { BuildIcon, InventoryIcon, CheckCircleIcon, CancelIcon, PendingIcon, ThumbUpIcon, ThumbDownIcon } from '@/icons'
import { Box, Typography, Chip, Skeleton } from '@/mui'

export default function ApprovalsPage() {
  const { t } = useTranslation()
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
      showError(t('approvals.failedToLoad'))
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
        showSuccess(t('approvals.approvedSuccess'))
      } else {
        await approvalsApi.reject(selectedApproval.id, comment)
        showSuccess(t('approvals.rejectedSuccess'))
      }
      setDialogOpen(false)
      setSelectedApproval(null)
      setActionType(null)
      setComment('')
      loadData()
    } catch {
      showError(t('approvals.failedToProcess'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
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
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <PageHeader
        title={t('approvals.title')}
        subtitle={t('approvals.subtitle')}
        breadcrumbs={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('nav.approvals') }]}
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
          title={t('approvals.totalRequests')}
          value={approvals.length}
          icon={<CheckCircleIcon />}
          color="primary"
        />
        <KPICard
          title={t('approvals.pending')}
          value={pendingApprovals.length}
          icon={<PendingIcon />}
          color="warning"
        />
        <KPICard
          title={t('approvals.approved')}
          value={approvedApprovals.length}
          icon={<ThumbUpIcon />}
          color="success"
        />
        <KPICard
          title={t('approvals.rejected')}
          value={rejectedApprovals.length}
          icon={<ThumbDownIcon />}
          color="error"
        />
      </Box>

      <Card>
        <Box sx={{ p: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <SearchField
              placeholder={t('approvals.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Chip label={`${displayedApprovals.length} ${t('common.items')}`} size="small" />
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

          <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {displayedApprovals.length === 0 ? (
              <EmptyState
                title={tabValue === 'pending' ? t('approvals.noPending') : t('approvals.noApprovals')}
                description={tabValue === 'pending' ? t('approvals.allProcessed') : t('approvals.tryAdjusting')}
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
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: { xs: 2, sm: 0 } }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
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
                                {entity?.name || t('approvals.unknown')}
                              </Typography>
                              <StatusBadge status={approval.currentStatus} />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {t('approvals.approvalRequest', { type: approval.entityType })}
                            </Typography>

                            <Box sx={{ maxWidth: 400 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  {t('approvals.progress')}
                                </Typography>
                                <Typography variant="caption" fontWeight={600}>
                                  {t('approvals.stepOf', { current: completedSteps, total: totalSteps })}
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
                              {t('approvals.approve')}
                            </Button>
                            <Button
                              variant="danger"
                              size="small"
                              icon={<CancelIcon />}
                              onClick={() => handleAction(approval, 'reject')}
                            >
                              {t('approvals.reject')}
                            </Button>
                          </Box>
                        )}
                      </Box>

                      {approval.steps && approval.steps.length > 0 && (
                        <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 1.5, display: 'block' }}>
                            {t('approvals.approvalWorkflow')}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {approval.steps.map((step, index) => {
                              const status = getStepStatus(step)
                              return (
                                <Box
                                  key={step.id}
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    flex: 1,
                                    minWidth: { xs: 60, sm: 80 },
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
                                      {step.approverRole ? t(`roles.${step.approverRole}`, { defaultValue: step.approverRole.replace('_', ' ') }) : ''}
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
        title={actionType === 'approve' ? t('approvals.approveRequest') : t('approvals.rejectRequest')}
        submitLabel={actionType === 'approve' ? t('approvals.confirmApproval') : t('approvals.confirmRejection')}
        loading={submitting}
        submitDisabled={actionType === 'reject' && !comment}
      >
        <Box sx={{ pt: 1 }}>
          {selectedApproval && (
            <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {t('approvals.aboutTo', { action: actionType })}
              </Typography>
              <Typography variant="subtitle1" fontWeight={600}>
                {getEntityDetails(selectedApproval)?.name || t('approvals.unknown')}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={4}
            label={actionType === 'approve' ? t('approvals.commentsOptional') : t('approvals.rejectionReason')}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required={actionType === 'reject'}
            placeholder={actionType === 'approve'
              ? t('approvals.commentsPlaceholder')
              : t('approvals.rejectionPlaceholder')}
          />
        </Box>
      </FormModal>
    </Box>
  )
}
