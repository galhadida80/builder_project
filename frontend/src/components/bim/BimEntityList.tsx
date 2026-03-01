import { useTranslation } from 'react-i18next'
import {
  Box,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Checkbox,
  Typography,
} from '@/mui'

interface EntityItem {
  id: string
  bimObjectId?: string
  primaryText: string
  secondaryText?: string
}

interface BimEntityListProps {
  items: EntityItem[]
  loading: boolean
  modelId?: string
  emptyKey: string
  selectedSet: Set<string>
  itemRefs: React.MutableRefObject<Map<string, HTMLElement>>
  onItemClick: (bimObjectId: string | undefined, event: React.MouseEvent) => void
}

export default function BimEntityList({
  items,
  loading,
  modelId,
  emptyKey,
  selectedSet,
  itemRefs,
  onItemClick,
}: BimEntityListProps) {
  const { t } = useTranslation()

  if (!modelId) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('bim.sidebar.selectModel')}
      </Typography>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t(emptyKey)}
      </Typography>
    )
  }

  return (
    <List dense>
      {items.map((item) => {
        const isSelected = item.bimObjectId ? selectedSet.has(item.bimObjectId) : false
        return (
          <ListItem
            key={item.id}
            ref={(el) => {
              if (el && item.bimObjectId) {
                itemRefs.current.set(item.bimObjectId, el)
              }
            }}
            onClick={(e) => onItemClick(item.bimObjectId, e)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              bgcolor: isSelected ? 'primary.lighter' : 'transparent',
              '&:hover': {
                bgcolor: isSelected ? 'primary.light' : 'action.hover',
                cursor: 'pointer',
              },
            }}
          >
            <Checkbox
              edge="start"
              checked={isSelected}
              tabIndex={-1}
              disableRipple
              size="small"
              sx={{ mr: 1 }}
            />
            <ListItemText
              primary={item.primaryText}
              secondary={item.secondaryText}
              primaryTypographyProps={{ variant: 'body2' }}
              secondaryTypographyProps={{ variant: 'caption' }}
            />
          </ListItem>
        )
      })}
    </List>
  )
}
