import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AddCircleOutlineIcon, DeleteOutlineIcon, TuneIcon, LockIcon, AddIcon, CloseIcon } from '@/icons'
import { Box, Typography, IconButton, TextField as MuiTextField, MenuItem, Chip, Tooltip, alpha, Dialog, DialogTitle, DialogContent, DialogActions, Button as MuiButton, ButtonBase } from '@/mui'
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

const TYPE_OPTIONS: { value: ValueType; labelKey: string; icon: string }[] = [
  { value: 'text', labelKey: 'keyValueEditor.typeText', icon: 'Aa' },
  { value: 'number', labelKey: 'keyValueEditor.typeNumber', icon: '#' },
  { value: 'date', labelKey: 'keyValueEditor.typeDate', icon: '\uD83D\uDCC5' },
  { value: 'boolean', labelKey: 'keyValueEditor.typeBoolean', icon: '\u2713' },
  { value: 'select', labelKey: 'keyValueEditor.typeSelect', icon: '\u2630' },
]

export default function KeyValueEditor({ entries, onChange, label, suggestions }: KeyValueEditorProps) {
  const { t } = useTranslation()
  const theme = useTheme()
  const [modalOpen, setModalOpen] = useState(false)
  const [customKey, setCustomKey] = useState('')
  const [customType, setCustomType] = useState<ValueType>('text')
  const [selectOptions, setSelectOptions] = useState('')

  const usedKeys = new Set(entries.map(e => e.key))
  const availableSuggestions = suggestions?.filter(s => !usedKeys.has(s.key)) || []

  const groupedSuggestions = availableSuggestions.reduce<Record<string, SuggestedProperty[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = []
    acc[s.category].push(s)
    return acc
  }, {})

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

  const handleAddCustom = () => {
    if (!customKey.trim() || entries.some(e => e.key === customKey.trim())) return
    const defaultValue = customType === 'number' ? 0 : customType === 'boolean' ? false : ''
    const newEntry: KeyValuePair = { key: customKey.trim(), value: defaultValue, type: customType }
    if (customType === 'select' && selectOptions.trim()) {
      newEntry.options = selectOptions.split(',').map(o => o.trim()).filter(Boolean)
    }
    onChange([...entries, newEntry])
    setCustomKey('')
    setCustomType('text')
    setSelectOptions('')
    setModalOpen(false)
  }

  const handleRemove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index))
  }

  const handleValueChange = (index: number, value: string | number | boolean) => {
    const updated = [...entries]
    updated[index] = { ...updated[index], value }
    onChange(updated)
  }

  const renderValueField = (entry: KeyValuePair, index: number) => {
    if (entry.type === 'boolean') {
      return (
        <MuiTextField fullWidth select size="small" value={entry.value ? 'true' : 'false'} onChange={(e) => handleValueChange(index, e.target.value === 'true')}>
          <MenuItem value="true">{t('common.yes')}</MenuItem>
          <MenuItem value="false">{t('common.no')}</MenuItem>
        </MuiTextField>
      )
    }
    if (entry.type === 'date') {
      return <MuiTextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} value={entry.value || ''} onChange={(e) => handleValueChange(index, e.target.value)} />
    }
    if (entry.type === 'select' && entry.options) {
      return (
        <MuiTextField fullWidth select size="small" value={entry.value || ''} onChange={(e) => handleValueChange(index, e.target.value)}>
          <MenuItem value="">{t('common.select')}</MenuItem>
          {entry.options.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
        </MuiTextField>
      )
    }
    return (
      <MuiTextField
        fullWidth
        size="small"
        type={entry.type === 'number' ? 'number' : 'text'}
        placeholder={entry.unit ? `(${entry.unit})` : t('keyValueEditor.valuePlaceholder')}
        value={entry.value}
        onChange={(e) => handleValueChange(index, entry.type === 'number' ? Number(e.target.value) : e.target.value)}
        InputProps={entry.unit ? {
          endAdornment: <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5, whiteSpace: 'nowrap', fontWeight: 600 }}>{entry.unit}</Typography>,
        } : undefined}
        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
        {entries.length > 0 && (
          <Chip label={entries.length} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: 11, fontWeight: 700 }} />
        )}
      </Box>

      {/* Suggested properties as clickable chips */}
      {suggestions && availableSuggestions.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block', fontWeight: 500 }}>
            {t('keyValueEditor.suggestedProperties')}
          </Typography>
          {Object.entries(groupedSuggestions).map(([category, items]) => {
            const catColor = CATEGORY_COLORS[category] || theme.palette.primary.main
            return (
              <Box key={category} sx={{ mb: 1 }}>
                <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: catColor, mb: 0.5, display: 'block' }}>
                  {t(`customProps.categories.${category}`)}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {items.map((suggestion) => (
                    <Chip
                      key={suggestion.key}
                      icon={<AddCircleOutlineIcon sx={{ fontSize: '16px !important', color: `${catColor} !important` }} />}
                      label={`${t(suggestion.labelKey)}${suggestion.unit ? ` (${suggestion.unit})` : ''}`}
                      size="small"
                      variant="outlined"
                      onClick={() => handleAddSuggestion(suggestion)}
                      sx={{
                        cursor: 'pointer',
                        height: 28,
                        fontSize: 11,
                        fontWeight: 500,
                        borderColor: alpha(catColor, 0.3),
                        color: 'text.primary',
                        transition: 'all 150ms',
                        '&:hover': { bgcolor: alpha(catColor, 0.08), borderColor: catColor },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )
          })}
        </Box>
      )}

      {/* Added properties in dashed container */}
      {entries.length > 0 && (
        <Box sx={{
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 3,
          p: 2,
          mb: 2,
        }}>
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5, display: 'block' }}>
            {t('keyValueEditor.title')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {entries.map((entry, index) => (
              <Box key={index}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>
                      {getEntryLabel(entry)}
                    </Typography>
                    {entry.isTemplate && (
                      <Tooltip title={t('keyValueEditor.templateField')}>
                        <LockIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                      </Tooltip>
                    )}
                    <Chip
                      label={TYPE_OPTIONS.find(o => o.value === entry.type)?.icon || entry.type}
                      size="small"
                      sx={{ height: 18, fontSize: 10, fontWeight: 600, bgcolor: 'action.hover', color: 'text.secondary' }}
                    />
                  </Box>
                  {!entry.locked ? (
                    <IconButton size="small" onClick={() => handleRemove(index)} aria-label={t('keyValueEditor.removeProperty')} sx={{ p: 0.25, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  ) : (
                    <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                  )}
                </Box>
                {renderValueField(entry, index)}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Add custom field button — opens modal */}
      <ButtonBase
        onClick={() => setModalOpen(true)}
        sx={{
          width: '100%',
          p: 1.5,
          borderRadius: 3,
          border: '2px dashed',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          color: 'text.secondary',
          transition: 'all 200ms',
          '&:hover': { borderColor: 'primary.main', color: 'primary.main', bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) },
        }}
      >
        <Box sx={{ width: 24, height: 24, borderRadius: 1.5, bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AddIcon sx={{ fontSize: 16 }} />
        </Box>
        <Typography variant="body2" fontWeight={500}>
          {t('keyValueEditor.addCustomField')}
        </Typography>
      </ButtonBase>

      {/* Add Custom Property Modal */}
      <Dialog
        open={modalOpen}
        onClose={() => { setModalOpen(false); setCustomKey(''); setCustomType('text'); setSelectOptions('') }}
        maxWidth="xs"
        fullWidth
        sx={{ zIndex: 1500, '& .MuiDialog-paper': { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 600 }}>
          {t('keyValueEditor.addCustomField')}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          {/* Field name */}
          <MuiTextField
            fullWidth
            size="small"
            label={t('keyValueEditor.property')}
            placeholder={t('keyValueEditor.customKeyPlaceholder')}
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            autoFocus
            sx={{ mb: 2.5, '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
          />

          {/* Type selection as pill buttons */}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
            {t('keyValueEditor.type')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {TYPE_OPTIONS.map((opt) => (
              <ButtonBase
                key={opt.value}
                onClick={() => setCustomType(opt.value)}
                sx={{
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  border: '2px solid',
                  borderColor: customType === opt.value ? 'primary.main' : 'divider',
                  bgcolor: customType === opt.value ? (theme) => alpha(theme.palette.primary.main, 0.08) : 'transparent',
                  color: customType === opt.value ? 'primary.main' : 'text.secondary',
                  fontWeight: customType === opt.value ? 600 : 400,
                  fontSize: 13,
                  transition: 'all 150ms',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <Typography component="span" sx={{ fontSize: 12, lineHeight: 1 }}>{opt.icon}</Typography>
                <Typography component="span" sx={{ fontSize: 13 }}>{t(opt.labelKey)}</Typography>
              </ButtonBase>
            ))}
          </Box>

          {/* Select options input (only when type is select) */}
          {customType === 'select' && (
            <MuiTextField
              fullWidth
              size="small"
              label={t('keyValueEditor.selectOptionsLabel')}
              placeholder={t('keyValueEditor.selectOptionsPlaceholder')}
              value={selectOptions}
              onChange={(e) => setSelectOptions(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <MuiButton
            onClick={() => { setModalOpen(false); setCustomKey(''); setCustomType('text'); setSelectOptions('') }}
            sx={{ borderRadius: 2.5, textTransform: 'none', color: 'text.secondary' }}
          >
            {t('common.cancel')}
          </MuiButton>
          <MuiButton
            variant="contained"
            onClick={handleAddCustom}
            disabled={!customKey.trim() || entries.some(e => e.key === customKey.trim())}
            sx={{
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: 'primary.main',
              boxShadow: 'none',
              '&:hover': { boxShadow: 'none' },
            }}
          >
            {t('keyValueEditor.addField')}
          </MuiButton>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
