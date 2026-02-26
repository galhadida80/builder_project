import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AddCircleOutlineIcon, DeleteOutlineIcon, TuneIcon, LockIcon, AddIcon } from '@/icons'
import { Box, Typography, IconButton, TextField as MuiTextField, MenuItem, Chip, Tooltip, alpha } from '@/mui'
import { useTheme } from '@/mui'

type ValueType = 'text' | 'number' | 'boolean' | 'date' | 'select'

interface KeyValuePair {
  key: string
  value: string | number | boolean
  type: ValueType
  locked?: boolean
  isTemplate?: boolean
  options?: string[]
  unit?: string
}

interface SuggestedProperty {
  key: string
  labelKey: string
  type: ValueType
  unit?: string
  options?: string[]
  category: string
}

interface KeyValueEditorProps {
  entries: KeyValuePair[]
  onChange: (entries: KeyValuePair[]) => void
  label?: string
  suggestions?: SuggestedProperty[]
}

export type { KeyValuePair, SuggestedProperty }

export const EQUIPMENT_SUGGESTIONS: SuggestedProperty[] = [
  { key: 'weight', labelKey: 'customProps.weight', type: 'number', unit: 'kg', category: 'physical' },
  { key: 'length', labelKey: 'customProps.length', type: 'number', unit: 'm', category: 'physical' },
  { key: 'width', labelKey: 'customProps.width', type: 'number', unit: 'm', category: 'physical' },
  { key: 'height', labelKey: 'customProps.height', type: 'number', unit: 'm', category: 'physical' },
  { key: 'color', labelKey: 'customProps.color', type: 'text', category: 'physical' },
  { key: 'material', labelKey: 'customProps.material', type: 'text', category: 'physical' },
  { key: 'voltage', labelKey: 'customProps.voltage', type: 'number', unit: 'V', category: 'electrical' },
  { key: 'power', labelKey: 'customProps.power', type: 'number', unit: 'kW', category: 'electrical' },
  { key: 'phase', labelKey: 'customProps.phase', type: 'select', options: ['1', '3'], category: 'electrical' },
  { key: 'frequency', labelKey: 'customProps.frequency', type: 'number', unit: 'Hz', category: 'electrical' },
  { key: 'current', labelKey: 'customProps.current', type: 'number', unit: 'A', category: 'electrical' },
  { key: 'capacity', labelKey: 'customProps.capacity', type: 'number', category: 'performance' },
  { key: 'flowRate', labelKey: 'customProps.flowRate', type: 'number', unit: 'L/min', category: 'performance' },
  { key: 'pressure', labelKey: 'customProps.pressure', type: 'number', unit: 'bar', category: 'performance' },
  { key: 'speed', labelKey: 'customProps.speed', type: 'number', unit: 'RPM', category: 'performance' },
  { key: 'noiseLevel', labelKey: 'customProps.noiseLevel', type: 'number', unit: 'dB', category: 'performance' },
  { key: 'ceCertified', labelKey: 'customProps.ceCertified', type: 'boolean', category: 'compliance' },
  { key: 'isoStandard', labelKey: 'customProps.isoStandard', type: 'text', category: 'compliance' },
  { key: 'fireRating', labelKey: 'customProps.fireRating', type: 'text', category: 'compliance' },
  { key: 'ipRating', labelKey: 'customProps.ipRating', type: 'text', category: 'compliance' },
  { key: 'warrantyPeriod', labelKey: 'customProps.warrantyPeriod', type: 'text', category: 'compliance' },
]

