import { useTranslation } from 'react-i18next'
import { Box, Grid, Select as MuiSelect, MenuItem, FormControl, InputLabel } from '@/mui'
import { TextField } from '../ui/TextField'
import FilterChips from '../ui/FilterChips'
import { TemplateType, TemplateTier } from '../../api/marketplace'

interface TemplateFiltersProps {
  searchQuery: string
  templateType: TemplateType | ''
  category: string
  trade: string
  buildingType: string
  tier: TemplateTier | ''
  onSearchChange: (value: string) => void
  onTemplateTypeChange: (value: TemplateType | '') => void
  onCategoryChange: (value: string) => void
  onTradeChange: (value: string) => void
  onBuildingTypeChange: (value: string) => void
  onTierChange: (value: TemplateTier | '') => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function TemplateFilters({
  searchQuery,
  templateType,
  category,
  trade,
  buildingType,
  tier,
  onSearchChange,
  onTemplateTypeChange,
  onCategoryChange,
  onTradeChange,
  onBuildingTypeChange,
  onTierChange,
  onClearFilters,
  hasActiveFilters,
}: TemplateFiltersProps) {
  const { t } = useTranslation()

  const templateTypeOptions: { label: string; value: TemplateType | '' }[] = [
    { label: t('marketplace.allTypes'), value: '' },
    { label: t('marketplace.templateTypes.inspection'), value: 'inspection' },
    { label: t('marketplace.templateTypes.checklist'), value: 'checklist' },
    { label: t('marketplace.templateTypes.safety_form'), value: 'safety_form' },
    { label: t('marketplace.templateTypes.quality_control'), value: 'quality_control' },
    { label: t('marketplace.templateTypes.environmental'), value: 'environmental' },
    { label: t('marketplace.templateTypes.regulatory'), value: 'regulatory' },
  ]

  const categoryOptions = [
    { label: t('marketplace.allCategories'), value: '' },
    { label: t('marketplace.categories.structural'), value: 'structural' },
    { label: t('marketplace.categories.electrical'), value: 'electrical' },
    { label: t('marketplace.categories.plumbing'), value: 'plumbing' },
    { label: t('marketplace.categories.hvac'), value: 'hvac' },
    { label: t('marketplace.categories.fireSafety'), value: 'fire_safety' },
  ]

  const tradeOptions = [
    { label: t('marketplace.allTrades'), value: '' },
    { label: t('marketplace.trades.structural'), value: 'structural' },
    { label: t('marketplace.trades.electrical'), value: 'electrical' },
    { label: t('marketplace.trades.plumbing'), value: 'plumbing' },
    { label: t('marketplace.trades.hvac'), value: 'hvac' },
    { label: t('marketplace.trades.fireSafety'), value: 'fire_safety' },
  ]

  const buildingTypeOptions = [
    { label: t('marketplace.allBuildingTypes'), value: '' },
    { label: t('marketplace.buildingTypes.residential'), value: 'residential' },
    { label: t('marketplace.buildingTypes.commercial'), value: 'commercial' },
    { label: t('marketplace.buildingTypes.industrial'), value: 'industrial' },
    { label: t('marketplace.buildingTypes.mixedUse'), value: 'mixed_use' },
  ]

  const tierFilterItems = [
    { label: t('marketplace.allTiers'), value: '' },
    { label: t('marketplace.free'), value: 'free' },
    { label: t('marketplace.premium'), value: 'premium' },
  ]

  return (
    <Box>
      {/* Search */}
      <TextField
        fullWidth
        placeholder={t('marketplace.searchPlaceholder')}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Tier Filter Chips */}
      <Box sx={{ mb: 2 }}>
        <FilterChips
          items={tierFilterItems}
          value={tier}
          onChange={(value) => onTierChange(value as TemplateTier | '')}
        />
      </Box>

      {/* Filter Dropdowns */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('marketplace.filterTemplateType')}</InputLabel>
            <MuiSelect
              value={templateType}
              label={t('marketplace.filterTemplateType')}
              onChange={(e) => onTemplateTypeChange(e.target.value as TemplateType | '')}
            >
              {templateTypeOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('marketplace.filterCategory')}</InputLabel>
            <MuiSelect
              value={category}
              label={t('marketplace.filterCategory')}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {categoryOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('marketplace.filterTrade')}</InputLabel>
            <MuiSelect
              value={trade}
              label={t('marketplace.filterTrade')}
              onChange={(e) => onTradeChange(e.target.value)}
            >
              {tradeOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size="small">
            <InputLabel>{t('marketplace.filterBuildingType')}</InputLabel>
            <MuiSelect
              value={buildingType}
              label={t('marketplace.filterBuildingType')}
              onChange={(e) => onBuildingTypeChange(e.target.value)}
            >
              {buildingTypeOptions.map((option) => (
                <MenuItem key={option.value || 'all'} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </MuiSelect>
          </FormControl>
        </Grid>
      </Grid>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Box
            component="button"
            onClick={onClearFilters}
            sx={{
              color: 'primary.main',
              fontSize: '0.875rem',
              textDecoration: 'underline',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              padding: 0,
              '&:hover': {
                color: 'primary.dark',
              },
            }}
          >
            {t('marketplace.clearFilters')}
          </Box>
        </Box>
      )}
    </Box>
  )
}
