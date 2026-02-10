import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Box, Grid, Skeleton } from '@mui/material'
import { Tabs } from '../ui/Tabs'
import { EmptyState } from '../ui/EmptyState'
import { MaterialCard } from './MaterialCard'
import InventoryIcon from '@mui/icons-material/Inventory'
import type { Material } from '../../types'

interface MaterialInventoryGridProps {
  materials: Material[]
  loading?: boolean
  onMaterialClick?: (material: Material) => void
  lowStockThreshold?: number
}

const materialTypes = ['All', 'Structural', 'Finishing', 'Safety', 'MEP', 'Insulation']

export function MaterialInventoryGrid({
  materials,
  loading = false,
  onMaterialClick,
  lowStockThreshold = 10,
}: MaterialInventoryGridProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('All')

  const filteredMaterials = materials.filter((material) => {
    if (activeTab === 'All') return true
    return material.materialType === activeTab
  })

  const tabItems = materialTypes.map((type) => {
    const count = type === 'All'
      ? materials.length
      : materials.filter((m) => m.materialType === type).length

    return {
      label: type,
      value: type,
      badge: count,
    }
  })

  if (loading) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="rectangular" height={44} sx={{ borderRadius: 2 }} />
        </Box>
        <Grid container spacing={3}>
          {[...Array(8)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Skeleton variant="rectangular" height={360} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  if (materials.length === 0) {
    return (
      <EmptyState
        variant="empty"
        icon={<InventoryIcon />}
        title={t('materials.noMaterialsYet')}
        description={t('materials.noMaterialsYetDescription')}
      />
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Tabs
          items={tabItems}
          value={activeTab}
          onChange={setActiveTab}
          variant="scrollable"
        />
      </Box>

      {filteredMaterials.length === 0 ? (
        <EmptyState
          variant="no-results"
          title={t('materials.noMaterialsFound')}
          description={t('materials.noMaterialsFoundInCategory')}
        />
      ) : (
        <Grid container spacing={3}>
          {filteredMaterials.map((material) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={material.id}>
              <MaterialCard
                material={material}
                onClick={() => onMaterialClick?.(material)}
                lowStockThreshold={lowStockThreshold}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
