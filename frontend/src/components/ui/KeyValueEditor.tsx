import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AddCircleOutlineIcon, DeleteOutlineIcon, TuneIcon, LockIcon } from '@/icons'
import { Box, Typography, IconButton, TextField as MuiTextField, MenuItem, Chip, Tooltip } from '@/mui'

type ValueType = 'text' | 'number' | 'boolean' | 'date' | 'select'

interface KeyValuePair {
  key: string
  value: string | number | boolean
  type: ValueType
  locked?: boolean
  isTemplate?: boolean
  options?: string[]
}

interface KeyValueEditorProps {
  entries: KeyValuePair[]
  onChange: (entries: KeyValuePair[]) => void
  label?: string
}

export type { KeyValuePair }

export default function KeyValueEditor({ entries, onChange, label }: KeyValueEditorProps) {
  const { t } = useTranslation()
  const [newKey, setNewKey] = useState('')
  const [newType, setNewType] = useState<ValueType>('text')

  const handleAdd = () => {
    if (!newKey.trim()) return
    if (entries.some(e => e.key === newKey.trim())) return
    const defaultValue = newType === 'number' ? 0 : newType === 'boolean' ? false : ''
    onChange([...entries, { key: newKey.trim(), value: defaultValue, type: newType }])
    setNewKey('')
    setNewType('text')
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
        placeholder={t('keyValueEditor.valuePlaceholder')}
        value={entry.value}
        onChange={(e) => {
          const val = entry.type === 'number' ? Number(e.target.value) : e.target.value
          handleValueChange(index, val)
        }}
      />
    )
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

      {entries.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
          {entries.map((entry, index) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                bgcolor: entry.isTemplate ? 'primary.50' : 'action.hover',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: entry.isTemplate ? 'primary.200' : 'divider',
              }}
            >
              <Box sx={{ flex: '0 0 auto', minWidth: 100, maxWidth: 160 }}>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {t('keyValueEditor.key')}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {entry.key}
                  </Typography>
                  {entry.isTemplate && (
                    <Tooltip title={t('keyValueEditor.templateField')}>
                      <LockIcon sx={{ fontSize: 12, color: 'primary.main' }} />
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Box sx={{ flex: 1 }}>
                {renderValueField(entry, index)}
              </Box>

              <Chip
                label={entry.type}
                size="small"
                variant="outlined"
                color={entry.isTemplate ? 'primary' : 'default'}
                sx={{ height: 20, fontSize: 10, minWidth: 45 }}
              />

              {!entry.locked && (
                <Tooltip title={t('common.delete')}>
                  <IconButton size="small" color="error" onClick={() => handleRemove(index)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {entry.locked && <Box sx={{ width: 28 }} />}
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
