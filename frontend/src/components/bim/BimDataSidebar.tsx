import { useState, useEffect, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box,
  Paper,
  Tab,
  Tabs,
  Typography,
  Switch,
  FormControlLabel,
  Toolbar,
} from '@/mui'
import { BuildIcon, InventoryIcon, SquareFootIcon } from '@/icons'
import { bimApi } from '../../api/bim'
import { useToast } from '../common/ToastProvider'
import BimEntityList from './BimEntityList'
import type { Equipment, Material, ConstructionArea } from '../../types'

interface Props {
  projectId: string
  modelId?: string
  selectedBimObjectIds?: string[]
  isolationMode?: boolean
  onEntityClick?: (bimObjectId: string | undefined, multiSelect?: boolean) => void
  onIsolationModeChange?: (enabled: boolean) => void
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`bim-tabpanel-${index}`} aria-labelledby={`bim-tab-${index}`}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  )
}

function a11yProps(index: number) {
  return { id: `bim-tab-${index}`, 'aria-controls': `bim-tabpanel-${index}` }
}

export default function BimDataSidebar({ projectId, modelId, selectedBimObjectIds = [], isolationMode = false, onEntityClick, onIsolationModeChange }: Props) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(false)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [areas, setAreas] = useState<ConstructionArea[]>([])
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map())
  const selectedSet = useMemo(() => new Set(selectedBimObjectIds), [selectedBimObjectIds])

  useEffect(() => {
    if (!modelId) {
      setEquipment([])
      setMaterials([])
      setAreas([])
      return
    }

    const loadEntities = async () => {
      setLoading(true)
      try {
        const data = await bimApi.getLinkedEntities(projectId, modelId)
        setEquipment(data.equipment)
        setMaterials(data.materials)
        setAreas(data.areas)
      } catch {
        showError(t('bim.failedToLoad'))
      } finally {
        setLoading(false)
      }
    }

    loadEntities()
  }, [projectId, modelId, showError, t])

  useEffect(() => {
    if (selectedBimObjectIds.length === 0) return
    const lastSelected = selectedBimObjectIds[selectedBimObjectIds.length - 1]
    const element = itemRefs.current.get(lastSelected)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedBimObjectIds])

  const handleItemClick = (bimObjectId: string | undefined, event: React.MouseEvent) => {
    const multiSelect = event.ctrlKey || event.metaKey
    onEntityClick?.(bimObjectId, multiSelect)
  }

  const equipmentItems = useMemo(() => equipment.map((item) => ({
    id: item.id,
    bimObjectId: item.bimObjectId,
    primaryText: item.name,
    secondaryText: item.equipmentType,
  })), [equipment])

  const materialItems = useMemo(() => materials.map((item) => ({
    id: item.id,
    bimObjectId: item.bimObjectId,
    primaryText: item.name,
    secondaryText: item.materialType,
  })), [materials])

  const areaItems = useMemo(() => areas.map((item) => ({
    id: item.id,
    bimObjectId: item.bimObjectId,
    primaryText: item.areaCode || item.name,
    secondaryText: `${t('areas.floorNumber')}: ${item.floorNumber}`,
  })), [areas, t])

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} aria-label={t('bim.sidebar.tabs')} variant="fullWidth">
          <Tab icon={<BuildIcon />} iconPosition="start" label={t('bim.sidebar.equipment')} {...a11yProps(0)} />
          <Tab icon={<InventoryIcon />} iconPosition="start" label={t('bim.sidebar.materials')} {...a11yProps(1)} />
          <Tab icon={<SquareFootIcon />} iconPosition="start" label={t('bim.sidebar.areas')} {...a11yProps(2)} />
        </Tabs>
        {selectedBimObjectIds.length > 0 && (
          <Toolbar variant="dense" sx={{ minHeight: 48, px: 2 }}>
            <FormControlLabel
              control={<Switch checked={isolationMode} onChange={(e) => onIsolationModeChange?.(e.target.checked)} size="small" />}
              label={<Typography variant="body2">{t('bim.sidebar.isolationMode')}</Typography>}
            />
          </Toolbar>
        )}
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={activeTab} index={0}>
          <BimEntityList items={equipmentItems} loading={loading} modelId={modelId} emptyKey="bim.sidebar.equipmentEmpty" selectedSet={selectedSet} itemRefs={itemRefs} onItemClick={handleItemClick} />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <BimEntityList items={materialItems} loading={loading} modelId={modelId} emptyKey="bim.sidebar.materialsEmpty" selectedSet={selectedSet} itemRefs={itemRefs} onItemClick={handleItemClick} />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <BimEntityList items={areaItems} loading={loading} modelId={modelId} emptyKey="bim.sidebar.areasEmpty" selectedSet={selectedSet} itemRefs={itemRefs} onItemClick={handleItemClick} />
        </TabPanel>
      </Box>
    </Paper>
  )
}
