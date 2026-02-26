import { useState, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'
import { SearchIcon, DescriptionIcon, SettingsIcon, ChecklistIcon, FoundationIcon, PlumbingIcon, ElectricalServicesIcon, AcUnitIcon, FireExtinguisherIcon, DoorFrontIcon, SecurityIcon, ElevatorIcon, SmartToyIcon, KitchenIcon, DeckIcon, WindowIcon, PersonIcon, FormatPaintIcon, InventoryIcon, WaterDropIcon, ThermostatIcon, SquareFootIcon, RoofingIcon, BathtubIcon, CableIcon, GridViewIcon, CategoryIcon, CloseIcon, CheckCircleIcon } from '@/icons'
import { Autocomplete, TextField as MuiTextField, Box, Typography, Chip, Paper, InputAdornment, IconButton, alpha } from '@/mui'
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
  return category
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function TemplatePicker<T extends TemplateBase>({
  templates,
  value,
  onChange,
  label,
  placeholder,
  noOptionsText: noOptionsTextProp,
}: TemplatePickerProps<T>) {
  const { t } = useTranslation()
  const theme = useTheme()

  const categoryKeyMap = useMemo(() => {
    const map = new Map<string, string>()
    templates.forEach(tmpl => {
      const cat = tmpl.category || 'general'
      if (!map.has(cat)) {
        const key = `templatePicker.categories.${cat}`
        const translated = t(key)
        const label = translated !== key ? translated : (cat === 'general' ? 'General' : formatCategoryFallback(cat))
        map.set(label, cat)
      }
    })
    return map
  }, [templates, t])

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

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const categories = useMemo(() => {
    const cats = new Map<string, number>()
    templates.forEach(t => {
      const cat = t.category || 'general'
      cats.set(cat, (cats.get(cat) || 0) + 1)
    })
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1])
  }, [templates])

  const filteredTemplates = useMemo(() => {
    if (!categoryFilter) return templates
    return templates.filter(t => (t.category || 'general') === categoryFilter)
  }, [templates, categoryFilter])

  const sortedTemplates = useMemo(() => {
    return [...filteredTemplates].sort((a, b) => {
      const catA = a.category || 'general'
      const catB = b.category || 'general'
      if (catA !== catB) return catA.localeCompare(catB)
      return a.name_he.localeCompare(b.name_he)
    })
  }, [filteredTemplates])

  return (
    <Box>
      {/* Horizontal scrollable category pills */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.75,
          mb: 1.5,
          overflowX: 'auto',
          pb: 0.5,
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
          sx={{
            fontWeight: categoryFilter === null ? 600 : 400,
            cursor: 'pointer',
            flexShrink: 0,
            borderRadius: '20px',
          }}
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

      {/* Autocomplete search */}
      <Autocomplete
        options={sortedTemplates}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        groupBy={(option) => formatCategory(option.category)}
        getOptionLabel={(option) => option.name_he}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        PaperComponent={(props) => (
          <Paper
            {...props}
            elevation={8}
            sx={{
              borderRadius: 3,
              mt: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          />
        )}
        renderInput={(params) => (
          <MuiTextField
            {...params}
            label={label}
            placeholder={placeholder}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    {value ? (
                      <Box sx={{ color: getCategoryColor(value.category), display: 'flex' }}>
                        {getCategoryIcon(value.category)}
                      </Box>
                    ) : (
                      <SearchIcon fontSize="small" color="action" />
                    )}
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string }
          const specsCount = option.required_specifications?.length || 0
          const docsCount = option.required_documents?.length || 0
          const checklistCount = option.submission_checklist?.length || 0
          const catColor = getCategoryColor(option.category)

          return (
            <li key={key} {...rest}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', py: 0.5 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    bgcolor: alpha(catColor, 0.1),
                    color: catColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getCategoryIcon(option.category)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {option.name_he}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
                    {specsCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <SettingsIcon sx={{ fontSize: 12 }} /> {specsCount}
                      </Typography>
                    )}
                    {docsCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <DescriptionIcon sx={{ fontSize: 12 }} /> {docsCount}
                      </Typography>
                    )}
                    {checklistCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <ChecklistIcon sx={{ fontSize: 12 }} /> {checklistCount}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </li>
          )
        }}
        renderGroup={(params) => {
          const originalKey = categoryKeyMap.get(params.group) || null
          const catColor = getCategoryColor(originalKey)
          return (
            <li key={params.key}>
              <Box
                sx={{
                  position: 'sticky',
                  top: -8,
                  px: 2,
                  py: 0.75,
                  bgcolor: alpha(catColor, 0.06),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  zIndex: 1,
                }}
              >
                <Box sx={{ color: catColor, display: 'flex' }}>
                  {getCategoryIcon(originalKey)}
                </Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                  {params.group}
                </Typography>
              </Box>
              <ul style={{ padding: 0 }}>{params.children}</ul>
            </li>
          )
        }}
        noOptionsText={noOptionsTextProp || t('templatePicker.noResults')}
        sx={{
          '& .MuiAutocomplete-listbox': {
            maxHeight: 350,
            '& .MuiAutocomplete-option': {
              px: 2,
              py: 0.75,
              borderRadius: 1.5,
              mx: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
              '&.Mui-focused': { bgcolor: 'action.selected' },
            },
          },
        }}
      />

      {/* Selected template preview card */}
      {value && (
        <Box
          sx={{
            mt: 1.5,
            p: 0,
            borderRadius: 3,
            border: '1px solid',
            borderColor: alpha(getCategoryColor(value.category), 0.3),
            bgcolor: alpha(getCategoryColor(value.category), 0.04),
            overflow: 'hidden',
          }}
        >
          {/* Card header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              p: 1.5,
              borderBottom: '1px solid',
              borderColor: alpha(getCategoryColor(value.category), 0.15),
            }}
          >
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
            <IconButton
              size="small"
              onClick={() => onChange(null)}
              sx={{ color: 'text.secondary', flexShrink: 0 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* Stats row */}
          <Box sx={{ display: 'flex', justifyContent: 'space-around', p: 1.5 }}>
            {(value.required_specifications?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <SettingsIcon sx={{ fontSize: 16, color: theme.palette.primary.main }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.required_specifications.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {t('templatePicker.specs')}
                </Typography>
              </Box>
            )}
            {(value.required_documents?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <DescriptionIcon sx={{ fontSize: 16, color: theme.palette.warning.main }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.required_documents.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {t('templatePicker.docs')}
                </Typography>
              </Box>
            )}
            {(value.submission_checklist?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                  <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.submission_checklist.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {t('templatePicker.checks')}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
