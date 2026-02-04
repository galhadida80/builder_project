import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import MuiTextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import ScheduleIcon from '@mui/icons-material/Schedule'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import type { Inspection, InspectionStatus } from '../types'

interface InspectionHistoryTimelineProps {
  inspections: Inspection[]
  loading?: boolean
  onInspectionClick?: (inspectionId: string) => void
}

type DateRangeFilter = 'last_7_days' | 'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_year' | 'all_time'

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeFilter; label: string }> = [
  { value: 'last_7_days', label: 'Last 7 days' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
  { value: 'last_year', label: 'Last year' },
  { value: 'all_time', label: 'All time' },
]

const getDateRangeDaysAgo = (range: DateRangeFilter): number | null => {
  switch (range) {
    case 'last_7_days':
      return 7
    case 'last_30_days':
      return 30
    case 'last_3_months':
      return 90
    case 'last_6_months':
      return 180
    case 'last_year':
      return 365
    case 'all_time':
      return null
    default:
      return 90
  }
}

const statusConfig: Record<InspectionStatus, { icon: React.ReactNode; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  pending: { icon: <ScheduleIcon sx={{ fontSize: 16 }} />, color: 'warning' },
  in_progress: { icon: <WarningIcon sx={{ fontSize: 16 }} />, color: 'info' },
  completed: { icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: 'success' },
  failed: { icon: <ErrorIcon sx={{ fontSize: 16 }} />, color: 'error' },
}

export function InspectionHistoryTimeline({
  inspections,
  loading = false,
  onInspectionClick,
}: InspectionHistoryTimelineProps) {
  const [dateRange, setDateRange] = useState<DateRangeFilter>('last_3_months')

  const filterInspectionsByDateRange = (inspections: Inspection[]): Inspection[] => {
    const daysAgo = getDateRangeDaysAgo(dateRange)
    if (daysAgo === null) {
      return inspections
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo)

    return inspections.filter((inspection) => {
      const inspectionDate = new Date(inspection.scheduledDate)
      return inspectionDate >= cutoffDate
    })
  }

  const filteredInspections = filterInspectionsByDateRange(inspections)
  const sortedInspections = [...filteredInspections].sort(
    (a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
  )

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleCardClick = (inspectionId: string) => {
    if (onInspectionClick) {
      onInspectionClick(inspectionId)
    }
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Skeleton variant="rectangular" width={200} height={40} />
        </Box>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Box sx={{ minWidth: 120, pt: 1 }}>
              <Skeleton variant="text" width={100} />
            </Box>
            <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Skeleton variant="circular" width={12} height={12} />
              {i < 3 && (
                <Box
                  sx={{
                    width: 2,
                    height: 80,
                    bgcolor: 'grey.300',
                  }}
                />
              )}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="rectangular" width="100%" height={100} sx={{ borderRadius: 2 }} />
            </Box>
          </Box>
        ))}
      </Box>
    )
  }

  if (sortedInspections.length === 0) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <MuiTextField
            select
            size="small"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
            sx={{ minWidth: 200 }}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </MuiTextField>
        </Box>
        <EmptyState
          title="No inspections found"
          description="There are no inspections for this project in the selected date range."
          icon={<ScheduleIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
        />
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Date Range Filter */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <MuiTextField
          select
          size="small"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
          sx={{ minWidth: 200 }}
          label="Date Range"
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </MuiTextField>
      </Box>

      {/* Timeline */}
      <Box sx={{ position: 'relative' }}>
        {sortedInspections.map((inspection, index) => {
          const config = statusConfig[inspection.status]
          const inspectorName = inspection.createdBy?.fullName || 'Unknown Inspector'
          const consultantTypeName = inspection.consultantType?.name || 'General Inspection'

          return (
            <Box
              key={inspection.id}
              sx={{
                display: 'flex',
                gap: 2,
                mb: index < sortedInspections.length - 1 ? 4 : 0,
              }}
            >
              {/* Date */}
              <Box sx={{ minWidth: 120, pt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(inspection.scheduledDate)}
                </Typography>
              </Box>

              {/* Timeline Node */}
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: config.color === 'success' ? 'success.main' :
                             config.color === 'warning' ? 'warning.main' :
                             config.color === 'error' ? 'error.main' :
                             config.color === 'info' ? 'info.main' : 'grey.400',
                    mt: 1,
                  }}
                />
                {index < sortedInspections.length - 1 && (
                  <Box
                    sx={{
                      width: 2,
                      flex: 1,
                      bgcolor: 'grey.300',
                      minHeight: 60,
                    }}
                  />
                )}
              </Box>

              {/* Card */}
              <Box sx={{ flex: 1 }}>
                <Card
                  hoverable={!!onInspectionClick}
                  onClick={() => handleCardClick(inspection.id)}
                >
                  <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', p: 2.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        width: 40,
                        height: 40,
                      }}
                    >
                      {inspectorName.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={500} gutterBottom>
                        {consultantTypeName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                        Inspector: {inspectorName}
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          icon={config.icon as React.ReactElement}
                          label={inspection.status.replace('_', ' ')}
                          color={config.color}
                          sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
