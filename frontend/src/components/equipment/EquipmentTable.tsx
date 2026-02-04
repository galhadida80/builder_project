import { DataTable, Column } from '../ui/DataTable'
import EquipmentStatusBadge from './EquipmentStatusBadge'
import type { Equipment } from '../../types'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface EquipmentTableProps {
  equipment: Equipment[]
  loading?: boolean
  onRowClick?: (equipment: Equipment) => void
  emptyMessage?: string
}

export default function EquipmentTable({
  equipment,
  loading = false,
  onRowClick,
  emptyMessage = 'No equipment found',
}: EquipmentTableProps) {
  const columns: Column<Equipment>[] = [
    {
      id: 'name',
      label: 'Equipment Name',
      minWidth: 200,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" fontWeight={600}>
          {row.name}
        </Typography>
      ),
    },
    {
      id: 'equipmentType',
      label: 'Type',
      minWidth: 150,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.equipmentType || '—'}
        </Typography>
      ),
    },
    {
      id: 'manufacturer',
      label: 'Manufacturer',
      minWidth: 150,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.manufacturer || '—'}
        </Typography>
      ),
    },
    {
      id: 'modelNumber',
      label: 'Model Number',
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.modelNumber || '—'}
        </Typography>
      ),
    },
    {
      id: 'serialNumber',
      label: 'Serial Number',
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {row.serialNumber || '—'}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (row) => (
        <Box display="flex" justifyContent="center">
          <EquipmentStatusBadge status={row.status} />
        </Box>
      ),
    },
    {
      id: 'updatedAt',
      label: 'Last Updated',
      minWidth: 150,
      sortable: true,
      render: (row) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(row.updatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Typography>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={equipment}
      loading={loading}
      getRowId={(row) => row.id}
      onRowClick={onRowClick}
      emptyMessage={emptyMessage}
      pagination={true}
      pageSize={10}
    />
  )
}
