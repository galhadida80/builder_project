import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, CircularProgress, Typography } from '@/mui'
import FilterChips from '@/components/ui/FilterChips'
import { EmptyState } from '@/components/ui/EmptyState'
import { inboxApi } from '../api/inbox'
import type { InboxEntityType, InboxItem, InboxResponse } from '../types'
import InboxItemCard from './InboxItemCard'

type FilterValue = 'all' | InboxEntityType

function groupByDate(items: InboxItem[], t: (key: string) => string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const groups: { label: string; items: InboxItem[] }[] = [
    { label: t('inbox.overdue'), items: [] },
    { label: t('inbox.today'), items: [] },
    { label: t('inbox.upcoming'), items: [] },
    { label: t('inbox.noDate'), items: [] },
  ]

  for (const item of items) {
    const dateStr = getDateStr(item)
    if (!dateStr) {
      groups[3].items.push(item)
      continue
    }
    const d = new Date(dateStr)
    d.setHours(0, 0, 0, 0)
    if (d < today) {
      groups[0].items.push(item)
    } else if (d.getTime() === today.getTime()) {
      groups[1].items.push(item)
    } else {
      groups[2].items.push(item)
    }
  }

  return groups.filter(g => g.items.length > 0)
}

function getDateStr(item: InboxItem): string | null {
  switch (item.entityType) {
    case 'task':
    case 'rfi':
      return item.dueDate ?? null
    case 'meeting':
      return item.scheduledDate ?? null
    default:
      return null
  }
}

function KpiBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        textAlign: 'center',
      }}
    >
      <Typography variant="caption" sx={{ color: color || 'text.secondary', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={700} sx={{ color: color || 'text.primary' }}>
        {value}
      </Typography>
    </Box>
  )
}

export default function InboxPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<InboxResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterValue>('all')

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true)
      const response = await inboxApi.getMyInbox()
      setData(response)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInbox()
  }, [fetchInbox])

  useEffect(() => {
    const handler = () => { fetchInbox() }
    window.addEventListener('ws:entity_update', handler)
    return () => window.removeEventListener('ws:entity_update', handler)
  }, [fetchInbox])

  const filteredItems = useMemo(() => {
    if (!data) return []
    if (filter === 'all') return data.items
    return data.items.filter(item => item.entityType === filter)
  }, [data, filter])

  const grouped = useMemo(() => groupByDate(filteredItems, t), [filteredItems, t])

  const counts = data?.counts

  const filterChips = useMemo(() => [
    { label: t('inbox.all'), value: 'all', count: counts?.total ?? 0 },
    { label: t('inbox.approvals'), value: 'approval', count: counts?.approvalCount ?? 0 },
    { label: t('inbox.tasks'), value: 'task', count: counts?.taskCount ?? 0 },
    { label: t('inbox.rfis'), value: 'rfi', count: counts?.rfiCount ?? 0 },
    { label: t('inbox.meetings'), value: 'meeting', count: counts?.meetingCount ?? 0 },
    { label: t('inbox.defects'), value: 'defect', count: counts?.defectCount ?? 0 },
  ], [t, counts])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        {t('inbox.pageTitle')}
      </Typography>

      {counts && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
            gap: 1.5,
            mb: 2,
          }}
        >
          <KpiBox label={t('inbox.total')} value={counts.total} color="primary.main" />
          <KpiBox label={t('inbox.approvals')} value={counts.approvalCount} color="#2196f3" />
          <KpiBox label={t('inbox.tasks')} value={counts.taskCount} color="#9c27b0" />
          <KpiBox label={t('inbox.rfis')} value={counts.rfiCount} color="#ff9800" />
          <KpiBox label={t('inbox.meetings')} value={counts.meetingCount} color="#4caf50" />
          <KpiBox label={t('inbox.defects')} value={counts.defectCount} color="#f44336" />
        </Box>
      )}

      <Box sx={{ mb: 2 }}>
        <FilterChips
          items={filterChips}
          value={filter}
          onChange={(val) => setFilter(val as FilterValue)}
        />
      </Box>

      {filteredItems.length === 0 ? (
        <EmptyState
          variant="empty"
          title={t('inbox.emptyTitle')}
          description={t('inbox.emptyDescription')}
        />
      ) : (
        grouped.map((group) => (
          <Box key={group.label} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {group.label}
              </Typography>
              <Box
                sx={{
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                {group.items.length}
              </Box>
            </Box>
            {group.items.map((item) => (
              <InboxItemCard key={`${item.entityType}-${item.id}`} item={item} />
            ))}
          </Box>
        ))
      )}
    </Box>
  )
}
