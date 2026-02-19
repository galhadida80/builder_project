import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import {
  BusinessIcon,
  HomeIcon,
  ApartmentIcon,
  FoundationIcon,
  AccountTreeIcon,
  ChecklistIcon,
  CheckCircleIcon,
} from '@/icons'
import {
  Box,
  Typography,
  Chip,
  Divider,
  CardContent,
  Paper,
} from '@/mui'
import type { BuildingDefinition, CommonAreaDefinition, ChecklistTemplate } from '../../types'

interface FloorData {
  unitCount: number
  unitType: string
}

interface StructurePreviewProps {
  buildings: BuildingDefinition[]
  floors: Record<number, FloorData[]>
  commonAreas: CommonAreaDefinition[]
  assignments: Record<string, string[]>
  templates: ChecklistTemplate[]
}

function countTotalAreas(
  buildings: BuildingDefinition[],
  floors: Record<number, FloorData[]>,
  commonAreas: CommonAreaDefinition[]
): number {
  let count = buildings.length + commonAreas.length
  buildings.forEach((_, bIdx) => {
    const buildingFloors = floors[bIdx] || []
    count += buildingFloors.length
    buildingFloors.forEach((f) => {
      count += f.unitCount
    })
  })
  if (buildings.some((b) => b.hasLobby)) count += buildings.filter((b) => b.hasLobby).length
  if (buildings.some((b) => b.hasParking)) count += buildings.filter((b) => b.hasParking).length
  return count
}

function countTotalChecklists(
  floors: Record<number, FloorData[]>,
  assignments: Record<string, string[]>
): number {
  let count = 0
  Object.values(floors).forEach((buildingFloors) => {
    buildingFloors.forEach((floor) => {
      const templateCount = assignments[floor.unitType]?.length || 0
      count += floor.unitCount * templateCount
    })
  })
  Object.values(assignments).forEach((ids) => {
    count += ids.length
  })
  return count
}

export function StructurePreview({
  buildings,
  floors,
  commonAreas,
  assignments,
  templates,
}: StructurePreviewProps) {
  const { t } = useTranslation()
  const totalAreas = countTotalAreas(buildings, floors, commonAreas)
  const totalChecklists = countTotalChecklists(floors, assignments)

  function getTemplateName(id: string): string {
    return templates.find((tmpl) => tmpl.id === id)?.name || id
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' },
          gap: 1.5,
        }}
      >
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
          <AccountTreeIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {totalAreas}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('structureWizard.totalAreas')}
          </Typography>
        </Paper>
        <Paper sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center' }}>
          <ChecklistIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {totalChecklists}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('structureWizard.totalChecklists')}
          </Typography>
        </Paper>
        <Paper
          sx={{
            p: { xs: 1.5, sm: 2 },
            textAlign: 'center',
            gridColumn: { xs: '1 / -1', sm: 'auto' },
          }}
        >
          <BusinessIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>
            {buildings.length}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('structureWizard.step1')}
          </Typography>
        </Paper>
      </Box>

      {buildings.map((building, bIdx) => {
        const buildingFloors = floors[bIdx] || []
        return (
          <Card key={bIdx}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <BusinessIcon color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={600}>
                  {building.name}
                </Typography>
              </Box>

              <Box sx={{ pl: { xs: 1.5, sm: 3 } }}>
                {building.hasBasement && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <FoundationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {t('structureWizard.hasBasement')}
                    </Typography>
                  </Box>
                )}

                {buildingFloors.map((floor, fIdx) => {
                  if (building.hasBasement && fIdx === 0) return null
                  const floorNum = building.hasBasement ? fIdx : fIdx + 1
                  return (
                    <Box key={fIdx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <HomeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('areaLevels.floor')} {floorNum}
                      </Typography>
                      <Chip
                        size="small"
                        label={`${floor.unitCount} ${t(`areas.types.${floor.unitType}`, { defaultValue: floor.unitType })}`}
                        variant="outlined"
                        sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                      />
                    </Box>
                  )
                })}

                {building.hasParking && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <ApartmentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {t('structureWizard.hasParking')}
                    </Typography>
                  </Box>
                )}
                {building.hasLobby && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                    <ApartmentIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {t('structureWizard.hasLobby')}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        )
      })}

      {commonAreas.length > 0 && (
        <Card>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              {t('structureWizard.step3')}
            </Typography>
            {commonAreas.map((area, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                <Typography variant="body2">
                  {area.name}
                </Typography>
                <Chip
                  size="small"
                  label={t(`areas.types.${area.areaType}`, { defaultValue: area.areaType })}
                  variant="outlined"
                  sx={{ ml: 0.5, height: 20, fontSize: '0.7rem' }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {Object.keys(assignments).some((k) => assignments[k]?.length > 0) && (
        <Card>
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              {t('structureWizard.step4')}
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            {Object.entries(assignments)
              .filter(([, ids]) => ids.length > 0)
              .map(([areaType, ids]) => (
                <Box key={areaType} sx={{ mb: 1.5 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                    {t(`areas.types.${areaType}`, { defaultValue: areaType })}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {ids.map((id) => (
                      <Chip
                        key={id}
                        size="small"
                        label={getTemplateName(id)}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </Box>
              ))}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
