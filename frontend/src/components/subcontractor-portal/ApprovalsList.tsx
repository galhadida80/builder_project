import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '@/utils/dateLocale'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/TextField'
import { subcontractorsApi } from '@/api/subcontractors'
import type { ApprovalRequest } from '@/types'
import { useToast } from '@/components/common/ToastProvider'
import {
  CheckCircleIcon, CancelIcon, HourglassEmptyIcon, DescriptionIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip,
} from '@/mui'

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#F1F5F9', text: '#64748B' },
  submitted: { bg: '#DBEAFE', text: '#2563EB' },
  under_review: { bg: '#FEF3C7', text: '#D97706' },
  approved: { bg: '#D1FAE5', text: '#059669' },
  rejected: { bg: '#FEE2E2', text: '#DC2626' },
  revision_requested: { bg: '#FFEDD5', text: '#EA580C' },
}

const ENTITY_COLORS: Record<string, { bg: string; text: string }> = {
  equipment: { bg: '#E0F2FE', text: '#0369A1' },
  material: { bg: '#FCE7F3', text: '#BE185D' },
}

function isPending(approval: ApprovalRequest) {
  return ['submitted', 'under_review', 'revision_requested'].includes(approval.currentStatus)
}

interface ApprovalsListProps {
  onApprovalClick?: (approval: ApprovalRequest) => void
}

export function ApprovalsList({ onApprovalClick }: ApprovalsListProps) {
  const { t } = useTranslation()
  const { showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadApprovals()
  }, [])

  const loadApprovals = async () => {
    setLoading(true)
    try {
      const approvalList = await subcontractorsApi.getMyApprovals()
      setApprovals(approvalList)
    } catch {
      showError(t('approvals.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const pendingCount = approvals.filter(a => isPending(a)).length
  const approvedCount = approvals.filter(a => a.currentStatus === 'approved').length
  const rejectedCount = approvals.filter(a => a.currentStatus === 'rejected').length

  const filteredApprovals = approvals.filter(approval => {
    if (activeTab === 'pending' && !isPending(approval)) return false
    else if (activeTab === 'approved' && approval.currentStatus !== 'approved') return false
    else if (activeTab === 'rejected' && approval.currentStatus !== 'rejected') return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        approval.entityType.toLowerCase().includes(q) ||
        approval.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Tabs
        items={[
          { label: t('common.all'), value: 'all', badge: approvals.length },
          { label: t('approvals.pending'), value: 'pending', badge: pendingCount },
          { label: t('approvals.approved'), value: 'approved', badge: approvedCount },
          { label: t('approvals.rejected'), value: 'rejected', badge: rejectedCount },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        size="small"
      />

      <SearchField
        placeholder={t('approvals.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filteredApprovals.length === 0 ? (
          <EmptyState
            title={t('approvals.noApprovals')}
            description={t('approvals.noApprovalsDescription')}
            icon={<CheckCircleIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
          />
        ) : (
          filteredApprovals.map(approval => (
            <ApprovalCard key={approval.id} approval={approval} t={t} onClick={onApprovalClick} />
          ))
        )}
      </Box>
    </Box>
  )
}

function ApprovalCard({
  approval,
  t,
  onClick
}: {
  approval: ApprovalRequest
  t: (k: string, o?: Record<string, unknown>) => string
  onClick?: (approval: ApprovalRequest) => void
}) {
  const statusColor = STATUS_COLORS[approval.currentStatus] || STATUS_COLORS.draft
  const entityColor = ENTITY_COLORS[approval.entityType] || ENTITY_COLORS.equipment
  const isApproved = approval.currentStatus === 'approved'
  const isRejected = approval.currentStatus === 'rejected'
  const pending = isPending(approval)

  const borderColor = isRejected ? '#DC2626' : isApproved ? '#059669' : pending ? '#D97706' : '#64748B'

  // Calculate days pending
  const daysPending = Math.floor(
    (new Date().getTime() - new Date(approval.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <Card
      hoverable
      onClick={() => onClick?.(approval)}
      sx={{
        borderInlineStart: '4px solid',
        borderInlineStartColor: borderColor,
        opacity: isRejected ? 0.7 : 1,
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              flexShrink: 0,
              mt: 0.25,
              border: '2px solid',
              borderColor: isApproved ? 'success.main' : isRejected ? 'error.main' : 'divider',
              bgcolor: isApproved ? 'success.main' : isRejected ? 'error.main' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isApproved && <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />}
            {isRejected && <CancelIcon sx={{ fontSize: 16, color: 'white' }} />}
            {pending && <HourglassEmptyIcon sx={{ fontSize: 14, color: 'warning.main' }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                lineHeight: 1.3,
                mb: 0.75,
                ...(isRejected && { textDecoration: 'line-through', color: 'text.disabled' }),
              }}
            >
              {t(`approvals.entityType.${approval.entityType}`, { defaultValue: approval.entityType })} {t('approvals.approval')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1, fontSize: '0.65rem' }}>
              <Chip
                label={t(`approvals.entityType.${approval.entityType}`, { defaultValue: approval.entityType })}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: entityColor.bg,
                  color: entityColor.text,
                }}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                {t('approvals.steps', { count: approval.steps.length })}: {approval.steps.filter(s => s.status === 'approved').length}/{approval.steps.length}
              </Typography>
              {pending && daysPending > 0 && (
                <Typography
                  variant="caption"
                  sx={{
                    color: daysPending > 7 ? 'warning.main' : 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                  }}
                >
                  {daysPending > 7 && <HourglassEmptyIcon sx={{ fontSize: 12 }} />}
                  {t('approvals.daysPending', { days: daysPending })}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                {t('approvals.created')} {new Date(approval.createdAt).toLocaleDateString(getDateLocale())}
              </Typography>
              <Chip
                label={t(`approvals.status.${approval.currentStatus}`, { defaultValue: approval.currentStatus })}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  bgcolor: statusColor.bg,
                  color: statusColor.text,
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    </Card>
  )
}
