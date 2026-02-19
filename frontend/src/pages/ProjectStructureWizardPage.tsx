import { useReducer, useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProgressStepper } from '../components/ui/Stepper'
import { Card } from '../components/ui/Card'
import { BuildingsStep } from '../components/wizard/BuildingsStep'
import { FloorsUnitsStep } from '../components/wizard/FloorsUnitsStep'
import { CommonAreasStep } from '../components/wizard/CommonAreasStep'
import { ChecklistAssignmentStep } from '../components/wizard/ChecklistAssignmentStep'
import { StructurePreview } from '../components/wizard/StructurePreview'
import { WizardNavigation } from '../components/wizard/WizardNavigation'
import { areaStructureApi } from '../api/areaStructure'
import { checklistsApi } from '../api/checklists'
import { useToast } from '../components/common/ToastProvider'
import { PageHeader } from '../components/ui/Breadcrumbs'
import type {
  BuildingDefinition,
  CommonAreaDefinition,
  BulkAreaNode,
  ChecklistTemplate,
} from '../types'
import { Box, CardContent } from '@/mui'

interface FloorData {
  unitCount: number
  unitType: string
}

interface WizardState {
  currentStep: number
  buildings: BuildingDefinition[]
  floors: Record<number, FloorData[]>
  commonAreas: CommonAreaDefinition[]
  checklistAssignments: Record<string, string[]>
  autoAssignChecklists: boolean
}

type WizardAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'ADD_BUILDING' }
  | { type: 'UPDATE_BUILDING'; index: number; building: BuildingDefinition }
  | { type: 'REMOVE_BUILDING'; index: number }
  | { type: 'SET_FLOOR_UNITS'; buildingIndex: number; floors: FloorData[] }
  | { type: 'ADD_COMMON_AREA' }
  | { type: 'UPDATE_COMMON_AREA'; index: number; area: CommonAreaDefinition }
  | { type: 'REMOVE_COMMON_AREA'; index: number }
  | { type: 'SET_CHECKLIST_ASSIGNMENT'; areaType: string; templateIds: string[] }
  | { type: 'SET_AUTO_ASSIGN'; value: boolean }

const INITIAL_STATE: WizardState = {
  currentStep: 0,
  buildings: [],
  floors: {},
  commonAreas: [],
  checklistAssignments: {},
  autoAssignChecklists: true,
}

const TOTAL_STEPS = 5

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }

    case 'ADD_BUILDING':
      return {
        ...state,
        buildings: [
          ...state.buildings,
          {
            name: '',
            floorCount: 3,
            hasBasement: false,
            hasParking: false,
            hasLobby: false,
          },
        ],
      }

    case 'UPDATE_BUILDING':
      return {
        ...state,
        buildings: state.buildings.map((b, i) =>
          i === action.index ? action.building : b
        ),
      }

    case 'REMOVE_BUILDING': {
      const newBuildings = state.buildings.filter((_, i) => i !== action.index)
      const newFloors = { ...state.floors }
      delete newFloors[action.index]
      const reindexedFloors: Record<number, FloorData[]> = {}
      Object.keys(newFloors).forEach((key) => {
        const oldIdx = Number(key)
        const newIdx = oldIdx > action.index ? oldIdx - 1 : oldIdx
        reindexedFloors[newIdx] = newFloors[oldIdx]
      })
      return { ...state, buildings: newBuildings, floors: reindexedFloors }
    }

    case 'SET_FLOOR_UNITS':
      return {
        ...state,
        floors: { ...state.floors, [action.buildingIndex]: action.floors },
      }

    case 'ADD_COMMON_AREA':
      return {
        ...state,
        commonAreas: [...state.commonAreas, { name: '', areaType: 'parking' }],
      }

    case 'UPDATE_COMMON_AREA':
      return {
        ...state,
        commonAreas: state.commonAreas.map((a, i) =>
          i === action.index ? action.area : a
        ),
      }

    case 'REMOVE_COMMON_AREA':
      return {
        ...state,
        commonAreas: state.commonAreas.filter((_, i) => i !== action.index),
      }

    case 'SET_CHECKLIST_ASSIGNMENT':
      return {
        ...state,
        checklistAssignments: {
          ...state.checklistAssignments,
          [action.areaType]: action.templateIds,
        },
      }

    case 'SET_AUTO_ASSIGN':
      return { ...state, autoAssignChecklists: action.value }

    default:
      return state
  }
}

function buildBulkTree(state: WizardState): BulkAreaNode[] {
  const nodes: BulkAreaNode[] = []

  state.buildings.forEach((building, bIdx) => {
    const buildingFloors = state.floors[bIdx] || []
    const floorChildren: BulkAreaNode[] = []

    buildingFloors.forEach((floor, fIdx) => {
      const isBasement = building.hasBasement && fIdx === 0
      const floorNumber = isBasement ? -1 : building.hasBasement ? fIdx : fIdx + 1

      const unitChildren: BulkAreaNode[] = Array.from(
        { length: floor.unitCount },
        (_, unitIdx) => ({
          name: `${floor.unitType} ${unitIdx + 1}`,
          area_type: floor.unitType,
          area_level: 'unit',
          area_code: `${building.name}-F${floorNumber}-U${unitIdx + 1}`,
          total_units: 1,
        })
      )

      floorChildren.push({
        name: isBasement
          ? 'Basement'
          : `Floor ${floorNumber}`,
        area_type: isBasement ? 'basement' : 'floor',
        area_level: 'floor',
        floor_number: floorNumber,
        total_units: floor.unitCount,
        children: unitChildren.length > 0 ? unitChildren : undefined,
      })
    })

    if (building.hasParking) {
      floorChildren.push({
        name: 'Parking',
        area_type: 'parking',
        area_level: 'zone',
      })
    }

    if (building.hasLobby) {
      floorChildren.push({
        name: 'Lobby',
        area_type: 'lobby',
        area_level: 'zone',
      })
    }

    nodes.push({
      name: building.name || `Building ${bIdx + 1}`,
      area_type: 'building',
      area_level: 'building',
      children: floorChildren.length > 0 ? floorChildren : undefined,
    })
  })

  state.commonAreas.forEach((area) => {
    nodes.push({
      name: area.name || area.areaType,
      area_type: area.areaType,
      area_level: 'zone',
    })
  })

  return nodes
}

