import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import MuiTextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import TuneIcon from '@mui/icons-material/Tune'
import { useTranslation } from 'react-i18next'

type ValueType = 'text' | 'number' | 'boolean'

interface KeyValuePair {
  key: string
  value: string | number | boolean
  type: ValueType
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <TuneIcon fontSize="small" color="primary" />
        <Typography variant="subtitle2" fontWeight={600}>
          {label || t('keyValueEditor.title')}
        </Typography>
        <Chip label={entries.length} size="small" color="default" sx={{ height: 20, fontSize: 11 }} />
      </Box>

      {/* Existing entries */}
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
                bgcolor: 'action.hover',
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ flex: '0 0 auto', minWidth: 100, maxWidth: 160 }}>
                <Typography variant="caption" color="text.secondary" fontSize={10}>
                  {t('keyValueEditor.key')}
                </Typography>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {entry.key}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                {entry.type === 'boolean' ? (
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
                ) : (
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
                )}
              </Box>

              <Chip
                label={entry.type}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: 10, minWidth: 45 }}
              />

              <Tooltip title={t('common.delete')}>
                <IconButton size="small" color="error" onClick={() => handleRemove(index)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Box>
      )}

      {/* Add new entry row */}
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