export const MATERIAL_SUGGESTIONS: SuggestedProperty[] = [
  { key: 'weight', labelKey: 'customProps.weight', type: 'number', unit: 'kg', category: 'physical' },
  { key: 'length', labelKey: 'customProps.length', type: 'number', unit: 'm', category: 'physical' },
  { key: 'width', labelKey: 'customProps.width', type: 'number', unit: 'm', category: 'physical' },
  { key: 'thickness', labelKey: 'customProps.thickness', type: 'number', unit: 'mm', category: 'physical' },
  { key: 'color', labelKey: 'customProps.color', type: 'text', category: 'physical' },
  { key: 'density', labelKey: 'customProps.density', type: 'number', unit: 'kg/m3', category: 'physical' },
  { key: 'grade', labelKey: 'customProps.grade', type: 'text', category: 'specs' },
  { key: 'standard', labelKey: 'customProps.standard', type: 'text', category: 'specs' },
  { key: 'strength', labelKey: 'customProps.strength', type: 'number', unit: 'MPa', category: 'specs' },
  { key: 'hardness', labelKey: 'customProps.hardness', type: 'text', category: 'specs' },
  { key: 'tolerance', labelKey: 'customProps.tolerance', type: 'text', category: 'specs' },
  { key: 'finish', labelKey: 'customProps.finish', type: 'text', category: 'specs' },
  { key: 'ceCertified', labelKey: 'customProps.ceCertified', type: 'boolean', category: 'compliance' },
  { key: 'isoStandard', labelKey: 'customProps.isoStandard', type: 'text', category: 'compliance' },
  { key: 'fireRating', labelKey: 'customProps.fireRating', type: 'text', category: 'compliance' },
  { key: 'environmentalRating', labelKey: 'customProps.environmentalRating', type: 'text', category: 'compliance' },
  { key: 'shelfLife', labelKey: 'customProps.shelfLife', type: 'text', category: 'storage' },
  { key: 'maxStackHeight', labelKey: 'customProps.maxStackHeight', type: 'number', unit: 'm', category: 'storage' },
  { key: 'temperatureRange', labelKey: 'customProps.temperatureRange', type: 'text', category: 'storage' },
  { key: 'humidityRange', labelKey: 'customProps.humidityRange', type: 'text', category: 'storage' },
]

const CATEGORY_COLORS: Record<string, string> = {
  physical: '#2196F3',
  electrical: '#F9A825',
  performance: '#4CAF50',
  compliance: '#F44336',
  specs: '#9C27B0',
  storage: '#795548',
}

