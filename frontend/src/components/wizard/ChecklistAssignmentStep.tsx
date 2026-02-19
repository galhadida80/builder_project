import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { ChecklistIcon } from '@/icons'
import {
  Box,
  Typography,
  Autocomplete,
  TextField,
  Chip,
  Switch,
  FormControlLabel,
  CardContent,
  Alert,
} from '@/mui'
import type { ChecklistTemplate } from '../../types'

interface ChecklistAssignmentStepProps {
  areaTypes: string[]
  assignments: Record<string, string[]>
  templates: ChecklistTemplate[]
  onAssign: (areaType: string, templateIds: string[]) => void
  autoAssign: boolean
  onAutoAssignChange: (value: boolean) => void
}

export function ChecklistAssignmentStep({
  areaTypes,
  assignments,
  templates,
  onAssign,
  autoAssign,
  onAutoAssignChange,
}: ChecklistAssignmentStepProps) {
  const { t } = useTranslation()

  function getTemplateById(id: string): ChecklistTemplate | undefined {
    return templates.find((tmpl) => tmpl.id === id)
  }

  function getSelectedTemplates(areaType: string): ChecklistTemplate[] {
    const ids = assignments[areaType] || []
    return ids.map(getTemplateById).filter(Boolean) as ChecklistTemplate[]
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Alert severity="info" sx={{ mb: 1 }}>
        <Typography variant="body2">
          {t('structureWizard.assignTemplatesDescription')}
        </Typography>
      </Alert>

      <FormControlLabel
        control={
          <Switch
            checked={autoAssign}
            onChange={(e) => onAutoAssignChange(e.target.checked)}
          />
        }
        label={t('structureWizard.assignTemplates')}
        sx={{ mb: 1 }}
      />

      {areaTypes.map((areaType) => (
        <Card key={areaType}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <ChecklistIcon color="primary" fontSize="small" />
              <Typography variant="subtitle2" fontWeight={600}>
                {t(`areas.types.${areaType}`, { defaultValue: areaType })}
              </Typography>
            </Box>

            <Autocomplete
              multiple
              size="small"
              options={templates}
              value={getSelectedTemplates(areaType)}
              onChange={(_, newValue) => onAssign(areaType, newValue.map((v) => v.id))}
              getOptionLabel={(option) => option.name}
              groupBy={(option) => option.group || ''}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              renderTags={(value, getTagProps) =>
                value.map((option, tagIndex) => (
                  <Chip
                    {...getTagProps({ index: tagIndex })}
                    key={option.id}
                    label={option.name}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={t('structureWizard.assignTemplates')}
                  placeholder={templates.length > 0 ? '' : ''}
                />
              )}
              noOptionsText={t('emptyState.noResultsFound')}
            />
          </CardContent>
        </Card>
      ))}

      {areaTypes.length === 0 && (
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
          {t('structureWizard.noBuildingsDescription')}
        </Typography>
      )}
    </Box>
  )
}
