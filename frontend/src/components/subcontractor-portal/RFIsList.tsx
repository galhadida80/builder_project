import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '@/utils/dateLocale'
import { Card } from '@/components/ui/Card'
import { Tabs } from '@/components/ui/Tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchField } from '@/components/ui/TextField'
import { subcontractorsApi } from '@/api/subcontractors'
import type { RFIListItem } from '@/api/rfi'
import { useToast } from '@/components/common/ToastProvider'
import {
  HelpOutlineIcon, WarningIcon, AccessTimeIcon, CheckCircleIcon,
} from '@/icons'
import {
  Box, Typography, Skeleton, Chip,
} from '@/mui'

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#F1F5F9', text: '#64748B' },
  medium: { bg: '#DBEAFE', text: '#2563EB' },
  high: { bg: '#FFEDD5', text: '#EA580C' },
  urgent: { bg: '#FEE2E2', text: '#DC2626' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#F1F5F9', text: '#64748B' },
  open: { bg: '#DBEAFE', text: '#2563EB' },
  waiting_response: { bg: '#FEF3C7', text: '#D97706' },
  answered: { bg: '#D1FAE5', text: '#059669' },
  closed: { bg: '#F1F5F9', text: '#64748B' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
}

function isOverdue(rfi: RFIListItem) {
  return rfi.due_date && rfi.status !== 'answered' && rfi.status !== 'closed' && rfi.status !== 'cancelled' && new Date(rfi.due_date) < new Date()
}

interface RFIsListProps {
  onRFIClick?: (rfi: RFIListItem) => void
}

export function RFIsList({ onRFIClick }: RFIsListProps) {
  const { t } = useTranslation()
  const { showError } = useToast()

  const [loading, setLoading] = useState(true)
  const [rfis, setRfis] = useState<RFIListItem[]>([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadRFIs()
  }, [])

  const loadRFIs = async () => {
    setLoading(true)
    try {
      const response = await subcontractorsApi.getMyRFIs()
      setRfis(response.items)
    } catch {
      showError(t('rfi.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const overdueCount = rfis.filter(rfi => isOverdue(rfi)).length

  const filteredRFIs = rfis.filter(rfi => {
    if (activeTab === 'overdue' && !isOverdue(rfi)) return false
    else if (activeTab !== 'all' && activeTab !== 'overdue' && rfi.status !== activeTab) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return rfi.subject.toLowerCase().includes(q) || rfi.rfi_number.toLowerCase().includes(q) || rfi.category.toLowerCase().includes(q)
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
          { label: t('common.all'), value: 'all', badge: rfis.length },
          { label: t('rfi.status.open'), value: 'open', badge: rfis.filter(r => r.status === 'open').length },
          { label: t('rfi.status.waitingResponse'), value: 'waiting_response', badge: rfis.filter(r => r.status === 'waiting_response').length },
          { label: t('rfi.status.answered'), value: 'answered', badge: rfis.filter(r => r.status === 'answered').length },
          { label: t('rfi.overdue'), value: 'overdue', badge: overdueCount },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        size="small"
      />

      <SearchField
        placeholder={t('rfi.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {filteredRFIs.length === 0 ? (
          <EmptyState
            title={t('rfi.noRFIs')}
            description={t('rfi.noRFIsDescription')}
            icon={<HelpOutlineIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
          />
        ) : (
          filteredRFIs.map(rfi => (
            <RFICard key={rfi.id} rfi={rfi} t={t} onClick={onRFIClick} />
          ))
        )}
      </Box>
    </Box>
  )
}

function RFICard({ rfi, t, onClick }: { rfi: RFIListItem; t: (k: string, o?: Record<string, unknown>) => string; onClick?: (rfi: RFIListItem) => void }) {
  const priorityColor = PRIORITY_COLORS[rfi.priority] || PRIORITY_COLORS.low
  const statusColor = STATUS_COLORS[rfi.status] || STATUS_COLORS.draft
  const overdue = isOverdue(rfi)
  const isAnswered = rfi.status === 'answered'
  const isClosed = rfi.status === 'closed'
  const borderColor = overdue ? '#DC2626' : rfi.priority === 'urgent' ? '#DC2626' : rfi.priority === 'high' ? '#e07842' : rfi.priority === 'medium' ? '#2563EB' : '#64748B'

  return (
    <Card
      hoverable
      onClick={() => onClick?.(rfi)}
      sx={{
        borderInlineStart: '4px solid',
        borderInlineStartColor: borderColor,
        opacity: isClosed ? 0.6 : 1,
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
              borderColor: isAnswered ? 'success.main' : 'divider',
              bgcolor: isAnswered ? 'success.main' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isAnswered && <CheckCircleIcon sx={{ fontSize: 16, color: 'white' }} />}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                lineHeight: 1.3,
                mb: 0.75,
                ...(isClosed && { textDecoration: 'line-through', color: 'text.disabled' }),
              }}
            >
              {rfi.subject}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1, fontSize: '0.65rem' }}>
              <Chip
                label={rfi.rfi_number}
                size="small"
                sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: priorityColor.text }} />
                <Typography variant="caption" sx={{ color: priorityColor.text, fontWeight: 700, fontSize: '0.65rem' }}>
                  {t(`rfi.priority.${rfi.priority}`, { defaultValue: rfi.priority })}
                </Typography>
              </Box>
              <Chip
                label={t(`rfi.category.${rfi.category}`, { defaultValue: rfi.category })}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  bgcolor: 'action.hover',
                  color: 'text.secondary',
                }}
              />
              {rfi.due_date && (
                <Typography
                  variant="caption"
                  sx={{
                    color: overdue ? 'error.main' : 'text.secondary',
                    fontWeight: 500,
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                  }}
                >
                  {overdue && <WarningIcon sx={{ fontSize: 12 }} />}
                  <AccessTimeIcon sx={{ fontSize: 12 }} />
                  {new Date(rfi.due_date).toLocaleDateString(getDateLocale())}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {rfi.to_name || rfi.to_email}
                </Typography>
                {rfi.response_count > 0 && (
                  <Chip
                    label={`${rfi.response_count} ${t('rfi.responses', { count: rfi.response_count })}`}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.6rem',
                      fontWeight: 600,
                      bgcolor: 'info.light',
                      color: 'info.dark',
                    }}
                  />
                )}
              </Box>
              <Chip
                label={t(`rfi.status.${rfi.status}`, { defaultValue: rfi.status })}
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
