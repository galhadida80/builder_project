import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../ui/StatusBadge'
import { EmptyState } from '../ui/EmptyState'
import { VisibilityIcon, EditIcon, DeleteIcon, GridViewIcon, CalendarTodayIcon, LocationOnIcon } from '@/icons'
import { Box, Typography, Chip, IconButton, Skeleton } from '@/mui'
import type { Equipment } from '../../types'

const getCategoryColor = (equipmentType?: string): string => {
  if (!equipmentType) return '#9CA3AF'
  const lower = equipmentType.toLowerCase()
  if (lower.includes('crane') || lower.includes('מנוף')) return '#f28c26'
  if (lower.includes('heavy') || lower.includes('כבד')) return '#EAB308'
  if (lower.includes('transport') || lower.includes('הובלה') || lower.includes('משאית')) return '#3B82F6'
  return '#9CA3AF'
}

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
      {equipment.map((eq) => {
        const catColor = getCategoryColor(eq.equipmentType)
        return (
          <Box
            key={eq.id}
            onClick={() => onView(eq)}
            sx={{
              p: 2,
              borderBottom: '1px solid',
              borderColor: 'divider',
              borderLeft: `4px solid ${catColor}`,
              cursor: 'pointer',
              transition: 'background-color 150ms',
              '&:hover': { bgcolor: 'action.hover' },
              '&:active': { bgcolor: 'action.pressed' },
            }}
          >
            {eq.equipmentType && (
              <Box sx={{ mb: 1 }}>
                <Chip
                  label={eq.equipmentType}
                  size="small"
                  sx={{
                    bgcolor: 'transparent',
                    border: `1px solid ${catColor}`,
                    color: catColor,
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    height: 22,
                  }}
                />
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Typography variant="body1" fontWeight={700} noWrap sx={{ flex: 1, mr: 1 }}>
                {eq.name}
              </Typography>
              <StatusBadge status={eq.status} size="small" />
            </Box>
            {eq.modelNumber && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <GridViewIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  {eq.modelNumber}
                </Typography>
              </Box>
            )}
            {eq.serialNumber && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1, width: 14, textAlign: 'center' }}>#</Typography>
                <Typography variant="caption" color="text.secondary">
                  {eq.serialNumber}
                </Typography>
              </Box>
            )}
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  {eq.createdAt ? new Date(eq.createdAt).toLocaleDateString() : '—'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <LocationOnIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  {eq.manufacturer || '—'}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                mt: 1,
              }}
            >
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
        )
      })}
    </Box>
  )
}
