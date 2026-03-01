import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Paper, Typography, MenuItem, IconButton, Collapse, useTheme, useMediaQuery } from '@/mui'
import { TextField as MuiTextField } from '@/mui'
import { SearchField } from '../ui/TextField'
import FilterChips from '../ui/FilterChips'
import { FilterListIcon, ExpandMoreIcon } from '@/icons'
import type { DefectStatus, DefectSeverity, DefectCategory } from '@/types'

interface PinFilterPanelProps {
  statusFilter: DefectStatus | 'all'
  onStatusChange: (status: DefectStatus | 'all') => void
  categoryFilter: DefectCategory | 'all'
  onCategoryChange: (category: DefectCategory | 'all') => void
  severityFilter: DefectSeverity | 'all'
  onSeverityChange: (severity: DefectSeverity | 'all') => void
  searchQuery: string
  onSearchChange: (query: string) => void
  statusCounts?: {
    all: number
    open: number
    in_progress: number
    resolved: number
    closed: number
  }
}

const DEFECT_CATEGORIES: DefectCategory[] = [
  'concrete_structure',
  'structural',
  'wet_room_waterproofing',
  'plaster',
  'roof',
  'roof_waterproofing',
  'painting',
  'plumbing',
  'flooring',
  'tiling',
  'fire_passage_sealing',
  'fire_safety',
  'building_general',
  'moisture',
  'waterproofing',
  'insulation',
  'hvac',
  'electrical',
  'lighting',
  'solar_system',
  'windows_doors',
  'drainage',
  'elevator',
  'gas',
  'accessibility',
  'exterior_cladding',
  'landscaping',
  'other',
]

export function PinFilterPanel({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  severityFilter,
  onSeverityChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: PinFilterPanelProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const statusChips = [
    { label: t('defects.allStatuses'), value: 'all', count: statusCounts?.all },
    { label: t('defects.statusOpen'), value: 'open', count: statusCounts?.open },
    { label: t('defects.statusInProgress'), value: 'in_progress', count: statusCounts?.in_progress },
    { label: t('defects.statusResolved'), value: 'resolved', count: statusCounts?.resolved },
    { label: t('defects.statusClosed'), value: 'closed', count: statusCounts?.closed },
  ]

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      {/* Status Filter Chips */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {t('floorplans.filterByStatus')}
        </Typography>
        <FilterChips
          items={statusChips}
          value={statusFilter}
          onChange={(value) => onStatusChange(value as DefectStatus | 'all')}
        />
      </Box>

      {/* Search Field */}
      <Box sx={{ mb: 2 }}>
        <SearchField
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('floorplans.searchPins')}
        />
      </Box>

      {/* Advanced Filters Toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
          {t('floorplans.advancedFilters')}
        </Typography>
        <IconButton
          size="small"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          sx={{
            transform: advancedOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
      </Box>

      {/* Advanced Filters */}
      <Collapse in={advancedOpen}>
        <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, pt: 1 }}>
          {/* Category Filter */}
          <MuiTextField
            select
            fullWidth
            label={t('defects.category')}
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value as DefectCategory | 'all')}
            size="small"
          >
            <MenuItem value="all">{t('defects.allCategories')}</MenuItem>
            {DEFECT_CATEGORIES.map((category) => (
              <MenuItem key={category} value={category}>
                {t(`defects.categories.${category}`)}
              </MenuItem>
            ))}
          </MuiTextField>

          {/* Severity Filter */}
          <MuiTextField
            select
            fullWidth
            label={t('defects.severity')}
            value={severityFilter}
            onChange={(e) => onSeverityChange(e.target.value as DefectSeverity | 'all')}
            size="small"
          >
            <MenuItem value="all">{t('defects.allSeverities')}</MenuItem>
            <MenuItem value="critical">{t('defects.severityCritical')}</MenuItem>
            <MenuItem value="high">{t('defects.severityHigh')}</MenuItem>
            <MenuItem value="medium">{t('defects.severityMedium')}</MenuItem>
            <MenuItem value="low">{t('defects.severityLow')}</MenuItem>
          </MuiTextField>
        </Box>
      </Collapse>
    </Paper>
  )
}
