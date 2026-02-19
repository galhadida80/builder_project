import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConstructionArea } from '../../types'
import { Box, Menu, MenuItem, ListItemIcon, ListItemText, IconButton } from '@/mui'
import { MoreVertIcon, ChecklistIcon, AddIcon, AssignmentIcon, AccountTreeIcon } from '@/icons'

interface AreaActionMenuProps {
  area: ConstructionArea
  onAssignChecklist: () => void
  onCreateInstances: () => void
  onViewChecklists: () => void
  onBulkCreate: () => void
}

export function AreaActionMenu({
  area,
  onAssignChecklist,
  onCreateInstances,
  onViewChecklists,
  onBulkCreate,
}: AreaActionMenuProps) {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const open = Boolean(anchorEl)

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation()
    setAnchorEl(e.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleAction = (action: () => void) => {
    handleClose()
    action()
  }

  return (
    <Box>
      <IconButton
        size="small"
        onClick={handleOpen}
        aria-label={t('common.more')}
        title={t('common.more')}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => handleAction(onAssignChecklist)}>
          <ListItemIcon>
            <ChecklistIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('areaChecklists.assignChecklist')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onCreateInstances)}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('areaChecklists.createInstances')}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleAction(onViewChecklists)}>
          <ListItemIcon>
            <AssignmentIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('areaChecklists.viewChecklists')}</ListItemText>
        </MenuItem>
        {area.children && area.children.length > 0 && (
          <MenuItem onClick={() => handleAction(onBulkCreate)}>
            <ListItemIcon>
              <AccountTreeIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('areaChecklists.bulkCreateChildren')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  )
}
