import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { KPICard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { Tabs } from '../components/ui/Tabs'
import { EmptyState } from '../components/ui/EmptyState'
import { FormModal } from '../components/ui/Modal'
import { TextField, SearchField } from '../components/ui/TextField'
import { ApprovalCard } from '../components/approvals/ApprovalCard'
import { approvalsApi } from '../api/approvals'
import { equipmentApi } from '../api/equipment'
import { materialsApi } from '../api/materials'
import { useToast } from '../components/common/ToastProvider'
import type { ApprovalRequest, Equipment, Material } from '../types'
import { CheckCircleIcon } from '@/icons'
import { Box, Typography, Skeleton, useTheme, useMediaQuery } from '@/mui'

export default function ApprovalsPage() {
  const { t } = useTranslation()
  const { showError, showSuccess } = useToast()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: { xs: 1.5, sm: 2 }, mb: 3 }}>
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
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
        <KPICard title={t('approvals.totalRequests')} value={approvals.length} color="primary" />
        <KPICard title={t('approvals.pending')} value={pendingApprovals.length} color="warning" />
        <KPICard title={t('approvals.approved')} value={approvedApprovals.length} color="success" />
        <KPICard title={t('approvals.rejected')} value={rejectedApprovals.length} color="error" />
      </Box>

      <Box sx={{ mb: 2 }}>
        <SearchField
          placeholder={t('approvals.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          fullWidth={isMobile}
        />
      </Box>

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
          displayedApprovals.map((approval) => (
            <Box key={approval.id} role="listitem">
              <ApprovalCard
                approval={approval}
                entity={getEntityDetails(approval)}
                onApprove={(a) => handleAction(a, 'approve')}
                onReject={(a) => handleAction(a, 'reject')}
              />
            </Box>
          ))
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
