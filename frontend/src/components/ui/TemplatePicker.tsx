import { useState, useMemo } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import MuiTextField from '@mui/material/TextField'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import DescriptionIcon from '@mui/icons-material/Description'
import SettingsIcon from '@mui/icons-material/Settings'
import ChecklistIcon from '@mui/icons-material/Checklist'
import FoundationIcon from '@mui/icons-material/Foundation'
import PlumbingIcon from '@mui/icons-material/Plumbing'
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices'
import AcUnitIcon from '@mui/icons-material/AcUnit'
import FireExtinguisherIcon from '@mui/icons-material/FireExtinguisher'
import DoorFrontIcon from '@mui/icons-material/DoorFront'
import SecurityIcon from '@mui/icons-material/Security'
import ElevatorIcon from '@mui/icons-material/Elevator'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import KitchenIcon from '@mui/icons-material/Kitchen'
import DeckIcon from '@mui/icons-material/Deck'
import WindowIcon from '@mui/icons-material/Window'
import PersonIcon from '@mui/icons-material/Person'
import FormatPaintIcon from '@mui/icons-material/FormatPaint'
import InventoryIcon from '@mui/icons-material/Inventory'
import WaterDropIcon from '@mui/icons-material/WaterDrop'
import ThermostatIcon from '@mui/icons-material/Thermostat'
import SquareFootIcon from '@mui/icons-material/SquareFoot'
import RoofingIcon from '@mui/icons-material/Roofing'
import BathtubIcon from '@mui/icons-material/Bathtub'
import CableIcon from '@mui/icons-material/Cable'
import GridViewIcon from '@mui/icons-material/GridView'
import CategoryIcon from '@mui/icons-material/Category'
import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'

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
  plumbing: '#1976D2',
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

function formatCategory(category: string | null): string {
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
}: TemplatePickerProps<T>) {
  const { t } = useTranslation()
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
      {/* Category filter chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
        <Chip
          label={t('common.all')}
          size="small"
          variant={categoryFilter === null ? 'filled' : 'outlined'}
          color={categoryFilter === null ? 'primary' : 'default'}
          onClick={() => setCategoryFilter(null)}
          sx={{ fontWeight: categoryFilter === null ? 600 : 400, cursor: 'pointer' }}
        />
        {categories.map(([cat, count]) => (
          <Chip
            key={cat}
            icon={getCategoryIcon(cat)}
            label={`${formatCategory(cat)} (${count})`}
            size="small"
            variant={categoryFilter === cat ? 'filled' : 'outlined'}
            onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
            sx={{
              cursor: 'pointer',
              fontWeight: categoryFilter === cat ? 600 : 400,
              ...(categoryFilter === cat && {
                bgcolor: getCategoryColor(cat),
                color: '#fff',
                '& .MuiChip-icon': { color: '#fff' },
              }),
            }}
          />
        ))}
      </Box>

      {/* Autocomplete */}
      <Autocomplete
        options={sortedTemplates}
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        groupBy={(option) => formatCategory(option.category)}
        getOptionLabel={(option) => option.name_he}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        PaperComponent={(props) => (
          <Paper {...props} elevation={8} sx={{ borderRadius: 2, mt: 0.5 }} />
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
          />
        )}
        renderOption={(props, option) => {
          const { key, ...rest } = props as React.HTMLAttributes<HTMLLIElement> & { key: string }
          const specsCount = option.required_specifications?.length || 0
          const docsCount = option.required_documents?.length || 0
          const checklistCount = option.submission_checklist?.length || 0

          return (
            <li key={key} {...rest}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', py: 0.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.5,
                    bgcolor: `${getCategoryColor(option.category)}18`,
                    color: getCategoryColor(option.category),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getCategoryIcon(option.category)}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500} noWrap>
                    {option.name_he}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, mt: 0.25 }}>
                    {specsCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <SettingsIcon sx={{ fontSize: 11 }} /> {specsCount}
                      </Typography>
                    )}
                    {docsCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <DescriptionIcon sx={{ fontSize: 11 }} /> {docsCount}
                      </Typography>
                    )}
                    {checklistCount > 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                        <ChecklistIcon sx={{ fontSize: 11 }} /> {checklistCount}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            </li>
          )
        }}
        renderGroup={(params) => (
          <li key={params.key}>
            <Box
              sx={{
                position: 'sticky',
                top: -8,
                px: 2,
                py: 1,
                bgcolor: 'background.default',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                zIndex: 1,
              }}
            >
              <Box sx={{ color: getCategoryColor(params.group.toLowerCase().replace(/ /g, '_')), display: 'flex' }}>
                {getCategoryIcon(params.group.toLowerCase().replace(/ /g, '_'))}
              </Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
                {params.group}
              </Typography>
            </Box>
            <ul style={{ padding: 0 }}>{params.children}</ul>
          </li>
        )}
        noOptionsText={t('materials.noMaterialsFound')}
        sx={{
          '& .MuiAutocomplete-listbox': {
            maxHeight: 350,
            '& .MuiAutocomplete-option': {
              px: 2,
              py: 0.75,
              borderRadius: 1,
              mx: 0.5,
              '&:hover': { bgcolor: 'action.hover' },
              '&.Mui-focused': { bgcolor: 'action.selected' },
            },
          },
        }}
      />

      {/* Preview card when template selected */}
      {value && (
        <Box
          sx={{
            mt: 1.5,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'action.hover',
            display: 'flex',
            gap: 2,
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: `${getCategoryColor(value.category)}18`,
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
            <Typography variant="body2" fontWeight={600}>{value.name_he}</Typography>
            {value.description && (
              <Typography variant="caption" color="text.secondary" noWrap>{value.description}</Typography>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
            {(value.required_specifications?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'primary.main' }}>
                  <SettingsIcon sx={{ fontSize: 16 }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.required_specifications.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {t('templatePicker.specs')}
                </Typography>
              </Box>
            )}
            {(value.required_documents?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'warning.main' }}>
                  <DescriptionIcon sx={{ fontSize: 16 }} />
                  <Typography variant="subtitle2" fontWeight={700}>{value.required_documents.length}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {t('templatePicker.docs')}
                </Typography>
              </Box>
            )}
            {(value.submission_checklist?.length || 0) > 0 && (
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'success.main' }}>
                  <ChecklistIcon sx={{ fontSize: 16 }} />
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
