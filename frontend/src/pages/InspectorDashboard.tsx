import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

import type { Inspection } from '../types'
import { inspectionsApi } from '../api/inspections'
import { getDateLocale } from '../utils/dateLocale'
import { useProject } from '../contexts/ProjectContext'
import { EngineeringIcon, NotificationsIcon, CalendarTodayIcon, LocationOnIcon, AssignmentIcon, SignalWifiOffIcon, TrendingUpIcon, WarningIcon } from '@/icons'
import { Box, Typography, Skeleton, Chip } from '@/mui'

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

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayInspections = allInspections.filter(inspection => {
        const scheduledDate = new Date(inspection.scheduledDate)
        return scheduledDate >= today && scheduledDate < tomorrow
      })

      setInspections(todayInspections)
    } catch {
      setInspections([])
    } finally {
      setLoading(false)
    }
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
      <Box sx={{ maxWidth: 428, mx: 'auto', px: 2, py: 2, pb: 10 }}>
        <Skeleton variant="text" width={200} height={36} sx={{ mb: 1 }} />
        <Skeleton variant="text" width={160} height={20} sx={{ mb: 3 }} />
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3, mb: 3 }} />
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} variant="rounded" height={72} sx={{ flex: 1, borderRadius: 3 }} />
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 428, mx: 'auto', pb: 10, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{
        position: 'sticky', top: 0, zIndex: 20,
        bgcolor: 'background.default', px: 2, py: 1.5,
        borderBottom: 1, borderColor: 'divider',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EngineeringIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Typography variant="h6" fontWeight={700} letterSpacing='-0.02em'>
            {t('inspector.title')}
          </Typography>
        </Box>
        {isOffline ? (
          <Chip
            icon={<SignalWifiOffIcon sx={{ fontSize: 14 }} />}
            label={t('inspector.offline')}
            size="small"
            sx={{ bgcolor: 'error.main', color: 'white', fontWeight: 600, fontSize: '0.7rem', height: 24 }}
          />
        ) : (
          <Box sx={{ position: 'relative', p: 1 }}>
            <NotificationsIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
            <Box sx={{ position: 'absolute', top: 8, insetInlineEnd: 8, width: 8, height: 8, bgcolor: 'primary.main', borderRadius: '50%' }} />
          </Box>
        )}
      </Box>

      <Box sx={{ px: 2, py: 3 }}>
        <Typography variant="h5" fontWeight={700}>
          {t('inspector.goodMorning', 'Good morning')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {new Date().toLocaleDateString(getDateLocale(), { weekday: 'long', month: 'long', day: 'numeric' })}
        </Typography>
      </Box>

      <Box sx={{ px: 2, mb: 3 }}>
        <Box sx={{
          bgcolor: 'background.paper', borderRadius: 3, overflow: 'hidden',
          border: 1, borderColor: 'divider',
        }}>
          <Box sx={{
            p: 2, borderBottom: 1, borderColor: 'divider',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Box>
              <Typography variant="body1" fontWeight={700}>
                {t('inspector.todaySchedule')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {inspections.length} {t('inspector.scheduledInspections', 'scheduled inspections')}
              </Typography>
            </Box>
            <CalendarTodayIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          </Box>

          {inspections.length === 0 ? (
            <Box sx={{ p: 3 }}>
              <EmptyState
                icon={<AssignmentIcon sx={{ fontSize: 48, color: 'text.secondary' }} />}
                title={t('inspector.noInspections')}
                description={t('inspector.noInspectionsDescription')}
              />
            </Box>
          ) : (
            <Box>
              {inspections.map((inspection, idx) => {
                const isFirst = idx === 0
                return (
                  <Box
                    key={inspection.id}
                    sx={{
                      p: 2,
                      borderBottom: idx < inspections.length - 1 ? 1 : 0,
                      borderColor: 'divider',
                      ...(isFirst && {
                        bgcolor: (theme) => theme.palette.mode === 'dark' ? 'rgba(242,140,38,0.05)' : 'rgba(242,140,38,0.03)',
                        borderInlineStart: 4, borderInlineStartColor: 'primary.main',
                      }),
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box>
                        <Typography variant="caption" color={isFirst ? 'primary.main' : 'text.secondary'} fontWeight={500}>
                          {formatTime(inspection.scheduledDate)}
                          {inspection.currentStage && ` · ${inspection.currentStage}`}
                        </Typography>
                        <Typography variant="body2" fontWeight={600} sx={{ mt: 0.25 }}>
                          {inspection.consultantType?.name || t('inspector.inspection')}
                        </Typography>
                      </Box>
                      {isFirst ? (
                        <Chip
                          label={t('inspector.upcoming', 'Upcoming')}
                          size="small"
                          sx={{
                            bgcolor: 'primary.main', color: 'primary.contrastText',
                            fontWeight: 700, fontSize: '0.6rem', height: 22,
                          }}
                        />
                      ) : (
                        <Chip
                          label={t('inspector.scheduled', 'Scheduled')}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.6rem', height: 22, bgcolor: 'action.hover' }}
                        />
                      )}
                    </Box>
                    {isFirst && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                        {inspection.currentStage && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationOnIcon sx={{ fontSize: 14 }} />
                            {inspection.currentStage}
                          </Typography>
                        )}
                        <Button variant="primary" size="small" sx={{ fontWeight: 700 }}>
                          {t('inspector.startInspection')}
                        </Button>
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, px: 2, mb: 3, overflowX: 'auto' }}>
        <Box sx={{
          minWidth: 130, flexShrink: 0, bgcolor: 'background.paper', p: 2, borderRadius: 3,
          border: 1, borderColor: 'divider',
        }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem" fontWeight={500}>
            {t('inspector.monthInspections', 'This month')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, mt: 0.5 }}>
            <Typography variant="h5" fontWeight={700} lineHeight={1}>
              {inspections.length}
            </Typography>
            <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16 }} />
          </Box>
        </Box>
        <Box sx={{
          minWidth: 130, flexShrink: 0, bgcolor: 'background.paper', p: 2, borderRadius: 3,
          border: 1, borderColor: 'divider',
        }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem" fontWeight={500}>
            {t('inspector.defectsFound', 'Defects found')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, mt: 0.5 }}>
            <Typography variant="h5" fontWeight={700} lineHeight={1}>0</Typography>
            <WarningIcon sx={{ color: 'warning.main', fontSize: 16 }} />
          </Box>
        </Box>
        <Box sx={{
          minWidth: 130, flexShrink: 0, bgcolor: 'background.paper', p: 2, borderRadius: 3,
          border: 1, borderColor: 'divider',
        }}>
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem" fontWeight={500}>
            {t('inspector.complianceRate', 'Compliance')}
          </Typography>
          <Typography variant="h5" fontWeight={700} lineHeight={1} color="primary.main" sx={{ mt: 0.5 }}>
            --
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
