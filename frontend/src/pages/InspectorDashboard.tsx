import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

import type { Inspection } from '../types'
import { inspectionsApi } from '../api/inspections'
import { getDateLocale } from '../utils/dateLocale'
import { useProject } from '../contexts/ProjectContext'
import { CheckCircleIcon, CameraAltIcon, ReportProblemIcon, LocationOnIcon, AccessTimeIcon, AssignmentIcon, SignalWifiOffIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip, List, ListItem, ListItemText } from '@/mui'

export default function InspectorDashboard() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])
  const { selectedProjectId } = useProject()

  const projectId = selectedProjectId || ''

  useEffect(() => {
    if (projectId) {
      loadTodayInspections()
    } else {
      setLoading(false)
      setInspections([])
    }
  }, [projectId])

  const loadTodayInspections = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const allInspections = await inspectionsApi.getProjectInspections(projectId)

      // Filter to show only today's inspections
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayInspections = allInspections.filter(inspection => {
        const scheduledDate = new Date(inspection.scheduledDate)
        return scheduledDate >= today && scheduledDate < tomorrow
      })

      setInspections(todayInspections)
    } catch (error) {
      setInspections([])
    } finally {
      setLoading(false)
    }
  }

  const handleStartInspection = () => {
    // Placeholder for start inspection action
  }

  const handleTakePhoto = () => {
    // Placeholder for take photo action
  }

  const handleReportIssue = () => {
    // Placeholder for report issue action
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(getDateLocale(), {
      hour: 'numeric',
      minute: '2-digit',
      hour12: undefined,
    })
  }

  if (loading) {
    return (
      <>
        <Box
          sx={{
            maxWidth: '428px',
            margin: '0 auto',
            minHeight: '100dvh',
            bgcolor: 'background.default',
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            pb: { xs: 10, sm: 12 },
          }}
        >
          {/* Header skeleton */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Skeleton variant="text" width={150} height={36} />
              <Skeleton variant="rounded" width={80} height={24} sx={{ borderRadius: '12px' }} />
            </Box>
            <Skeleton variant="text" width={180} height={20} />
          </Box>
          {/* Quick action buttons skeleton */}
          <Box sx={{ mb: 4 }}>
            <Skeleton variant="rounded" height={56} sx={{ mb: 1.5, borderRadius: '8px' }} />
            <Skeleton variant="rounded" height={56} sx={{ mb: 1.5, borderRadius: '8px' }} />
            <Skeleton variant="rounded" height={56} sx={{ borderRadius: '8px' }} />
          </Box>
          {/* Schedule section skeleton */}
          <Skeleton variant="text" width={150} height={28} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" height={130} sx={{ mb: 2, borderRadius: '12px' }} />
          <Skeleton variant="rounded" height={130} sx={{ borderRadius: '12px' }} />
        </Box>
      </>
    )
  }

  return (
    <>
      <Box
        sx={{
          maxWidth: '428px',
          margin: '0 auto',
          minHeight: '100dvh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          pb: { xs: 10, sm: 12 },
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                color: 'text.primary',
                fontSize: { xs: '1.5rem', sm: '1.75rem' },
              }}
            >
              {t('inspector.title')}
            </Typography>
            {isOffline && (
              <Chip
                icon={<SignalWifiOffIcon sx={{ fontSize: 14 }} />}
                label={t('inspector.offline')}
                size="small"
                sx={{
                  bgcolor: 'error.main',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  height: 24,
                  px: 1,
                  '& .MuiChip-icon': {
                    color: 'white',
                    marginLeft: '4px',
                  },
                  '& .MuiChip-label': {
                    px: '6px',
                  },
                }}
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
            {new Date().toLocaleDateString(getDateLocale(), {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Typography>
        </Box>

        {/* Quick Action Buttons */}
        <Box sx={{ mb: 4 }}>
          <Button
            variant="success"
            fullWidth
            size="large"
            icon={<CheckCircleIcon sx={{ fontSize: 20 }} />}
            onClick={handleStartInspection}
            sx={{
              mb: 1.5,
              py: 1.75,
              minHeight: 56,
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            {t('inspector.startInspection')}
          </Button>
          <Button
            variant="primary"
            fullWidth
            size="large"
            icon={<CameraAltIcon sx={{ fontSize: 20 }} />}
            onClick={handleTakePhoto}
            sx={{
              mb: 1.5,
              py: 1.75,
              minHeight: 56,
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            {t('inspector.takePhoto')}
          </Button>
          <Button
            variant="danger"
            fullWidth
            size="large"
            icon={<ReportProblemIcon sx={{ fontSize: 20 }} />}
            onClick={handleReportIssue}
            sx={{
              py: 1.75,
              minHeight: 56,
              fontSize: '0.95rem',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            {t('inspector.reportIssue')}
          </Button>
        </Box>

        {/* Today's Schedule */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: 2,
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
            }}
          >
            {t('inspector.todaySchedule')}
          </Typography>

          {inspections.length === 0 ? (
            <Card>
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <EmptyState
                  icon={<AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
                  title={t('inspector.noInspections')}
                  description={t('inspector.noInspectionsDescription')}
                />
              </Box>
            </Card>
          ) : (
            <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {inspections.map((inspection) => (
                <Card key={inspection.id}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      px: { xs: 2, sm: 2.5 },
                      py: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%', mb: 1.5 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 2,
                          bgcolor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          mr: 1.5,
                        }}
                      >
                        <AssignmentIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body1"
                          fontWeight={600}
                          sx={{
                            mb: 0.5,
                            fontSize: '1rem',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {inspection.consultantType?.name || t('inspector.inspection')}
                        </Typography>
                        {inspection.consultantType?.nameHe && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            dir="rtl"
                            sx={{
                              display: 'block',
                              fontSize: '0.75rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {inspection.consultantType.nameHe}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {formatTime(inspection.scheduledDate)}
                        </Typography>
                      </Box>
                      {inspection.currentStage && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                          <LocationOnIcon sx={{ fontSize: 18, color: 'text.secondary', flexShrink: 0, mt: 0.25 }} />
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              fontSize: '0.875rem',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {inspection.currentStage}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {inspection.notes && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          mt: 1.5,
                          fontSize: '0.75rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5,
                        }}
                      >
                        {inspection.notes}
                      </Typography>
                    )}
                  </ListItem>
                </Card>
              ))}
            </List>
          )}
        </Box>
      </Box>
    </>
  )
}
