import { useState } from 'react'
import { getDateLocale } from '../utils/dateLocale'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from './ui/Card'
import { EmptyState } from './ui/EmptyState'
import type { Inspection, InspectionStatus } from '../types'
import { CheckCircleIcon, WarningIcon, ErrorIcon, ScheduleIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, CardContent, Avatar, TextField as MuiTextField, MenuItem } from '@/mui'

interface InspectionHistoryTimelineProps {
  inspections: Inspection[]
  loading?: boolean
  onInspectionClick?: (inspectionId: string) => void
}

type DateRangeFilter = 'last_7_days' | 'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_year' | 'all_time'

const DATE_RANGE_OPTIONS: Array<{ value: DateRangeFilter; labelKey: string }> = [
  { value: 'last_7_days', labelKey: 'inspections.last7Days' },
  { value: 'last_30_days', labelKey: 'inspections.last30Days' },
  { value: 'last_3_months', labelKey: 'inspections.last3Months' },
  { value: 'last_6_months', labelKey: 'inspections.last6Months' },
  { value: 'last_year', labelKey: 'inspections.lastYear' },
  { value: 'all_time', labelKey: 'inspections.allTime' },
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
  const navigate = useNavigate()
  const { t } = useTranslation()
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
    return new Date(dateString).toLocaleDateString(getDateLocale(), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const handleCardClick = (inspection: Inspection) => {
    if (onInspectionClick) {
      onInspectionClick(inspection.id)
    }
    navigate(`/projects/${inspection.projectId}/inspections/${inspection.id}`)
  }

  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Skeleton variant="rectangular" sx={{ width: { xs: '100%', sm: 200 } }} height={40} />
        </Box>
        {[1, 2, 3].map((i) => (
          <Box key={i} sx={{ mb: 3 }}>
            {/* Date - Mobile */}
            <Box sx={{ display: { xs: 'block', sm: 'none' }, mb: 1, pl: 3 }}>
              <Skeleton variant="text" width={100} />
            </Box>

            {/* Desktop/Tablet Layout */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Date - Desktop */}
              <Box sx={{ display: { xs: 'none', sm: 'block' }, minWidth: { sm: 100, md: 120 }, pt: 1 }}>
                <Skeleton variant="text" width={100} />
              </Box>
              <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Skeleton variant="circular" width={12} height={12} />
                {i < 3 && (
                  <Box
                    sx={{
                      width: 2,
                      height: 120,
                      bgcolor: 'grey.300',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ flex: 1 }}>
                <Card>
                  <CardContent sx={{
                    display: 'flex',
                    gap: { xs: 1.5, sm: 2 },
                    alignItems: 'flex-start',
                    p: { xs: 2, sm: 2.5 },
                    flexDirection: { xs: 'column', sm: 'row' },
                  }}>
                    <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, alignItems: 'center', width: { xs: '100%', sm: 'auto' } }}>
                      <Skeleton variant="circular" width={40} height={40} />
                      <Box sx={{ flex: { xs: 1, sm: 'initial' } }}>
                        <Skeleton variant="text" width="60%" height={20} />
                        <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
                      </Box>
                    </Box>
                    <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 4 }} />
                  </CardContent>
                </Card>
              </Box>
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
            sx={{ minWidth: { xs: '100%', sm: 200 } }}
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </MenuItem>
            ))}
          </MuiTextField>
        </Box>
        <EmptyState
          title={t('inspections.noInspectionsInRange')}
          description={t('inspections.noInspectionsInRangeDescription')}
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
          sx={{ minWidth: { xs: '100%', sm: 200 } }}
          label={t('inspections.dateRange')}
        >
          {DATE_RANGE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {t(option.labelKey)}
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
                mb: index < sortedInspections.length - 1 ? 4 : 0,
              }}
            >
              {/* Date - Shows above card on mobile, left side on desktop */}
              <Box sx={{
                display: { xs: 'block', sm: 'none' },
                mb: 1,
                pl: 3,
              }}>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(inspection.scheduledDate)}
                </Typography>
              </Box>

              {/* Desktop/Tablet Layout */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                }}
              >
                {/* Date - Desktop only */}
                <Box sx={{
                  display: { xs: 'none', sm: 'block' },
                  minWidth: { sm: 100, md: 120 },
                  pt: 1,
                }}>
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
                    hoverable
                    onClick={() => handleCardClick(inspection)}
                  >
                    <CardContent sx={{
                      display: 'flex',
                      gap: { xs: 1.5, sm: 2 },
                      alignItems: 'flex-start',
                      p: { xs: 2, sm: 2.5 },
                      flexDirection: { xs: 'column', sm: 'row' },
                    }}>
                      <Box sx={{
                        display: 'flex',
                        gap: { xs: 1.5, sm: 2 },
                        alignItems: 'center',
                        width: { xs: '100%', sm: 'auto' },
                      }}>
                        <Avatar
                          sx={{
                            bgcolor: 'primary.light',
                            color: 'primary.main',
                            width: { xs: 36, sm: 40 },
                            height: { xs: 36, sm: 40 },
                          }}
                        >
                          {inspectorName.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box sx={{ flex: { xs: 1, sm: 'initial' } }}>
                          <Typography variant="body2" fontWeight={500} gutterBottom>
                            {consultantTypeName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('inspections.inspector')}: {inspectorName}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ mt: { xs: 0, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>
                        <Chip
                          size="small"
                          icon={config.icon as React.ReactElement}
                          label={t(`common.statuses.${inspection.status}`, { defaultValue: inspection.status.replace('_', ' ') })}
                          color={config.color}
                          sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
