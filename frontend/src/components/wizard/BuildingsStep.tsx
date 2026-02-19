import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { EmptyState } from '../ui/EmptyState'
import { AddIcon, DeleteIcon, BusinessIcon } from '@/icons'
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  IconButton,
  Fab,
  CardContent,
} from '@/mui'
import type { BuildingDefinition } from '../../types'

interface BuildingsStepProps {
  buildings: BuildingDefinition[]
  onAdd: () => void
  onUpdate: (index: number, building: BuildingDefinition) => void
  onRemove: (index: number) => void
}

export function BuildingsStep({ buildings, onAdd, onUpdate, onRemove }: BuildingsStepProps) {
  const { t } = useTranslation()

  if (buildings.length === 0) {
    return (
      <Box>
        <EmptyState
          icon={<BusinessIcon />}
          title={t('structureWizard.noBuildings')}
          description={t('structureWizard.noBuildingsDescription')}
          action={{ label: t('structureWizard.addBuilding'), onClick: onAdd }}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 8 }}>
      {buildings.map((building, index) => (
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
                <BusinessIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={600}>
                  {building.name || `${t('structureWizard.buildingName')} ${index + 1}`}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={() => onRemove(index)}
                aria-label={t('structureWizard.removeBuilding')}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label={t('structureWizard.buildingName')}
                value={building.name}
                onChange={(e) => onUpdate(index, { ...building, name: e.target.value })}
                size="small"
                fullWidth
              />

              <TextField
                label={t('structureWizard.floorCount')}
                type="number"
                value={building.floorCount}
                onChange={(e) =>
                  onUpdate(index, {
                    ...building,
                    floorCount: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                size="small"
                fullWidth
                inputProps={{ min: 1, max: 200 }}
              />

              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 2 },
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={building.hasBasement}
                      onChange={(e) =>
                        onUpdate(index, { ...building, hasBasement: e.target.checked })
                      }
                      size="small"
                    />
                  }
                  label={t('structureWizard.hasBasement')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={building.hasParking}
                      onChange={(e) =>
                        onUpdate(index, { ...building, hasParking: e.target.checked })
                      }
                      size="small"
                    />
                  }
                  label={t('structureWizard.hasParking')}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={building.hasLobby}
                      onChange={(e) =>
                        onUpdate(index, { ...building, hasLobby: e.target.checked })
                      }
                      size="small"
                    />
                  }
                  label={t('structureWizard.hasLobby')}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}

      <Fab
        color="primary"
        size="medium"
        onClick={onAdd}
        aria-label={t('structureWizard.addBuilding')}
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
