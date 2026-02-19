import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { areasApi } from '../../api/areas'
import type { ConstructionArea } from '../../types'
import { Autocomplete, TextField, Box, Typography, Chip } from '@/mui'
import { AccountTreeIcon } from '@/icons'

interface AreaPickerAutocompleteProps {
  value: string | null
  onChange: (areaId: string | null, area: ConstructionArea | null) => void
  projectId: string
  label?: string
  required?: boolean
  disabled?: boolean
}

interface FlatArea extends ConstructionArea {
  path: string
}

function flattenAreas(areas: ConstructionArea[], pathParts: string[] = []): FlatArea[] {
  const result: FlatArea[] = []
  for (const area of areas) {
    const currentPath = [...pathParts, area.name]
    result.push({ ...area, path: currentPath.join(' > ') })
    if (area.children && area.children.length > 0) {
      result.push(...flattenAreas(area.children, currentPath))
    }
  }
  return result
}

export function AreaPickerAutocomplete({
  value,
  onChange,
  projectId,
  label,
  required = false,
  disabled = false,
}: AreaPickerAutocompleteProps) {
  const { t } = useTranslation()
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    areasApi.list(projectId)
      .then(setAreas)
      .catch(() => setAreas([]))
      .finally(() => setLoading(false))
  }, [projectId])

  const flatOptions = useMemo(() => flattenAreas(areas), [areas])

  const selectedOption = useMemo(
    () => flatOptions.find((opt) => opt.id === value) || null,
    [flatOptions, value]
  )

  return (
    <Autocomplete
      options={flatOptions}
      getOptionLabel={(opt) => opt.name}
      groupBy={(opt) => opt.areaLevel ? t(`areaLevels.${opt.areaLevel}`, opt.areaLevel) : ''}
      value={selectedOption}
      onChange={(_, val) => onChange(val?.id || null, val || null)}
      loading={loading}
      disabled={disabled}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderOption={(props, option) => {
        const { key, ...rest } = props as { key: string } & Record<string, unknown>
        return (
          <Box
            component="li"
            key={key}
            {...rest}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}
          >
            <AccountTreeIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" fontWeight={500} noWrap>
                {option.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {option.path}
              </Typography>
            </Box>
          </Box>
        )
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label || t('areaChecklists.selectArea')}
          required={required}
          InputProps={{
            ...params.InputProps,
            startAdornment: selectedOption ? (
              <>
                <Chip
                  label={selectedOption.path}
                  size="small"
                  icon={<AccountTreeIcon sx={{ fontSize: 14 }} />}
                  sx={{ mr: 0.5, maxWidth: 200, fontSize: '0.7rem' }}
                  onDelete={() => onChange(null, null)}
                />
                {params.InputProps.startAdornment}
              </>
            ) : params.InputProps.startAdornment,
          }}
        />
      )}
      noOptionsText={t('areaChecklists.noChecklists')}
      fullWidth
    />
  )
}
