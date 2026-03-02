import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Box, ButtonBase, Card, Chip, Typography } from '@/mui'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { InboxItem, InboxEntityType } from '../types'

const TYPE_COLORS: Record<InboxEntityType, string> = {
  approval: '#2196f3',
  task: '#9c27b0',
  rfi: '#ff9800',
  meeting: '#4caf50',
  defect: '#f44336',
}

function getItemTitle(item: InboxItem, t: (key: string, opts?: Record<string, unknown>) => string): string {
  switch (item.entityType) {
    case 'approval':
      return `${t('inbox.approval')} — ${item.entityKind}`
    case 'task':
      return item.title
    case 'rfi':
      return `${t('inbox.rfiNumber', { number: item.rfiNumber })} — ${item.subject}`
    case 'meeting':
      return item.title
    case 'defect':
      return t('inbox.defectNumber', { number: item.defectNumber })
  }
}

function getItemStatus(item: InboxItem): string | null {
  switch (item.entityType) {
    case 'approval':
      return item.currentStatus
    case 'task':
      return item.status
    case 'rfi':
      return item.status
    case 'meeting':
      return null
    case 'defect':
      return item.severity ?? null
  }
}

function getItemDate(item: InboxItem): string | null {
  switch (item.entityType) {
    case 'approval':
      return null
    case 'task':
      return item.dueDate ?? null
    case 'rfi':
      return item.dueDate ?? null
    case 'meeting':
      return item.scheduledDate ?? null
    case 'defect':
      return null
  }
}

function getNavigationPath(item: InboxItem): string {
  const base = `/projects/${item.projectId}`
  switch (item.entityType) {
    case 'approval':
      return `${base}/tasks`
    case 'task':
      return `${base}/tasks`
    case 'rfi':
      return `${base}/rfis`
    case 'meeting':
      return `${base}/meetings`
    case 'defect':
      return `${base}/defects/${item.id}`
  }
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

interface InboxItemCardProps {
  item: InboxItem
}

export default function InboxItemCard({ item }: InboxItemCardProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const title = getItemTitle(item, t)
  const status = getItemStatus(item)
  const dateStr = getItemDate(item)
  const overdue = isOverdue(dateStr)
  const color = TYPE_COLORS[item.entityType]

  return (
    <Card
      sx={{
        mb: 1,
        borderInlineStart: `4px solid ${color}`,
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      <ButtonBase
        onClick={() => navigate(getNavigationPath(item))}
        sx={{ p: 1.5, display: 'block', textAlign: 'start', width: '100%' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Chip
            label={t(`inbox.${item.entityType}`)}
            size="small"
            sx={{
              bgcolor: `${color}14`,
              color,
              fontWeight: 600,
              fontSize: '0.65rem',
              height: 22,
            }}
          />
          {status && <StatusBadge status={status} size="small" />}
        </Box>

        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5, lineHeight: 1.3 }}>
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            {item.projectName}
          </Typography>

          {dateStr && (
            <Typography
              variant="caption"
              sx={{
                color: overdue ? 'error.main' : 'text.secondary',
                fontWeight: overdue ? 700 : 400,
                fontSize: '0.7rem',
              }}
            >
              {formatDate(dateStr, i18n.language)}
            </Typography>
          )}
        </Box>
      </ButtonBase>
    </Card>
  )
}