function collectAreaTypes(state: WizardState): string[] {
  const types = new Set<string>()
  Object.values(state.floors).forEach((buildingFloors) => {
    buildingFloors.forEach((f) => types.add(f.unitType))
  })
  state.commonAreas.forEach((a) => types.add(a.areaType))
  return Array.from(types)
}

export default function ProjectStructureWizardPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const [state, dispatch] = useReducer(wizardReducer, INITIAL_STATE)
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([])

  useEffect(() => {
    if (!projectId) return
    checklistsApi.getTemplates(projectId).then(setTemplates).catch(() => {})
  }, [projectId])

  const stepLabels = useMemo(
    () => [
      t('structureWizard.step1'),
      t('structureWizard.step2'),
      t('structureWizard.step3'),
      t('structureWizard.step4'),
      t('structureWizard.step5'),
    ],
    [t]
  )

  const areaTypes = useMemo(() => collectAreaTypes(state), [state.floors, state.commonAreas])

  function canProceed(): boolean {
    switch (state.currentStep) {
      case 0:
        return state.buildings.length > 0 && state.buildings.every((b) => b.name.trim() !== '')
      case 1:
        return state.buildings.length > 0
      case 2:
        return state.commonAreas.every((a) => a.name.trim() !== '')
      case 3:
        return true
      case 4:
        return state.buildings.length > 0
      default:
        return true
    }
  }

  function handleNext() {
    if (state.currentStep < TOTAL_STEPS - 1) {
      dispatch({ type: 'SET_STEP', step: state.currentStep + 1 })
    }
  }

  function handleBack() {
    if (state.currentStep > 0) {
      dispatch({ type: 'SET_STEP', step: state.currentStep - 1 })
    }
  }

  async function handleFinish() {
    if (!projectId) return
    setLoading(true)
    try {
      const tree = buildBulkTree(state)
      await areaStructureApi.bulkCreateAreas(projectId, {
        areas: tree,
        auto_assign_checklists: state.autoAssignChecklists,
      })
      toast.showSuccess(t('structureWizard.structureCreated'))
      navigate(`/projects/${projectId}/areas`)
    } catch {
      toast.showError(t('structureWizard.failedToCreate'))
    } finally {
      setLoading(false)
    }
  }

  function renderStep() {
    switch (state.currentStep) {
      case 0:
        return (
          <BuildingsStep
            buildings={state.buildings}
            onAdd={() => dispatch({ type: 'ADD_BUILDING' })}
            onUpdate={(index, building) =>
              dispatch({ type: 'UPDATE_BUILDING', index, building })
            }
            onRemove={(index) => dispatch({ type: 'REMOVE_BUILDING', index })}
          />
        )
      case 1:
        return (
          <FloorsUnitsStep
            buildings={state.buildings}
            floors={state.floors}
            onSetFloorUnits={(buildingIndex, floors) =>
              dispatch({ type: 'SET_FLOOR_UNITS', buildingIndex, floors })
            }
          />
        )
      case 2:
        return (
          <CommonAreasStep
            commonAreas={state.commonAreas}
            onAdd={() => dispatch({ type: 'ADD_COMMON_AREA' })}
            onUpdate={(index, area) =>
              dispatch({ type: 'UPDATE_COMMON_AREA', index, area })
            }
            onRemove={(index) => dispatch({ type: 'REMOVE_COMMON_AREA', index })}
          />
        )
      case 3:
        return (
          <ChecklistAssignmentStep
            areaTypes={areaTypes}
            assignments={state.checklistAssignments}
            templates={templates}
            onAssign={(areaType, templateIds) =>
              dispatch({ type: 'SET_CHECKLIST_ASSIGNMENT', areaType, templateIds })
            }
            autoAssign={state.autoAssignChecklists}
            onAutoAssignChange={(value) =>
              dispatch({ type: 'SET_AUTO_ASSIGN', value })
            }
          />
        )
      case 4:
        return (
          <StructurePreview
            buildings={state.buildings}
            floors={state.floors}
            commonAreas={state.commonAreas}
            assignments={state.checklistAssignments}
            templates={templates}
          />
        )
      default:
        return null
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        pb: { xs: 8, sm: 4 },
      }}
    >
      <PageHeader
        title={t('structureWizard.title')}
        subtitle={t('structureWizard.subtitle')}
        breadcrumbs={[
          { label: t('nav.areas', { defaultValue: 'Areas' }), href: `/projects/${projectId}/areas` },
          { label: t('structureWizard.title') },
        ]}
      />

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: { xs: 1.5, sm: 2 } }}>
          <ProgressStepper
            currentStep={state.currentStep}
            totalSteps={TOTAL_STEPS}
            labels={stepLabels}
          />
        </CardContent>
      </Card>

      <Box sx={{ flex: 1, mb: 2 }}>{renderStep()}</Box>

      <WizardNavigation
        currentStep={state.currentStep}
        totalSteps={TOTAL_STEPS}
        onBack={handleBack}
        onNext={handleNext}
        onFinish={handleFinish}
        loading={loading}
        canProceed={canProceed()}
      />
    </Box>
  )
}
