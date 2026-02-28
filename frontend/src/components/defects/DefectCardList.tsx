import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { StatusBadge, SeverityBadge } from '../ui/StatusBadge'
import type { Defect, DefectSeverity } from '../../types'
import { getDateLocale } from '../../utils/dateLocale'
import { ReportProblemIcon, PersonIcon } from '@/icons'
import { Box, Typography, Chip, Skeleton, useTheme } from '@/mui'

const SEVERITY_BORDER_COLORS: Record<DefectSeverity, string> = {
  critical: '#DC2626',
  high: '#EA580C',
  medium: '#CA8A04',
  low: '#22C55E',
}

function formatRelativeTime(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMinutes < 1) return t('defects.justNow')
  if (diffMinutes < 60) return t('defects.minutesAgo', { count: diffMinutes })
  if (diffHours < 24) return t('defects.hoursAgo', { count: diffHours })
  if (diffDays === 1) return t('defects.yesterday')
  if (diffDays < 30) return t('defects.daysAgo', { count: diffDays })
  return date.toLocaleDateString(getDateLocale())
}

interface DefectCardListProps {
  defects: Defect[]
  loading: boolean
  projectId: string
}

export default function DefectCardList({ defects, loading, projectId }: DefectCardListProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const theme = useTheme()
  const isRtl = theme.direction === 'rtl'

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[...Array(4)].map((_, i) => (
          <Box key={i} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="rounded" width={72} height={72} sx={{ borderRadius: 2, flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="80%" height={20} />
                <Skeleton variant="text" width="60%" height={16} sx={{ mt: 0.5 }} />
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 4 }} />
                  <Skeleton variant="rounded" width={50} height={22} sx={{ borderRadius: 4 }} />
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  if (defects.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <ReportProblemIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">{t('defects.noDefects')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {defects.map((defect) => {
        const borderColor = SEVERITY_BORDER_COLORS[defect.severity] || SEVERITY_BORDER_COLORS.low
        const contractorName = defect.assignedContact?.contactName
        const companyName = defect.assignedContact?.companyName

        return (
          <Box
            key={defect.id}
            onClick={() => navigate(`/projects/${projectId}/defects/${defect.id}`)}
            sx={{
              p: 2,
              display: 'flex',
              gap: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              position: 'relative',
              borderLeft: isRtl ? 'none' : `4px solid ${borderColor}`,
              borderRight: isRtl ? `4px solid ${borderColor}` : 'none',
              '&:active': { bgcolor: 'action.pressed' },
              transition: 'background-color 150ms ease',
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: 2,
                bgcolor: 'action.hover',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <ReportProblemIcon sx={{ fontSize: 28, color: 'text.disabled' }} />
            </Box>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      flex: 1,
                      mr: isRtl ? 0 : 1,
                      ml: isRtl ? 1 : 0,
                    }}
                  >
                    {defect.description}
                  </Typography>
                  <SeverityBadge severity={defect.severity} />
                </Box>
                {(contractorName || companyName) && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                    <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {contractorName}{companyName ? ` - ${companyName}` : ''}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <StatusBadge status={defect.status} />
                  {defect.area && <Chip label={defect.area.name} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
                </Box>
                <Typography variant="caption" color="text.disabled" sx={{ whiteSpace: 'nowrap' }}>
                  {formatRelativeTime(defect.createdAt, t)}
                </Typography>
              </Box>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
