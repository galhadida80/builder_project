import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import {
  BusinessIcon,
  ExpandMoreIcon,
  ExpandLessIcon,
  HomeIcon,
  FoundationIcon,
} from '@/icons'
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Collapse,
  IconButton,
  CardContent,
} from '@/mui'
import type { BuildingDefinition } from '../../types'

interface FloorData {
  unitCount: number
  unitType: string
}

interface FloorsUnitsStepProps {
  buildings: BuildingDefinition[]
  floors: Record<number, FloorData[]>
  onSetFloorUnits: (buildingIndex: number, floors: FloorData[]) => void
}

const UNIT_TYPES = ['apartment', 'office', 'commercial', 'studio'] as const

function generateFloors(building: BuildingDefinition, existing?: FloorData[]): FloorData[] {
  const totalFloors = building.floorCount + (building.hasBasement ? 1 : 0)
  return Array.from({ length: totalFloors }, (_, i) => {
    if (existing && existing[i]) return existing[i]
    return { unitCount: 4, unitType: 'apartment' }
  })
}

function getFloorLabel(
  index: number,
  hasBasement: boolean,
  t: (key: string) => string
): { label: string; icon: React.ReactNode } {
  if (hasBasement && index === 0) {
    return { label: t('structureWizard.hasBasement'), icon: <FoundationIcon fontSize="small" /> }
  }
  const floorNum = hasBasement ? index : index + 1
  return {
    label: `${t('areaLevels.floor')} ${floorNum}`,
    icon: <HomeIcon fontSize="small" />,
  }
}

export function FloorsUnitsStep({ buildings, floors, onSetFloorUnits }: FloorsUnitsStepProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    buildings.forEach((building, bIdx) => {
      const generated = generateFloors(building, floors[bIdx])
      if (!floors[bIdx] || floors[bIdx].length !== generated.length) {
        onSetFloorUnits(bIdx, generated)
      }
    })
  }, [buildings])

  function toggleExpanded(index: number) {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }))
  }

  function handleFloorChange(
    buildingIndex: number,
    floorIndex: number,
    field: keyof FloorData,
    value: string | number
  ) {
    const current = floors[buildingIndex] || []
    const updated = current.map((f, i) => {
      if (i !== floorIndex) return f
      if (field === 'unitCount') {
        return { ...f, unitCount: Math.max(0, Number(value) || 0) }
      }
      return { ...f, unitType: String(value) }
    })
    onSetFloorUnits(buildingIndex, updated)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {buildings.map((building, bIdx) => {
        const isExpanded = expanded[bIdx] ?? true
        const buildingFloors = floors[bIdx] || []

        return (
          <Card key={bIdx}>
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
                onClick={() => toggleExpanded(bIdx)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={600}>
                    {building.name || `${t('structureWizard.buildingName')} ${bIdx + 1}`}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({buildingFloors.length} {t('areaLevels.floor')})
                  </Typography>
                </Box>
                <IconButton size="small">
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>

              <Collapse in={isExpanded}>
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {buildingFloors.map((floor, fIdx) => {
                    const { label, icon } = getFloorLabel(fIdx, building.hasBasement, t)
                    return (
                      <Box
                        key={fIdx}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: { xs: 1, sm: 2 },
                          p: { xs: 1, sm: 1.5 },
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          flexWrap: { xs: 'wrap', sm: 'nowrap' },
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            minWidth: { xs: '100%', sm: 120 },
                            color: 'text.secondary',
                          }}
                        >
                          {icon}
                          <Typography variant="body2" fontWeight={500}>
                            {label}
                          </Typography>
                        </Box>

                        <TextField
                          label={t('structureWizard.unitCount')}
                          type="number"
                          value={floor.unitCount}
                          onChange={(e) =>
                            handleFloorChange(bIdx, fIdx, 'unitCount', e.target.value)
                          }
                          size="small"
                          sx={{ flex: 1, minWidth: 80 }}
                          inputProps={{ min: 0, max: 100 }}
                        />

                        <TextField
                          select
                          label={t('structureWizard.unitType')}
                          value={floor.unitType}
                          onChange={(e) =>
                            handleFloorChange(bIdx, fIdx, 'unitType', e.target.value)
                          }
                          size="small"
                          sx={{ flex: 1, minWidth: 120 }}
                        >
                          {UNIT_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                              {t(`areas.types.${type}`, { defaultValue: type })}
                            </MenuItem>
                          ))}
                          <MenuItem value="other">{t('common.other')}</MenuItem>
                        </TextField>
                        {floor.unitType === 'other' && (
                          <TextField
                            label={t('common.customType')}
                            size="small"
                            sx={{ flex: 1, minWidth: 120 }}
                          />
                        )}
                      </Box>
                    )
                  })}
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        )
      })}
    </Box>
  )
}