export default function KeyValueEditor({ entries, onChange, label, suggestions }: KeyValueEditorProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [newKey, setNewKey] = useState('')
  const [newType, setNewType] = useState<ValueType>('text')
  const [activeSuggestionCategory, setActiveSuggestionCategory] = useState<string | null>(null)

  const usedKeys = new Set(entries.map(e => e.key))

  const availableSuggestions = suggestions?.filter(s => !usedKeys.has(s.key)) || []
  const suggestionCategories = [...new Set(availableSuggestions.map(s => s.category))]

  const visibleSuggestions = activeSuggestionCategory
    ? availableSuggestions.filter(s => s.category === activeSuggestionCategory)
    : availableSuggestions.slice(0, 8)

  const handleAdd = () => {
    if (!newKey.trim()) return
    if (entries.some(e => e.key === newKey.trim())) return
    const defaultValue = newType === 'number' ? 0 : newType === 'boolean' ? false : ''
    onChange([...entries, { key: newKey.trim(), value: defaultValue, type: newType }])
    setNewKey('')
    setNewType('text')
  }

  const handleAddSuggestion = (suggestion: SuggestedProperty) => {
    if (usedKeys.has(suggestion.key)) return
    const defaultValue = suggestion.type === 'number' ? 0 : suggestion.type === 'boolean' ? false : ''
    onChange([...entries, {
      key: suggestion.key,
      value: defaultValue,
      type: suggestion.type,
      unit: suggestion.unit,
      options: suggestion.options,
    }])
  }

  const handleRemove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index))
  }

  const handleValueChange = (index: number, value: string | number | boolean) => {
    const updated = [...entries]
    updated[index] = { ...updated[index], value }
    onChange(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const renderValueField = (entry: KeyValuePair, index: number) => {
    if (entry.type === 'boolean') {
      return (
        <MuiTextField
          fullWidth
          select
          size="small"
          value={entry.value ? 'true' : 'false'}
          onChange={(e) => handleValueChange(index, e.target.value === 'true')}
        >
          <MenuItem value="true">{t('common.yes')}</MenuItem>
          <MenuItem value="false">{t('common.no')}</MenuItem>
        </MuiTextField>
      )
    }
    if (entry.type === 'date') {
      return (
        <MuiTextField
          fullWidth
          size="small"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={entry.value || ''}
          onChange={(e) => handleValueChange(index, e.target.value)}
        />
      )
    }
    if (entry.type === 'select' && entry.options) {
      return (
        <MuiTextField
          fullWidth
          select
          size="small"
          value={entry.value || ''}
          onChange={(e) => handleValueChange(index, e.target.value)}
        >
          <MenuItem value="">{t('common.select')}</MenuItem>
          {entry.options.map((opt) => (
            <MenuItem key={opt} value={opt}>{opt}</MenuItem>
          ))}
        </MuiTextField>
      )
    }
    return (
      <MuiTextField
        fullWidth
        size="small"
        type={entry.type === 'number' ? 'number' : 'text'}
        placeholder={entry.unit ? `${t('keyValueEditor.valuePlaceholder')} (${entry.unit})` : t('keyValueEditor.valuePlaceholder')}
        value={entry.value}
        onChange={(e) => {
          const val = entry.type === 'number' ? Number(e.target.value) : e.target.value
          handleValueChange(index, val)
        }}
        InputProps={entry.unit ? {
          endAdornment: (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap', fontWeight: 600 }}>
              {entry.unit}
            </Typography>
          ),
        } : undefined}
      />
    )
  }

  const getEntryLabel = (entry: KeyValuePair) => {
    const suggestion = suggestions?.find(s => s.key === entry.key)
    if (suggestion) return t(suggestion.labelKey)
    return entry.key
  }

  const getTypeLabel = (type: ValueType): string => {
    const map: Record<ValueType, string> = {
      text: t('keyValueEditor.typeText'),
      number: t('keyValueEditor.typeNumber'),
      boolean: t('keyValueEditor.typeBoolean'),
      date: t('keyValueEditor.typeDate'),
      select: t('keyValueEditor.typeSelect'),
    }
    return map[type] || type
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <TuneIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600}>
          {label || t('keyValueEditor.title')}
        </Typography>
        {entries.length > 0 && (
          <Chip label={entries.length} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
        )}
      </Box>

      {/* Quick-add suggestions - always visible */}
      {suggestions && availableSuggestions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {/* Category pills */}
          <Box
            sx={{
              display: 'flex',
              gap: 0.5,
              mb: 1,
              overflowX: 'auto',
              pb: 0.5,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            <Chip
              label={t('keyValueEditor.quickAdd')}
              size="small"
              variant={activeSuggestionCategory === null ? 'filled' : 'outlined'}
              color={activeSuggestionCategory === null ? 'primary' : 'default'}
              onClick={() => setActiveSuggestionCategory(null)}
              sx={{ fontWeight: 600, fontSize: 11, height: 26, flexShrink: 0, borderRadius: '20px' }}
            />
            {suggestionCategories.map(category => {
              const isActive = activeSuggestionCategory === category
              const catColor = CATEGORY_COLORS[category] || theme.palette.primary.main
              return (
                <Chip
                  key={category}
                  label={t(`customProps.categories.${category}`)}
                  size="small"
                  variant={isActive ? 'filled' : 'outlined'}
                  onClick={() => setActiveSuggestionCategory(isActive ? null : category)}
                  sx={{
                    height: 26,
                    fontSize: 11,
                    flexShrink: 0,
                    borderRadius: '20px',
                    ...(isActive && {
                      bgcolor: catColor,
                      color: '#fff',
                      '&:hover': { bgcolor: catColor },
                    }),
                  }}
                />
              )
            })}
          </Box>

          {/* Suggestion chips */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {visibleSuggestions.map(suggestion => {
              const catColor = CATEGORY_COLORS[suggestion.category] || theme.palette.primary.main
              return (
                <Chip
                  key={suggestion.key}
                  icon={<AddIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${t(suggestion.labelKey)}${suggestion.unit ? ` (${suggestion.unit})` : ''}`}
                  size="small"
                  variant="outlined"
                  onClick={() => handleAddSuggestion(suggestion)}
                  sx={{
                    height: 28,
                    fontSize: 11,
                    cursor: 'pointer',
                    borderColor: alpha(catColor, 0.4),
                    color: 'text.primary',
                    '& .MuiChip-icon': { color: catColor },
                    '&:hover': {
                      bgcolor: alpha(catColor, 0.08),
                      borderColor: catColor,
                    },
                  }}
                />
              )
            })}
            {!activeSuggestionCategory && availableSuggestions.length > 8 && (
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', ml: 0.5, fontSize: 11 }}>
                +{availableSuggestions.length - 8}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* Property cards */}
      {entries.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
          {entries.map((entry, index) => {
            const suggestion = suggestions?.find(s => s.key === entry.key)
            const catColor = suggestion ? (CATEGORY_COLORS[suggestion.category] || theme.palette.primary.main) : theme.palette.grey[500]

            return (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  borderRadius: 2.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  borderInlineStart: 3,
                  borderInlineStartColor: catColor,
                  transition: 'box-shadow 150ms',
                  '&:hover': { boxShadow: 1 },
                }}
              >
                {/* Label + type */}
                <Box sx={{ minWidth: { xs: 80, sm: 120 }, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: 13 }}>
                      {getEntryLabel(entry)}
                    </Typography>
                    {entry.isTemplate && (
                      <Tooltip title={t('keyValueEditor.templateField')}>
                        <LockIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>
                    {getTypeLabel(entry.type)}
                  </Typography>
                </Box>

                {/* Value field */}
                <Box sx={{ flex: 1 }}>
                  {renderValueField(entry, index)}
                </Box>

                {/* Delete */}
                {!entry.locked ? (
                  <IconButton
                    size="small"
                    color="error"
                    aria-label={t('common.delete')}
                    onClick={() => handleRemove(index)}
                    sx={{ p: 0.5, flexShrink: 0 }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                ) : (
                  <LockIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                )}
              </Box>
            )
          })}
        </Box>
      )}

      {/* Add custom field row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.25,
          borderRadius: 2.5,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          transition: 'border-color 200ms',
          '&:focus-within': {
            borderColor: 'primary.main',
            bgcolor: alpha(theme.palette.primary.main, 0.04),
          },
        }}
      >
        <MuiTextField
          size="small"
          placeholder={t('keyValueEditor.keyPlaceholder')}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <MuiTextField
          select
          size="small"
          value={newType}
          onChange={(e) => setNewType(e.target.value as ValueType)}
          sx={{ width: 90, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        >
          <MenuItem value="text">{t('keyValueEditor.typeText')}</MenuItem>
          <MenuItem value="number">{t('keyValueEditor.typeNumber')}</MenuItem>
          <MenuItem value="boolean">{t('keyValueEditor.typeBoolean')}</MenuItem>
          <MenuItem value="date">{t('keyValueEditor.typeDate')}</MenuItem>
        </MuiTextField>
        <Tooltip title={t('keyValueEditor.addField')}>
          <span>
            <IconButton
              color="primary"
              aria-label={t('keyValueEditor.addField')}
              onClick={handleAdd}
              disabled={!newKey.trim() || entries.some(e => e.key === newKey.trim())}
              sx={{ p: 0.75 }}
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}
