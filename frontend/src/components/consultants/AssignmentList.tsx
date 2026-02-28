import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { DataTable, Column } from '../ui/DataTable'
import type { ConsultantAssignment } from '../../types/consultantAssignment'
import { EditIcon, DeleteIcon, PersonIcon } from '@/icons'
import { Box, Typography, IconButton, Chip } from '@/mui'

interface AssignmentListProps {
  assignments: ConsultantAssignment[]
  loading?: boolean
  onEdit?: (assignment: ConsultantAssignment) => void
  onDelete?: (assignment: ConsultantAssignment) => void
  onRowClick?: (assignment: ConsultantAssignment) => void
}

const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'completed':
      return 'primary'
    case 'cancelled':
      return 'error'
    default:
      return 'default'
  }
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString(getDateLocale(), {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function AssignmentList({
  assignments,
  loading = false,
  onEdit,
  onDelete,
  onRowClick,
}: AssignmentListProps) {
  const { t } = useTranslation()
  const columns: Column<ConsultantAssignment>[] = [
    {
      id: 'consultant',
      label: 'Consultant',
      minWidth: 250,
      render: (row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: 'primary.light',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PersonIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          </Box>
          <Box>
            <Typography variant="body2" fontWeight={500}>
              {row.consultant?.fullName || row.consultant?.email || 'Unknown Consultant'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.consultantType?.name || 'No type specified'}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'project',
      label: 'Project',
      minWidth: 180,
      render: (row) => (
        <Typography variant="body2" color={row.project?.name ? 'text.primary' : 'text.secondary'}>
          {row.project?.name || '-'}
        </Typography>
      ),
    },
    {
      id: 'startDate',
      label: 'Start Date',
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Typography variant="body2">
          {formatDate(row.startDate)}
        </Typography>
      ),
    },
    {
      id: 'endDate',
      label: 'End Date',
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Typography variant="body2">
          {formatDate(row.endDate)}
        </Typography>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 130,
      render: (row) => (
        <Chip
          label={row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          size="small"
          color={getStatusColor(row.status)}
          sx={{ fontWeight: 500 }}
        />
      ),
    },
    {
      id: 'actions',
      label: '',
      minWidth: 100,
      align: 'right',
      render: (row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
          {onEdit && (
            <IconButton aria-label={t('consultants.editAssignment')}
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onEdit(row)
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {onDelete && (
            <IconButton aria-label={t('consultants.deleteAssignment')}
              size="small"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(row)
              }}
              color="error"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={assignments}
      loading={loading}
      getRowId={(row) => row.id}
      onRowClick={onRowClick}
      emptyVariant="empty"
      emptyTitle={t('consultants.noAssignments')}
      emptyDescription={t('consultants.noAssignmentsDescription')}
      pagination
      pageSize={10}
    />
  )
}
