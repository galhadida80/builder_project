import Chip from '@mui/material/Chip'
import type { ApprovalStatus } from '../../types'

interface EquipmentStatusBadgeProps {
  status: ApprovalStatus
  size?: 'small' | 'medium'
}

const statusConfig: Record<ApprovalStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', color: 'default' },
  submitted: { label: 'Submitted', color: 'info' },
  under_review: { label: 'Under Review', color: 'warning' },
  approved: { label: 'Approved', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  revision_requested: { label: 'Revision Requested', color: 'secondary' },
}

export default function EquipmentStatusBadge({ status, size = 'small' }: EquipmentStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      sx={{
        fontWeight: 500,
        fontSize: size === 'small' ? '0.75rem' : '0.875rem',
      }}
    />
  )
}
