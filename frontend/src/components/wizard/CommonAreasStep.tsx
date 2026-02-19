import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import {
  AddIcon,
  DeleteIcon,
  LocalParkingIcon,
  DeckIcon,
} from '@/icons'
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  IconButton,
  Fab,
  CardContent,
} from '@/mui'
import type { CommonAreaDefinition } from '../../types'

interface CommonAreasStepProps {
  commonAreas: CommonAreaDefinition[]
  onAdd: () => void
  onUpdate: (index: number, area: CommonAreaDefinition) => void
  onRemove: (index: number) => void
}

const AREA_TYPES = ['parking', 'garden', 'commercial', 'lobby', 'storage', 'playground'] as const

export function CommonAreasStep({ commonAreas, onAdd, onUpdate, onRemove }: CommonAreasStepProps) {
  const { t } = useTranslation()

  if (commonAreas.length === 0) {
    return (
      <Box>
        <EmptyState
          icon={<DeckIcon />}
          title={t('structureWizard.noCommonAreas')}
          description={t('structureWizard.noCommonAreasDescription')}
          action={{ label: t('structureWizard.addCommonArea'), onClick: onAdd }}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 8 }}>
      {commonAreas.map((area, index) => (
        <Card key={index}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalParkingIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {area.name || `${t('structureWizard.commonAreaName')} ${index + 1}`}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => onRemove(index)}
                aria-label={t('structureWizard.removeCommonArea')}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 2,
              }}
            >
              <TextField
                label={t('structureWizard.commonAreaName')}
                value={area.name}
                onChange={(e) => onUpdate(index, { ...area, name: e.target.value })}
                size="small"
                fullWidth
              />

              <TextField
                select
                label={t('structureWizard.commonAreaType')}
                value={area.areaType}
                onChange={(e) => onUpdate(index, { ...area, areaType: e.target.value })}
                size="small"
                fullWidth
              >
                {AREA_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {t(`areas.types.${type}`, { defaultValue: type })}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Fab
        color="primary"
        size="medium"
        onClick={onAdd}
        aria-label={t('structureWizard.addCommonArea')}
        sx={{
          position: { xs: 'fixed', sm: 'relative' },
          bottom: { xs: 80, sm: 'auto' },
          right: { xs: 16, sm: 'auto' },
          alignSelf: { sm: 'flex-start' },
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  )
}
