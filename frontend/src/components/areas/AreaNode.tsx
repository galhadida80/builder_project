import { useState } from 'react'
import { Card } from '../ui/Card'
import { ProgressBar } from '../ui/ProgressBar'
import { AreaActionMenu } from './AreaActionMenu'
import type { ConstructionArea, AreaStatus } from '../../types'
import { ApartmentIcon, LocalParkingIcon, RoofingIcon, FoundationIcon, EditIcon, DeleteIcon, ExpandMoreIcon, ExpandLessIcon, ChecklistIcon } from '@/icons'
import { Box, Typography, Chip, Collapse, IconButton, useTheme } from '@/mui'
import { alpha } from '@/mui'
import type { Theme } from '@/mui'

const AREA_TYPE_ICONS: Record<string, React.ReactNode> = {
  apartment: <ApartmentIcon />, parking: <LocalParkingIcon />, roof: <RoofingIcon />,
  basement: <FoundationIcon />, facade: <ApartmentIcon />, common_area: <ApartmentIcon />,
}
export const AREA_TYPE_KEYS = ['apartment', 'parking', 'roof', 'basement', 'facade', 'common_area'] as const
const STATUS_COLORS: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
  completed: 'success', in_progress: 'info', awaiting_approval: 'warning', not_started: 'default',
}

const getStatusBorderColor = (status: string, theme: Theme) => {
  const map: Record<string, string> = {
    completed: theme.palette.success.main,
    in_progress: theme.palette.primary.main,
    not_started: theme.palette.grey[500],
    awaiting_approval: theme.palette.warning.main,
  }
  return map[status] || theme.palette.grey[500]
}

interface AreaNodeProps {
  area: ConstructionArea; level: number
  onEdit: (a: ConstructionArea) => void; onDelete: (a: ConstructionArea) => void
  onOpenDrawer: (a: ConstructionArea) => void; onAssignChecklist: (a: ConstructionArea) => void
  onCreateInstances: (a: ConstructionArea) => void; onViewChecklists: (a: ConstructionArea) => void
  onBulkCreate: (a: ConstructionArea) => void; t: (key: string, options?: Record<string, unknown>) => string
}

export function AreaNode({ area, level, onEdit, onDelete, onOpenDrawer, onAssignChecklist, onCreateInstances, onViewChecklists, onBulkCreate, t }: AreaNodeProps) {
  const [expanded, setExpanded] = useState(true)
  const theme = useTheme()
  const hasChildren = area.children && area.children.length > 0
  const overallProgress: number = area.currentProgress ?? 0
  const areaTypeIcon = AREA_TYPE_ICONS[area.areaType || ''] || <ApartmentIcon />
  const derivedStatus: AreaStatus = overallProgress === 100 ? 'completed' : overallProgress > 0 ? 'in_progress' : 'not_started'
  const statusColor = STATUS_COLORS[derivedStatus] || 'default'
  const borderColor = getStatusBorderColor(derivedStatus, theme)

  return (
    <Box sx={{ marginInlineStart: { xs: level * 1.5, sm: level * 3 } }}>
      <Card hoverable sx={{ mb: 1, borderInlineStart: '4px solid', borderInlineStartColor: borderColor, ...(overallProgress === 100 && { opacity: 0.85 }) }} onClick={() => onOpenDrawer(area)}>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: { xs: 1, sm: 0 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              {hasChildren ? (
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }} sx={{ bgcolor: 'action.hover', '&:hover': { bgcolor: 'action.selected' } }}>
                  {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                </IconButton>
              ) : <Box sx={{ width: 32 }} />}
              <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>{areaTypeIcon}</Box>
              <Box>
                <Typography variant="body2" fontWeight={600}>{area.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip label={area.areaCode} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, bgcolor: alpha(borderColor, 0.13), color: borderColor, border: `1px solid ${alpha(borderColor, 0.27)}` }} />
                  {area.totalUnits && <Typography variant="caption" color="text.secondary">{area.totalUnits} {t('areas.units')}</Typography>}
                  {area.floorNumber !== undefined && <Typography variant="caption" color="text.secondary">{t('areas.floor')} {area.floorNumber}</Typography>}
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 3 } }}>
              <Chip icon={<ChecklistIcon sx={{ fontSize: 14 }} />} label={t('areaChecklists.viewChecklists')} size="small" variant="outlined" color="info" onClick={(e) => { e.stopPropagation(); onOpenDrawer(area) }} sx={{ display: { xs: 'none', sm: 'flex' }, height: 24, fontSize: '0.7rem' }} />
              <Box sx={{ width: { xs: 100, sm: 160 } }}>
                <ProgressBar value={overallProgress} showValue size="small" color={overallProgress === 100 ? 'success' : 'primary'} />
              </Box>
              <Chip label={t(`areas.statuses.${derivedStatus}`)} size="small" color={statusColor} sx={{ fontWeight: 500, minWidth: { xs: 'auto', sm: 100 }, display: { xs: 'none', sm: 'flex' } }} />
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                <IconButton size="small" onClick={() => onEdit(area)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => onDelete(area)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                <AreaActionMenu area={area} onAssignChecklist={() => onAssignChecklist(area)} onCreateInstances={() => onCreateInstances(area)} onViewChecklists={() => onViewChecklists(area)} onBulkCreate={() => onBulkCreate(area)} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Card>
      {hasChildren && (
        <Collapse in={expanded}>
          {area.children!.map(child => (
            <AreaNode key={child.id} area={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} onOpenDrawer={onOpenDrawer} onAssignChecklist={onAssignChecklist} onCreateInstances={onCreateInstances} onViewChecklists={onViewChecklists} onBulkCreate={onBulkCreate} t={t} />
          ))}
        </Collapse>
      )}
    </Box>
  )
}
