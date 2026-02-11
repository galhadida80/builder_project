import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { PageHeader } from '../../../components/ui/Breadcrumbs'
import EquipmentTable from '../../../components/equipment/EquipmentTable'
import { equipmentApi } from '../../../api/equipment'
import { useToast } from '../../../components/common/ToastProvider'
import type { Equipment } from '../../../types'
import { Box, Typography } from '@/mui'

export default function EquipmentPage() {
  const { projectId } = useParams()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadEquipment = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await equipmentApi.list(projectId)
      setEquipment(data)
    } catch (error) {
      const errorMsg = 'Failed to load equipment. Please try again.'
      setError(errorMsg)
      showError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [projectId, showError])

  useEffect(() => {
    loadEquipment()
  }, [loadEquipment])

  const handleRowClick = (equipmentItem: Equipment) => {
    // TODO: Navigate to equipment detail page or open drawer
  }

  return (
    <Box>
      <PageHeader
        title="Equipment"
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'Project Details', href: `/projects/${projectId}` },
          { label: 'Equipment' },
        ]}
      />

      <Card sx={{ mt: 3 }}>
        <Box p={2}>
          <Typography variant="h6" gutterBottom>
            Equipment List
          </Typography>
          <EquipmentTable
            equipment={equipment}
            loading={loading}
            error={error}
            onRetry={loadEquipment}
            onRowClick={handleRowClick}
          />
        </Box>
      </Card>
    </Box>
  )
}
