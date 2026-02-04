import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card } from '../../../components/ui/Card'
import { PageHeader } from '../../../components/ui/Breadcrumbs'
import EquipmentTable from '../../../components/equipment/EquipmentTable'
import { equipmentApi } from '../../../api/equipment'
import { useToast } from '../../../components/common/ToastProvider'
import type { Equipment } from '../../../types'

export default function EquipmentPage() {
  const { projectId } = useParams()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [equipment, setEquipment] = useState<Equipment[]>([])

  useEffect(() => {
    loadEquipment()
  }, [projectId])

  const loadEquipment = async () => {
    if (!projectId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const data = await equipmentApi.list(projectId)
      setEquipment(data)
    } catch (error) {
      showError('Failed to load equipment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleRowClick = (equipmentItem: Equipment) => {
    // TODO: Navigate to equipment detail page or open drawer
  }

  return (
    <Box>
      <PageHeader
        title="Equipment"
        breadcrumbs={[
          { label: 'Projects', to: '/projects' },
          { label: 'Project Details', to: `/projects/${projectId}` },
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
            onRowClick={handleRowClick}
          />
        </Box>
      </Card>
    </Box>
  )
}
