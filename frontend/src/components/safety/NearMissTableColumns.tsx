import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { formatRelativeTime } from '../../utils/dateUtils'
import { getDateLocale } from '../../utils/dateLocale'
import { Button } from '../ui/Button'
import { Column } from '../ui/DataTable'
import { StatusBadge, SeverityBadge } from '../ui/StatusBadge'
import { VisibilityIcon, SecurityIcon } from '@/icons'
import { Box, Typography, Tooltip } from '@/mui'
import type { NearMiss, NearMissSeverity } from '../../types/safety'

const SEVERITY_BORDER_COLORS: Record<NearMissSeverity, string> = {
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#22C55E',
}

export function useNearMissTableColumns(): Column<NearMiss>[] {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { projectId } = useParams()

  return [
    {
      id: 'nearMissNumber',
      label: '#',
      minWidth: 70,
      sortable: true,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 4,
              height: 28,
              borderRadius: 1,
              bgcolor: SEVERITY_BORDER_COLORS[row.severity] || SEVERITY_BORDER_COLORS.low,
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" fontWeight={600}>
            #{row.nearMissNumber}
          </Typography>
          {row.isAnonymous && (
            <Tooltip title={t('safety.anonymousReport')} arrow>
              <SecurityIcon fontSize="small" color="action" />
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      id: 'title',
      label: t('safety.title'),
      minWidth: 220,
      render: (row) => (
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}
        >
          {row.title}
        </Typography>
      ),
    },
    {
      id: 'location',
      label: t('safety.location'),
      minWidth: 130,
      hideOnMobile: true,
      render: (row) => (
        <Typography variant="body2" color={row.area ? 'text.primary' : 'text.secondary'}>
          {row.area
            ? `${row.area.name}${row.area.floorNumber != null ? ` / ${t('defects.floor')} ${row.area.floorNumber}` : ''}`
            : row.location || '-'}
        </Typography>
      ),
    },
    {
      id: 'severity',
      label: t('safety.severity'),
      minWidth: 110,
      hideOnMobile: true,
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 120,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      id: 'reportedBy',
      label: t('safety.reportedBy'),
      minWidth: 140,
      hideOnMobile: true,
      render: (row) => (
        <Typography variant="body2" color={row.reportedBy ? 'text.primary' : 'text.secondary'}>
          {row.isAnonymous ? t('safety.anonymous') : row.reportedBy?.contactName || '-'}
        </Typography>
      ),
    },
    {
      id: 'createdAt',
      label: t('common.date'),
      minWidth: 100,
      sortable: true,
      hideOnMobile: true,
      render: (row) => (
        <Tooltip title={new Date(row.createdAt).toLocaleDateString(getDateLocale())} arrow>
          <Typography variant="body2" color="text.secondary">
            {formatRelativeTime(row.createdAt, t)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 90,
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <Button
          variant="tertiary"
          size="small"
          icon={<VisibilityIcon />}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/projects/${projectId}/safety/near-misses/${row.id}`)
          }}
        >
          {t('buttons.view')}
        </Button>
      ),
    },
  ]
}
