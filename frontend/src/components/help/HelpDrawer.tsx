import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CloseIcon, SearchIcon } from '@/icons'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@/mui'

interface HelpItem {
  titleKey: string
  descriptionKey: string
  group: string
}

const HELP_ITEMS: HelpItem[] = [
  { group: 'gettingStarted', titleKey: 'help.items.createProject.title', descriptionKey: 'help.items.createProject.description' },
  { group: 'gettingStarted', titleKey: 'help.items.inviteTeam.title', descriptionKey: 'help.items.inviteTeam.description' },
  { group: 'equipment', titleKey: 'help.items.addEquipment.title', descriptionKey: 'help.items.addEquipment.description' },
  { group: 'equipment', titleKey: 'help.items.equipmentApproval.title', descriptionKey: 'help.items.equipmentApproval.description' },
  { group: 'materials', titleKey: 'help.items.addMaterial.title', descriptionKey: 'help.items.addMaterial.description' },
  { group: 'materials', titleKey: 'help.items.materialApproval.title', descriptionKey: 'help.items.materialApproval.description' },
  { group: 'inspections', titleKey: 'help.items.scheduleInspection.title', descriptionKey: 'help.items.scheduleInspection.description' },
  { group: 'inspections', titleKey: 'help.items.checklists.title', descriptionKey: 'help.items.checklists.description' },
  { group: 'rfis', titleKey: 'help.items.createRfi.title', descriptionKey: 'help.items.createRfi.description' },
  { group: 'rfis', titleKey: 'help.items.respondRfi.title', descriptionKey: 'help.items.respondRfi.description' },
  { group: 'approvals', titleKey: 'help.items.reviewApproval.title', descriptionKey: 'help.items.reviewApproval.description' },
  { group: 'approvals', titleKey: 'help.items.approvalWorkflow.title', descriptionKey: 'help.items.approvalWorkflow.description' },
]

const GROUPS = ['gettingStarted', 'equipment', 'materials', 'inspections', 'rfis', 'approvals']

interface HelpDrawerProps {
  open: boolean
  onClose: () => void
}

export default function HelpDrawer({ open, onClose }: HelpDrawerProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return HELP_ITEMS
    const lower = search.toLowerCase()
    return HELP_ITEMS.filter(
      (item) =>
        t(item.titleKey).toLowerCase().includes(lower) ||
        t(item.descriptionKey).toLowerCase().includes(lower)
    )
  }, [search, t])

  const groupedItems = useMemo(() => {
    const map = new Map<string, HelpItem[]>()
    for (const item of filtered) {
      const existing = map.get(item.group) || []
      existing.push(item)
      map.set(item.group, existing)
    }
    return map
  }, [filtered])

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 380 } } }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600}>
          {t('help.title')}
        </Typography>
        <IconButton onClick={onClose} aria-label={t('common.close')}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, pb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t('help.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Divider />

      <Box sx={{ overflow: 'auto', flex: 1 }}>
        {GROUPS.map((group) => {
          const items = groupedItems.get(group)
          if (!items || items.length === 0) return null
          return (
            <Box key={group}>
              <Typography
                variant="caption"
                sx={{
                  px: 2,
                  pt: 2,
                  pb: 1,
                  display: 'block',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'text.secondary',
                }}
              >
                {t(`help.groups.${group}`)}
              </Typography>
              <List dense disablePadding>
                {items.map((item) => (
                  <ListItem key={item.titleKey} sx={{ px: 2 }}>
                    <ListItemText
                      primary={t(item.titleKey)}
                      secondary={t(item.descriptionKey)}
                      primaryTypographyProps={{ fontWeight: 500, fontSize: '0.875rem' }}
                      secondaryTypographyProps={{ fontSize: '0.8rem' }}
                    />
                  </ListItem>
                ))}
              </List>
              <Divider sx={{ mx: 2 }} />
            </Box>
          )
        })}

        {filtered.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('help.noResults')}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  )
}
