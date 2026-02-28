import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { getCategoryConfig } from '../../utils/materialCategory'
import { VisibilityIcon, EditIcon, DeleteIcon } from '@/icons'
import { Box, Typography, Chip, IconButton, Skeleton, LinearProgress } from '@/mui'
import type { Material } from '../../types'

function getStatusProgress(status: string): { value: number; color: 'inherit' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' } {
  switch (status) {
    case 'draft': return { value: 15, color: 'inherit' }
    case 'submitted': return { value: 40, color: 'warning' }
    case 'under_review': return { value: 60, color: 'info' }
    case 'approved': return { value: 100, color: 'success' }
    case 'rejected': return { value: 100, color: 'error' }
    default: return { value: 0, color: 'inherit' }
  }
}

interface MaterialCardListProps {
  materials: Material[]
  loading?: boolean
  onView: (m: Material) => void
  onEdit: (m: Material, e?: React.MouseEvent) => void
  onDelete: (m: Material, e?: React.MouseEvent) => void
  onAdd: () => void
}

function MaterialCardSkeleton() {
  return (
    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rounded" width={80} height={80} sx={{ borderRadius: 2, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width={140} height={22} />
          <Skeleton variant="text" width={100} height={18} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={120} height={16} />
        </Box>
      </Box>
    </Box>
  )
}

export default function MaterialCardList({ materials, loading, onView, onEdit, onDelete, onAdd }: MaterialCardListProps) {
  const { t } = useTranslation()

  if (loading) {
    return <Box>{[...Array(4)].map((_, i) => <MaterialCardSkeleton key={i} />)}</Box>
  }

  if (materials.length === 0) {
    return (
      <Box sx={{ py: 6 }}>
        <EmptyState variant="no-results" title={t('materials.noMaterialsFound')} description={t('materials.noResultsDescription')} action={{ label: t('materials.addMaterial'), onClick: onAdd }} />
      </Box>
    )
  }

  return (
    <Box>
      {materials.map((m) => {
        const catConfig = getCategoryConfig(m.materialType)
        const CatIcon = catConfig.icon
        const progress = getStatusProgress(m.status)
        return (
          <Box
            key={m.id}
            onClick={() => onView(m)}
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              cursor: 'pointer',
              transition: 'background-color 150ms',
              '&:hover': { bgcolor: 'action.hover' },
              '&:active': { bgcolor: 'action.pressed' },
            }}
          >
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: catConfig.bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CatIcon sx={{ fontSize: 24, color: catConfig.color }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Typography variant="body1" fontWeight={700} noWrap sx={{ flex: 1, mr: 1 }}>{m.name}</Typography>
                  <StatusBadge status={m.status} size="small" />
                </Box>
                {m.materialType && (
                  <Chip label={m.materialType} size="small" sx={{ bgcolor: catConfig.bgColor, color: catConfig.color, fontWeight: 600, fontSize: '0.7rem', height: 22, mb: 0.5 }} />
                )}
                {m.manufacturer && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('materials.supplier')}: {m.manufacturer}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mt: 1.5, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              {m.quantity && (
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  {Number(m.quantity).toLocaleString()} {m.unit || ''}
                </Typography>
              )}
              {m.expectedDelivery && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  {new Date(m.expectedDelivery).toLocaleDateString('he-IL')}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Box sx={{ flex: 1, mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress.value}
                  color={progress.color}
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover' }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                <IconButton size="small" onClick={() => onView(m)} aria-label={t('common.details')}><VisibilityIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={(e) => onEdit(m, e)} aria-label={t('materials.editMaterial')}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={(e) => onDelete(m, e)} aria-label={t('common.delete')} color="error"><DeleteIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
