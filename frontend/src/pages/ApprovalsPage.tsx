import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { FormModal } from '../components/ui/Modal'
import { TextField } from '../components/ui/TextField'
import { approvalsApi } from '../api/approvals'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { useToast } from '../components/common/ToastProvider'
import type { ApprovalRequest, Equipment, Material } from '../types'
import { BuildIcon, InventoryIcon, CheckCircleIcon, CancelIcon, DescriptionIcon, AccessTimeIcon } from '@/icons'
import { Box, Typography, Chip, Skeleton, Avatar, Badge } from '@/mui'

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
  const [commentTouched, setCommentTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [approvalsData, equipmentRes, materialsRes] = await Promise.all([
        approvalsApi.list().catch(() => []),
        equipmentApi.list().catch(() => ({ items: [] as never[] })),
        materialsApi.list().catch(() => ({ items: [] as never[] }))
      ])
      setApprovals(approvalsData)
      setEquipment(equipmentRes.items)
      setMaterials(materialsRes.items)
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
        return entity?.name?.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleAction = (approval: ApprovalRequest, action: 'approve' | 'reject') => {
    setSelectedApproval(approval)
    setActionType(action)
    setComment('')
    setCommentTouched(false)
    setDialogOpen(true)
  }

  const handleSubmitAction = async () => {
    if (!selectedApproval || !actionType) return
    setSubmitting(true)
    const previousApprovals = [...approvals]
    const savedApproval = selectedApproval
    const savedAction = actionType
    const savedComment = comment
    const optimisticStatus = savedAction === 'approve' ? 'approved' : 'rejected'
    setApprovals(prev =>
      prev.map(a =>
        a.id === savedApproval.id
          ? { ...a, currentStatus: optimisticStatus as ApprovalRequest['currentStatus'] }
          : a
      )
    )
    setDialogOpen(false)
    setSelectedApproval(null)
    setActionType(null)
    setComment('')
    try {
      if (savedAction === 'approve') {
        await approvalsApi.approve(savedApproval.id, savedComment || undefined)
      } else {
        await approvalsApi.reject(savedApproval.id, savedComment)
      }
      showSuccess(savedAction === 'approve' ? t('approvals.approvedSuccess') : t('approvals.rejectedSuccess'))
      loadData()
    } catch {
      setApprovals(previousApprovals)
      showError(t('approvals.failedToProcess'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={200} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={300} height={24} sx={{ mb: 3 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
        <Skeleton variant="rounded" width="100%" height={42} sx={{ borderRadius: 2, mb: 2 }} />
        <Skeleton variant="rounded" width="100%" height={36} sx={{ borderRadius: 2, mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('approvals.title')}
        subtitle={t('approvals.subtitle')}
        breadcrumbs={[{ label: t('nav.dashboard'), href: '/dashboard' }, { label: t('nav.approvals') }]}
        actions={
          pendingApprovals.length > 0 ? (
            <Badge
              badgeContent={pendingApprovals.length}
              color="warning"
              sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem', fontWeight: 700, minWidth: 24, height: 24, borderRadius: 12 } }}
            >
              <Chip
                label={t('approvals.pendingApprovals')}
                color="warning"
                variant="outlined"
                sx={{ fontWeight: 600, pr: 2 }}
              />
            </Badge>
          ) : undefined
        }
      />

      {pendingApprovals.length > 0 && (
        <Box sx={{ px: 0.5, pb: 1.5, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography variant="body2" sx={{ color: 'warning.main', fontWeight: 600 }}>
            {t('approvals.pendingSummary', { pending: pendingApprovals.length })}
          </Typography>
        </Box>
      )}

      <Tabs
        items={[
          { label: t('approvals.pending'), value: 'pending', badge: pendingApprovals.length },
          { label: t('approvals.approved'), value: 'approved', badge: approvedApprovals.length },
          { label: t('approvals.rejected'), value: 'rejected', badge: rejectedApprovals.length },
        ]}
        value={tabValue}
        onChange={setTabValue}
        size="small"
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }} role="list" aria-label={t('approvals.title')}>
        {displayedApprovals.length === 0 ? (
          <EmptyState
            title={tabValue === 'pending' ? t('approvals.noPending') : t('approvals.noApprovals')}
            description={tabValue === 'pending' ? t('approvals.allProcessed') : t('approvals.tryAdjusting')}
            icon={<CheckCircleIcon sx={{ color: 'success.main' }} />}
          />
        ) : (
          displayedApprovals.map((approval) => {
            const entity = getEntityDetails(approval)
            const isPending = approval.currentStatus !== 'approved' && approval.currentStatus !== 'rejected'
            const isUrgent = isPending && approval.steps?.some(s => s.approverRole === 'project_admin')
            const categoryColor = approval.entityType === 'equipment'
              ? { bg: '#e3f2fd', text: '#1565c0', label: t('approvals.equipment') }
              : { bg: '#e8f5e9', text: '#2e7d32', label: t('approvals.material') }
            const submitter = approval.createdBy
            const documents = entity && 'documents' in entity ? (entity as Equipment | Material).documents : undefined
            const docCount = documents?.length || 0

            return (
              <Box key={approval.id} role="listitem">
                <Card sx={{
                  ...(isPending && { border: '1px solid', borderColor: 'warning.light' }),
                  ...(isUrgent && {
                    border: '2px solid',
                    borderColor: 'error.main',
                    boxShadow: '0 0 12px rgba(211, 47, 47, 0.25)',
                  }),
                }}>
                  <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                      <Chip
                        icon={approval.entityType === 'equipment' ? <BuildIcon sx={{ fontSize: 14 }} /> : <InventoryIcon sx={{ fontSize: 14 }} />}
                        label={categoryColor.label}
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          bgcolor: categoryColor.bg,
                          color: categoryColor.text,
                          '& .MuiChip-icon': { color: categoryColor.text },
                        }}
                      />
                      {isPending && (
                        <Chip
                          label={t('approvals.pendingApproval')}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            bgcolor: 'warning.light',
                            color: 'warning.dark',
                            '&::before': {
                              content: '""',
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: 'warning.main',
                              display: 'inline-block',
                              mr: 0.5,
                              ml: 0.5,
                            },
                          }}
                        />
                      )}
                    </Box>

                    <Typography variant="body1" fontWeight={700} sx={{ lineHeight: 1.3, mb: 1.5 }}>
                      {entity?.name || t('approvals.unknown')}
                    </Typography>

                    {submitter && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <Avatar
                          sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: 'primary.main' }}
                        >
                          {submitter.fullName?.charAt(0)?.toUpperCase() || submitter.email.charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" color="text.secondary">
                          {t('approvals.submittedBy')}: {submitter.fullName || submitter.email}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(approval.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <StatusBadge status={approval.currentStatus} size="small" />
                      {docCount > 0 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DescriptionIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {docCount} {t('approvals.documents')}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {isPending && (
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                        <Button
                          variant="success"
                          size="small"
                          icon={<CheckCircleIcon />}
                          onClick={() => handleAction(approval, 'approve')}
                          fullWidth
                        >
                          {t('approvals.approve')}
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          icon={<CancelIcon />}
                          onClick={() => handleAction(approval, 'reject')}
                          fullWidth
                        >
                          {t('approvals.reject')}
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Card>
              </Box>
            )
          })
        )}
      </Box>

      <FormModal
        open={dialogOpen}
        onClose={() => !submitting && setDialogOpen(false)}
        onSubmit={handleSubmitAction}
        title={actionType === 'approve' ? t('approvals.approveRequest') : t('approvals.rejectRequest')}
        submitLabel={actionType === 'approve' ? t('approvals.confirmApproval') : t('approvals.confirmRejection')}
        loading={submitting}
        submitDisabled={actionType === 'reject' && !comment.trim()}
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
            onBlur={() => setCommentTouched(true)}
            required={actionType === 'reject'}
            error={actionType === 'reject' && commentTouched && !comment.trim()}
            helperText={actionType === 'reject' && commentTouched && !comment.trim() ? t('approvals.rejectionReasonRequired') : undefined}
            placeholder={actionType === 'approve'
              ? t('approvals.commentsPlaceholder')
              : t('approvals.rejectionPlaceholder')}
          />
        </Box>
      </FormModal>
    </Box>
  )
}
