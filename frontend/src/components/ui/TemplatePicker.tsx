import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'
import { SearchIcon, DescriptionIcon, SettingsIcon, ChecklistIcon, FoundationIcon, PlumbingIcon, ElectricalServicesIcon, AcUnitIcon, FireExtinguisherIcon, DoorFrontIcon, SecurityIcon, ElevatorIcon, SmartToyIcon, KitchenIcon, DeckIcon, WindowIcon, PersonIcon, FormatPaintIcon, InventoryIcon, WaterDropIcon, ThermostatIcon, SquareFootIcon, RoofingIcon, BathtubIcon, CableIcon, GridViewIcon, CategoryIcon, CloseIcon, CheckCircleIcon } from '@/icons'
import { Box, Typography, Chip, IconButton, alpha, InputAdornment, TextField as MuiTextField, Drawer, useMediaQuery, ButtonBase } from '@/mui'
import { useTheme } from '@/mui'

interface TemplateBase {
  id: string
  name: string
  name_he: string
  category: string | null
  description?: string | null
  required_documents: { name: string }[]
  required_specifications: { name: string }[]
  submission_checklist: { name: string }[]
}

interface TemplatePickerProps<T extends TemplateBase> {
  templates: T[]
  value: T | null
  onChange: (template: T | null) => void
  label: string
  placeholder: string
  noOptionsText?: string
}

const CATEGORY_ICONS: Record<string, ReactElement> = {
  structural: <FoundationIcon fontSize="small" />,
  plumbing: <PlumbingIcon fontSize="small" />,
  electrical: <ElectricalServicesIcon fontSize="small" />,
  hvac: <AcUnitIcon fontSize="small" />,
  fire_safety: <FireExtinguisherIcon fontSize="small" />,
  doors: <DoorFrontIcon fontSize="small" />,
  safe_room: <SecurityIcon fontSize="small" />,
  elevator: <ElevatorIcon fontSize="small" />,
  smart_home: <SmartToyIcon fontSize="small" />,
  cabinets: <KitchenIcon fontSize="small" />,
  outdoor: <DeckIcon fontSize="small" />,
  aluminum: <WindowIcon fontSize="small" />,
  tenant: <PersonIcon fontSize="small" />,
  finishes: <FormatPaintIcon fontSize="small" />,
  concrete: <FoundationIcon fontSize="small" />,
  masonry: <GridViewIcon fontSize="small" />,
  waterproofing: <WaterDropIcon fontSize="small" />,
  insulation: <ThermostatIcon fontSize="small" />,
  flooring: <SquareFootIcon fontSize="small" />,
  drywall: <RoofingIcon fontSize="small" />,
  sanitary: <BathtubIcon fontSize="small" />,
  piping: <CableIcon fontSize="small" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  structural: '#D32F2F',
  plumbing: '#e07842',
  electrical: '#F9A825',
  hvac: '#00ACC1',
  fire_safety: '#E65100',
  doors: '#6D4C41',
  safe_room: '#455A64',
  elevator: '#7B1FA2',
  smart_home: '#00C853',
  cabinets: '#8D6E63',
  outdoor: '#2E7D32',
  aluminum: '#78909C',
  tenant: '#5C6BC0',
  finishes: '#EC407A',
  concrete: '#757575',
  masonry: '#A1887F',
  waterproofing: '#0288D1',
  insulation: '#FF8F00',
  flooring: '#5D4037',
  drywall: '#90A4AE',
  sanitary: '#26C6DA',
  piping: '#546E7A',
}

function getCategoryIcon(category: string | null): ReactElement {
  if (!category) return <CategoryIcon fontSize="small" />
  return CATEGORY_ICONS[category] || <InventoryIcon fontSize="small" />
}

function getCategoryColor(category: string | null): string {
  if (!category) return '#9E9E9E'
  return CATEGORY_COLORS[category] || '#9E9E9E'
}

