import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getDateLocale } from '../../utils/dateLocale'
import { StatusBadge, SeverityBadge } from '../ui/StatusBadge'
import type { Defect } from '../../types'
import { ReportProblemIcon } from '@/icons'
import { Box, Typography, Chip, Skeleton } from '@/mui'

interface DefectCardListProps {
  defects: Defect[]
  loading: boolean
  projectId: string
}

export default function DefectCardList({ defects, loading, projectId }: DefectCardListProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

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
      {defects.map((defect) => (
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
            '&:active': { bgcolor: 'action.pressed' },
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
                <Typography variant="body2" fontWeight={700} sx={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {defect.description}
                </Typography>
                <SeverityBadge severity={defect.severity} />
              </Box>
              {defect.assignedContact && (
                <Typography variant="caption" color="text.secondary">
                  {defect.assignedContact.contactName}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <StatusBadge status={defect.status} />
                {defect.area && <Chip label={defect.area.name} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />}
              </Box>
              <Typography variant="caption" color="text.disabled">
                {new Date(defect.createdAt).toLocaleDateString(getDateLocale())}
              </Typography>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
