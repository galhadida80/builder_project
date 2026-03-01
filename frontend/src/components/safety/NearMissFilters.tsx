import { useTranslation } from 'react-i18next'
import { SearchField } from '../ui/TextField'
import { Box, TextField as MuiTextField, MenuItem } from '@/mui'

interface NearMissFiltersProps {
  severityFilter: string
  anonymousFilter: string
  searchQuery: string
  onSeverityChange: (value: string) => void
  onAnonymousChange: (value: string) => void
  onSearchChange: (value: string) => void
}

export function NearMissFilters({
  severityFilter,
  anonymousFilter,
  searchQuery,
  onSeverityChange,
  onAnonymousChange,
  onSearchChange,
}: NearMissFiltersProps) {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        gap: 1,
        mb: 2,
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <MuiTextField
          select
          size="small"
          value={severityFilter}
          onChange={(e) => onSeverityChange(e.target.value)}
          label={t('safety.severity')}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">{t('common.all')}</MenuItem>
          <MenuItem value="high">{t('safety.high')}</MenuItem>
          <MenuItem value="medium">{t('safety.medium')}</MenuItem>
          <MenuItem value="low">{t('safety.low')}</MenuItem>
        </MuiTextField>

        <MuiTextField
          select
          size="small"
          value={anonymousFilter}
          onChange={(e) => onAnonymousChange(e.target.value)}
          label={t('safety.reportType')}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">{t('common.all')}</MenuItem>
          <MenuItem value="anonymous">{t('safety.anonymous')}</MenuItem>
          <MenuItem value="identified">{t('safety.identified')}</MenuItem>
        </MuiTextField>

        <SearchField
          placeholder={t('safety.searchNearMisses')}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </Box>
    </Box>
  )
}
