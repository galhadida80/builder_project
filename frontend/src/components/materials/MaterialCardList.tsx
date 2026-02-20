import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { InventoryIcon, VisibilityIcon, EditIcon, DeleteIcon } from '@/icons'
import { Box, Typography, Chip, IconButton, Skeleton } from '@/mui'
import type { Material } from '../../types'

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
      {materials.map((m) => (
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
            <Box sx={{ width: 80, height: 80, borderRadius: 2, bgcolor: 'warning.light', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid', borderColor: 'divider' }}>
              <InventoryIcon sx={{ fontSize: 32, color: 'warning.main' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="body1" fontWeight={700} noWrap sx={{ flex: 1, mr: 1 }}>{m.name}</Typography>
                <StatusBadge status={m.status} size="small" />
              </Box>
              {m.materialType && (
                <Chip label={m.materialType} size="small" sx={{ bgcolor: 'warning.light', color: 'warning.main', fontWeight: 600, fontSize: '0.7rem', height: 22, mb: 0.5 }} />
              )}
              {m.manufacturer && (
                <Typography variant="caption" color="text.secondary" display="block">{m.manufacturer}</Typography>
              )}
              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                {m.quantity && (
                  <Typography variant="caption" color="text.secondary">
                    {t('materials.quantity')}: {Number(m.quantity).toLocaleString()} {m.unit || ''}
                  </Typography>
                )}
                {m.storageLocation && (
                  <Typography variant="caption" color="text.secondary">{m.storageLocation}</Typography>
                )}
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary">
              {m.expectedDelivery ? `${t('materials.deliveryDate')}: ${new Date(m.expectedDelivery).toLocaleDateString('he-IL')}` : ''}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <IconButton size="small" onClick={() => onView(m)}><VisibilityIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={(e) => onEdit(m, e)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={(e) => onDelete(m, e)} color="error"><DeleteIcon fontSize="small" /></IconButton>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
