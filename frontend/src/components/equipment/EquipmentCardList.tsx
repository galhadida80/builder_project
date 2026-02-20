import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { BuildIcon, VisibilityIcon, EditIcon, DeleteIcon } from '@/icons'
import { Box, Typography, Chip, IconButton, Skeleton } from '@/mui'
import type { Equipment } from '../../types'

interface EquipmentCardListProps {
  equipment: Equipment[]
  loading?: boolean
  onView: (eq: Equipment) => void
  onEdit: (eq: Equipment, e?: React.MouseEvent) => void
  onDelete: (eq: Equipment, e: React.MouseEvent) => void
  onAdd: () => void
}

function EquipmentCardSkeleton() {
  return (
    <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Skeleton variant="rounded" width={80} height={80} sx={{ borderRadius: 2, flexShrink: 0 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Skeleton variant="text" width={140} height={22} />
            <Skeleton variant="rounded" width={60} height={22} sx={{ borderRadius: 3 }} />
          </Box>
          <Skeleton variant="text" width={80} height={18} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={120} height={16} />
          <Skeleton variant="text" width={140} height={16} />
        </Box>
      </Box>
    </Box>
  )
}

export default function EquipmentCardList({ equipment, loading, onView, onEdit, onDelete, onAdd }: EquipmentCardListProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <Box>
        {[...Array(4)].map((_, i) => <EquipmentCardSkeleton key={i} />)}
      </Box>
    )
  }

  if (equipment.length === 0) {
    return (
      <Box sx={{ py: 6 }}>
        <EmptyState
          variant="no-results"
          title={t('equipment.noEquipmentFound')}
          action={{ label: t('equipment.addEquipment'), onClick: onAdd }}
        />
      </Box>
    )
  }

  return (
    <Box>
      {equipment.map((eq) => (
        <Box
          key={eq.id}
          onClick={() => onView(eq)}
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
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                bgcolor: 'primary.light',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <BuildIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="body1" fontWeight={700} noWrap sx={{ flex: 1, mr: 1 }}>
                  {eq.name}
                </Typography>
                {eq.equipmentType && (
                  <Chip
                    label={eq.equipmentType}
                    size="small"
                    sx={{
                      bgcolor: 'primary.light',
                      color: 'primary.main',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      height: 22,
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <StatusBadge status={eq.status} size="small" />
              </Box>
              {eq.modelNumber && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {t('equipment.model')}: {eq.modelNumber}
                </Typography>
              )}
              {eq.serialNumber && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {t('equipment.serialNumber')}: {eq.serialNumber}
                </Typography>
              )}
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {eq.manufacturer || t('equipment.noManufacturer')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
              <IconButton size="small" onClick={() => onView(eq)} aria-label={t('common.details')}>
                <VisibilityIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => onEdit(eq, e)} aria-label={t('equipment.editEquipment')}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => onDelete(eq, e)} aria-label={t('common.delete')} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