function formatCategoryFallback(category: string | null): string {
  if (!category) return 'General'
  return category.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export default function TemplatePicker<T extends TemplateBase>({
  templates,
  value,
  onChange,
  label,
  placeholder,
}: TemplatePickerProps<T>) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const formatCategory = useCallback((category: string | null): string => {
    if (!category) {
      const key = 'templatePicker.categories.general'
      const translated = t(key)
      return translated !== key ? translated : 'General'
    }
    const key = `templatePicker.categories.${category}`
    const translated = t(key)
    return translated !== key ? translated : formatCategoryFallback(category)
  }, [t])

  const categories = useMemo(() => {
    const cats = new Map<string, number>()
    templates.forEach(t => {
      const cat = t.category || 'general'
      cats.set(cat, (cats.get(cat) || 0) + 1)
    })
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1])
  }, [templates])

  const filteredTemplates = useMemo(() => {
    let list = templates
    if (categoryFilter) list = list.filter(t => (t.category || 'general') === categoryFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(t => t.name_he.toLowerCase().includes(q) || t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => {
      const catA = a.category || 'general'
      const catB = b.category || 'general'
      if (catA !== catB) return catA.localeCompare(catB)
      return a.name_he.localeCompare(b.name_he)
    })
  }, [templates, categoryFilter, searchQuery])

  const handleSelect = (template: T) => {
    onChange(template)
    setDrawerOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange(null)
  }

  const handleOpen = () => {
    setCategoryFilter(null)
    setSearchQuery('')
    setDrawerOpen(true)
  }

  const templateGrid = (
    <Box>
      {/* Search */}
      <Box sx={{ px: isMobile ? 2 : 0, pt: isMobile ? 2 : 0, pb: 1.5 }}>
        <MuiTextField
          fullWidth
          size="small"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
        />
      </Box>

      {/* Category pills */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.75,
          px: isMobile ? 2 : 0,
          pb: 1.5,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        <Chip
          label={t('common.all')}
          size="small"
          variant={categoryFilter === null ? 'filled' : 'outlined'}
          color={categoryFilter === null ? 'primary' : 'default'}
          onClick={() => setCategoryFilter(null)}
          sx={{ fontWeight: 600, cursor: 'pointer', flexShrink: 0, borderRadius: '20px', minHeight: 36 }}
        />
        {categories.map(([cat, count]) => {
          const isActive = categoryFilter === cat
          const catColor = getCategoryColor(cat)
          return (
            <Chip
              key={cat}
              icon={getCategoryIcon(cat)}
              label={`${formatCategory(cat)} (${count})`}
              size="small"
              variant={isActive ? 'filled' : 'outlined'}
              onClick={() => setCategoryFilter(isActive ? null : cat)}
              sx={{
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                flexShrink: 0,
                borderRadius: '20px',
                minHeight: 36,
                ...(isActive && {
                  bgcolor: catColor,
                  color: '#fff',
                  '& .MuiChip-icon': { color: '#fff' },
                  '&:hover': { bgcolor: catColor },
                }),
              }}
            />
          )
        })}
      </Box>

      {/* Template card grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 1,
          px: isMobile ? 2 : 0,
          pb: isMobile ? 2 : 0,
          maxHeight: isMobile ? 'calc(70vh - 140px)' : 350,
          overflowY: 'auto',
        }}
      >
        {filteredTemplates.length === 0 ? (
          <Box sx={{ gridColumn: '1 / -1', py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">{t('templatePicker.noResults')}</Typography>
          </Box>
        ) : (
          filteredTemplates.map((tmpl) => {
            const catColor = getCategoryColor(tmpl.category)
            const isSelected = value?.id === tmpl.id
            const specsCount = tmpl.required_specifications?.length || 0
            const docsCount = tmpl.required_documents?.length || 0
            const checklistCount = tmpl.submission_checklist?.length || 0

            return (
              <ButtonBase
                key={tmpl.id}
                onClick={() => handleSelect(tmpl)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  p: 1.5,
                  borderRadius: 2.5,
                  border: '2px solid',
                  borderColor: isSelected ? catColor : 'divider',
                  bgcolor: isSelected ? alpha(catColor, 0.06) : 'background.paper',
                  transition: 'all 150ms',
                  cursor: 'pointer',
                  textAlign: 'start',
                  minHeight: 80,
                  '&:hover': {
                    borderColor: catColor,
                    bgcolor: alpha(catColor, 0.04),
                    boxShadow: `0 2px 8px ${alpha(catColor, 0.15)}`,
                  },
                  '&:active': { transform: 'scale(0.98)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 2,
                      bgcolor: alpha(catColor, 0.12),
                      color: catColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getCategoryIcon(tmpl.category)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
                      {tmpl.name_he}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
                      {formatCategory(tmpl.category)}
                    </Typography>
                  </Box>
                  {isSelected && <CheckCircleIcon sx={{ fontSize: 20, color: catColor, flexShrink: 0 }} />}
                </Box>
                {(specsCount > 0 || docsCount > 0 || checklistCount > 0) && (
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 'auto' }}>
                    {specsCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, fontSize: 10 }}>
                        <SettingsIcon sx={{ fontSize: 12 }} /> {specsCount}
                      </Typography>
                    )}
                    {docsCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, fontSize: 10 }}>
                        <DescriptionIcon sx={{ fontSize: 12 }} /> {docsCount}
                      </Typography>
                    )}
                    {checklistCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3, fontSize: 10 }}>
                        <ChecklistIcon sx={{ fontSize: 12 }} /> {checklistCount}
                      </Typography>
                    )}
                  </Box>
                )}
              </ButtonBase>
            )
          })
        )}
      </Box>
    </Box>
  )

  return (
    <Box>
      {/* Selected template card or trigger button */}
      {value ? (
        <Box
          sx={{
            p: 0,
            borderRadius: 3,
            border: '2px solid',
            borderColor: alpha(getCategoryColor(value.category), 0.4),
            bgcolor: alpha(getCategoryColor(value.category), 0.04),
            overflow: 'hidden',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                bgcolor: alpha(getCategoryColor(value.category), 0.12),
                color: getCategoryColor(value.category),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {getCategoryIcon(value.category)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={700}>{value.name_he}</Typography>
              {value.description && (
                <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {value.description}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
              <IconButton size="small" onClick={handleOpen} sx={{ color: 'text.secondary' }}>
                <SearchIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleClear} sx={{ color: 'text.secondary' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          {/* Stats row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1.5, borderTop: '1px solid', borderColor: alpha(getCategoryColor(value.category), 0.15) }}>
            {(value.required_specifications?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <SettingsIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.required_specifications.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>{t('templatePicker.specs')}</Typography>
              </Box>
            )}
            {(value.required_documents?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <DescriptionIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.required_documents.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>{t('templatePicker.docs')}</Typography>
              </Box>
            )}
            {(value.submission_checklist?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.submission_checklist.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>{t('templatePicker.checks')}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        <ButtonBase
          onClick={handleOpen}
          sx={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 2,
            borderRadius: 3,
            border: '2px dashed',
            borderColor: 'divider',
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            transition: 'all 200ms',
            cursor: 'pointer',
            justifyContent: 'center',
            minHeight: 64,
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: alpha(theme.palette.primary.main, 0.04),
            },
          }}
        >
          <SearchIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Box sx={{ textAlign: 'start' }}>
            <Typography variant="body2" fontWeight={600} color="primary.main">
              {label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {placeholder}
            </Typography>
          </Box>
        </ButtonBase>
      )}

      {/* Mobile: Bottom sheet drawer / Desktop: inline dropdown */}
      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ zIndex: 1400 }}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '80vh',
            },
          }}
        >
          <Box sx={{ width: 40, height: 4, bgcolor: 'divider', borderRadius: 2, mx: 'auto', mt: 1.5, mb: 0.5 }} />
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>{label}</Typography>
          </Box>
          {templateGrid}
        </Drawer>
      ) : (
        drawerOpen && (
          <Box
            sx={{
              mt: 1,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              boxShadow: 3,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
              <IconButton size="small" onClick={() => setDrawerOpen(false)}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ p: 1.5 }}>
              {templateGrid}
            </Box>
          </Box>
        )
      )}
    </Box>
  )
}
