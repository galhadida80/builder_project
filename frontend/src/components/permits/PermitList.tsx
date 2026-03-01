import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { DataTable, Column } from '../ui/DataTable'
import { SearchField } from '../ui/TextField'
import { EmptyState } from '../ui/EmptyState'
import { permitsApi } from '../../api/permits'
import { useToast } from '../common/ToastProvider'
import type { Permit, PermitType, PermitStatus } from '../../types/permit'
import { EditIcon, DeleteIcon, VisibilityIcon } from '@/icons'
import { Box, Chip, IconButton, Tooltip } from '@/mui'
import PermitStatusBadge from './PermitStatusBadge'

interface PermitListProps {
  projectId: string
  onViewDetails?: (permit: Permit) => void
  onEdit?: (permit: Permit) => void
  onDelete?: (permitId: string) => void
}

interface PermitRow extends Permit {
  permitTypeLabel: string
  createdByName: string
}

export function PermitList({ projectId, onViewDetails, onEdit, onDelete }: PermitListProps) {
  const { t } = useTranslation()
  const { showError } = useToast()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [permits, setPermits] = useState<PermitRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(false)
      const data = await permitsApi.getProjectPermits(projectId)

      // Transform data to include display labels
      const transformedData: PermitRow[] = data.map((permit) => ({
        ...permit,
        permitTypeLabel: getPermitTypeLabel(permit.permitType),
        createdByName: permit.createdBy?.fullName || permit.createdBy?.email || t('common.unknown'),
      }))

      setPermits(transformedData)
    } catch {
      setError(true)
      showError(t('permits.failedToLoadPermits'))
    } finally {
      setLoading(false)
    }
  }

  const getPermitTypeLabel = (type: PermitType): string => {
    const typeMap: Record<PermitType, string> = {
      building_permit: t('permits.permitTypes.buildingPermit'),
      occupancy_certificate: t('permits.permitTypes.occupancyCertificate'),
      completion_certificate: t('permits.permitTypes.completionCertificate'),
      environmental_permit: t('permits.permitTypes.environmentalPermit'),
      fire_safety_approval: t('permits.permitTypes.fireSafetyApproval'),
    }
    return typeMap[type] || type
  }

  const getDisplayedPermits = () => {
    let filtered = permits

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.permitTypeLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.permitNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.issuingAuthority?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }
    return filtered
  }

  const displayedPermits = getDisplayedPermits()

  if (error) {
    return (
      <EmptyState
        variant="error"
        description={t('permits.failedToLoadPermits')}
        action={{ label: t('common.retry'), onClick: loadData }}
      />
    )
  }

  const columns: Column<PermitRow>[] = [
    {
      id: 'permitType',
      label: t('permits.permitType'),
      minWidth: 200,
      sortable: true,
      render: (row) => (
        <Box>
          <Box sx={{ fontWeight: 600, mb: 0.5 }}>{row.permitTypeLabel}</Box>
          {row.permitNumber && (
            <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', fontFamily: 'monospace' }}>
              {row.permitNumber}
            </Box>
          )}
        </Box>
      ),
    },
    {
      id: 'status',
      label: t('common.status'),
      minWidth: 120,
      sortable: true,
      align: 'center',
      render: (row) => <PermitStatusBadge status={row.status} />,
    },
    {
      id: 'issuingAuthority',
      label: t('permits.authority'),
      minWidth: 150,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.issuingAuthority || '-'}
        </Box>
      ),
    },
    {
      id: 'applicationDate',
      label: t('permits.applicationDate'),
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.applicationDate
            ? new Date(row.applicationDate).toLocaleDateString(getDateLocale())
            : '-'}
        </Box>
      ),
    },
    {
      id: 'approvalDate',
      label: t('permits.approvalDate'),
      minWidth: 120,
      sortable: true,
      render: (row) => (
        <Box sx={{ fontSize: '0.875rem' }}>
          {row.approvalDate
            ? new Date(row.approvalDate).toLocaleDateString(getDateLocale())
            : '-'}
        </Box>
      ),
    },
    {
      id: 'expirationDate',
      label: t('permits.expirationDate'),
      minWidth: 120,
      sortable: true,
      render: (row) => {
        const isExpiringSoon =
          row.expirationDate &&
          new Date(row.expirationDate).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
        return (
          <Box
            sx={{
              fontSize: '0.875rem',
              color: isExpiringSoon ? 'warning.main' : 'text.primary',
              fontWeight: isExpiringSoon ? 600 : 400,
            }}
          >
            {row.expirationDate
              ? new Date(row.expirationDate).toLocaleDateString(getDateLocale())
              : '-'}
          </Box>
        )
      },
    },
    {
      id: 'actions',
      label: t('common.actions'),
      minWidth: 150,
      align: 'center',
      render: (row) => (
        <Box
          sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          {onViewDetails && (
            <Tooltip title={t('common.viewDetails')}>
              <IconButton
                size="small"
                aria-label={t('common.viewDetails')}
                onClick={() => onViewDetails(row)}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onEdit && (
            <Tooltip title={t('common.edit')}>
              <IconButton
                size="small"
                aria-label={t('common.edit')}
                onClick={() => onEdit(row)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip title={t('common.delete')}>
              <IconButton
                size="small"
                color="error"
                aria-label={t('common.delete')}
                onClick={() => onDelete(row.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flex: 1 }}>
          <SearchField
            placeholder={t('permits.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ maxWidth: 400 }}
          />
        </Box>
        <Chip label={t('common.itemsCount', { count: displayedPermits.length })} size="small" />
      </Box>

      <Box sx={{ mt: 3 }}>
        {!loading && displayedPermits.length === 0 ? (
          <EmptyState
            title={
              searchQuery
                ? t('permits.noPermitsFound')
                : t('permits.noPermits')
            }
            description={
              searchQuery
                ? t('permits.adjustSearch')
                : t('permits.noPermitsDescription')
            }
          />
        ) : (
          <DataTable
            columns={columns}
            rows={displayedPermits}
            loading={loading}
            getRowId={(row) => row.id}
            onRowClick={onViewDetails}
            pagination
            pageSize={25}
            emptyVariant="no-data"
            emptyTitle={t('permits.noDataAvailable')}
          />
        )}
      </Box>
    </Box>
  )
}
