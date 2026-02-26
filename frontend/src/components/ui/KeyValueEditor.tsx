import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AddCircleOutlineIcon, DeleteOutlineIcon, TuneIcon, LockIcon, ExpandMoreIcon, ExpandLessIcon } from '@/icons'
import { Box, Typography, IconButton, TextField as MuiTextField, MenuItem, Chip, Tooltip, Collapse } from '@/mui'

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

export default function KeyValueEditor({ entries, onChange, label, suggestions }: KeyValueEditorProps) {
  const { t } = useTranslation()
  const [newKey, setNewKey] = useState('')
  const [newType, setNewType] = useState<ValueType>('text')
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false)

  const usedKeys = new Set(entries.map(e => e.key))

  const availableSuggestions = suggestions?.filter(s => !usedKeys.has(s.key)) || []
  const suggestionCategories = [...new Set(availableSuggestions.map(s => s.category))]

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
          endAdornment: <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap' }}>{entry.unit}</Typography>,
        } : undefined}
      />
    )
  }

  const getEntryLabel = (entry: KeyValuePair) => {
    const suggestion = suggestions?.find(s => s.key === entry.key)
    if (suggestion) return t(suggestion.labelKey)
    return entry.key
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <TuneIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600}>
          {label || t('keyValueEditor.title')}
        </Typography>
        <Chip label={entries.length} size="small" color="default" sx={{ height: 20, fontSize: 11 }} />
      </Box>

      {suggestions && availableSuggestions.length > 0 && (
        <Box sx={{ mb: 1.5 }}>
          <Box
            onClick={() => setSuggestionsExpanded(!suggestionsExpanded)}
            sx={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 1,
              bgcolor: 'action.hover',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <Typography variant="caption" fontWeight={600} color="primary.main">
              {t('keyValueEditor.quickAdd')} ({availableSuggestions.length})
            </Typography>
            {suggestionsExpanded ? <ExpandLessIcon fontSize="small" color="primary" /> : <ExpandMoreIcon fontSize="small" color="primary" />}
          </Box>

          <Collapse in={suggestionsExpanded}>
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {suggestionCategories.map(category => (
                <Box key={category}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block', textTransform: 'uppercase', fontSize: 10 }}>
                    {t(`customProps.categories.${category}`)}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {availableSuggestions
                      .filter(s => s.category === category)
                      .map(suggestion => (
                        <Chip
                          key={suggestion.key}
                          label={`${t(suggestion.labelKey)}${suggestion.unit ? ` (${suggestion.unit})` : ''}`}
                          size="small"
                          variant="outlined"
                          color="primary"
                          onClick={() => handleAddSuggestion(suggestion)}
                          sx={{
                            height: 26,
                            fontSize: 11,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.selected', borderColor: 'primary.main' },
                          }}
                        />
                      ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {entries.length > 0 && (
        <Box sx={{ mb: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          {/* Table header - desktop only */}
          <Box
            sx={{
              display: { xs: 'none', sm: 'grid' },
              gridTemplateColumns: '140px 1fr 70px 40px',
              gap: 1,
              px: 1.5,
              py: 0.75,
              bgcolor: 'action.hover',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {t('keyValueEditor.property')}
            </Typography>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {t('keyValueEditor.value')}
            </Typography>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {t('keyValueEditor.type')}
            </Typography>
            <Box />
          </Box>

          {/* Table rows */}
          {entries.map((entry, index) => (
            <Box
              key={index}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr auto auto', sm: '140px 1fr 70px 40px' },
                gap: { xs: 0.5, sm: 1 },
                alignItems: 'center',
                px: 1.5,
                py: 1,
                borderBottom: index < entries.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
                bgcolor: entry.isTemplate ? 'action.selected' : 'transparent',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              {/* Property name */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, order: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap sx={{ fontSize: { xs: 12, sm: 13 } }}>
                  {getEntryLabel(entry)}
                </Typography>
                {entry.isTemplate && (
                  <Tooltip title={t('keyValueEditor.templateField')}>
                    <LockIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                  </Tooltip>
                )}
              </Box>

              {/* Value field - on mobile goes to second row spanning all columns */}
              <Box sx={{ order: { xs: 1, sm: 0 }, gridColumn: { xs: '1 / -1', sm: 'auto' } }}>
                {renderValueField(entry, index)}
              </Box>

              {/* Type chip */}
              <Chip
                label={getTypeLabel(entry.type)}
                size="small"
                variant="outlined"
                color={entry.isTemplate ? 'primary' : 'default'}
                sx={{ height: 22, fontSize: 10, minWidth: 45, order: 0, justifySelf: 'center' }}
              />

              {/* Delete / lock placeholder */}
              <Box sx={{ order: 0, justifySelf: 'center' }}>
                {!entry.locked ? (
                  <IconButton size="small" color="error" aria-label={t('common.delete')} onClick={() => handleRemove(index)} sx={{ p: 0.25 }}>
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                ) : (
                  <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                )}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1,
          bgcolor: 'background.paper',
          borderRadius: 1.5,
          border: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <MuiTextField
          size="small"
          placeholder={t('keyValueEditor.keyPlaceholder')}
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{ flex: 1 }}
        />
        <MuiTextField
          select
          size="small"
          value={newType}
          onChange={(e) => setNewType(e.target.value as ValueType)}
          sx={{ width: 100 }}
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
            >
              <AddCircleOutlineIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  )
}
