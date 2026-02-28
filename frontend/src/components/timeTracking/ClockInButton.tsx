import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Box, Typography, CircularProgress, Stack } from '@/mui'
import { AccessTimeIcon, LocationOnIcon, StopCircleIcon } from '@/icons'
import { Button } from '../ui/Button'
import { useToast } from '../common/ToastProvider'
import { timeTrackingApi } from '../../api/timeTracking'
import type { TimeEntry } from '../../types/timeTracking'
import { getDateLocale } from '../../utils/dateLocale'

export default function ClockInButton() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
  const [gpsPermission, setGpsPermission] = useState<PermissionState | null>(null)

  useEffect(() => {
    if (!projectId) return
    loadActiveEntry()
    checkGpsPermission()
  }, [projectId])

  const checkGpsPermission = async () => {
    if (!navigator.permissions) return
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      setGpsPermission(result.state)
      result.addEventListener('change', () => setGpsPermission(result.state))
    } catch {
      setGpsPermission(null)
    }
  }

  const loadActiveEntry = async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const entry = await timeTrackingApi.getActiveEntry(projectId)
      setActiveEntry(entry)
    } catch {
      setActiveEntry(null)
    } finally {
      setLoading(false)
    }
  }

  const getGpsLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error(t('timeTracking.gpsNotSupported')))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          reject(error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    })
  }

  const handleClockIn = async () => {
    if (!projectId) return
    setRequesting(true)
    try {
      const location = await getGpsLocation()
      const entry = await timeTrackingApi.clockIn(projectId, {
        clockInTime: new Date().toISOString(),
        locationLat: location.lat,
        locationLng: location.lng,
      })
      setActiveEntry(entry)
      showSuccess(t('timeTracking.clockInSuccess'))
    } catch (error) {
      if (error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          showError(t('timeTracking.gpsPermissionDenied'))
        } else if (error.code === error.TIMEOUT) {
          showError(t('timeTracking.gpsTimeout'))
        } else {
          showError(t('timeTracking.gpsUnavailable'))
        }
      } else {
        showError(t('timeTracking.clockInError'))
      }
    } finally {
      setRequesting(false)
    }
  }

  const handleClockOut = async () => {
    if (!projectId) return
    setRequesting(true)
    try {
      await timeTrackingApi.clockOut(projectId, 0)
      setActiveEntry(null)
      showSuccess(t('timeTracking.clockOutSuccess'))
    } catch {
      showError(t('timeTracking.clockOutError'))
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  const isClockIn = !activeEntry

  return (
    <Box sx={{ p: 2 }}>
      <Button
        variant={isClockIn ? 'success' : 'danger'}
        loading={requesting}
        onClick={isClockIn ? handleClockIn : handleClockOut}
        icon={isClockIn ? <AccessTimeIcon /> : <StopCircleIcon />}
        iconPosition="start"
        fullWidth
        sx={{
          py: 3,
          fontSize: { xs: '1.25rem', sm: '1.1rem' },
          minHeight: { xs: '80px', sm: '64px' },
        }}
      >
        {isClockIn ? t('timeTracking.clockIn') : t('timeTracking.clockOut')}
      </Button>

      {!isClockIn && activeEntry && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {t('timeTracking.activeShift')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <AccessTimeIcon fontSize="small" />
            <Typography variant="body1">
              {t('timeTracking.clockedInAt', {
                time: new Date(activeEntry.clockInTime).toLocaleTimeString(getDateLocale()),
              })}
            </Typography>
          </Stack>
          {activeEntry.locationLat && activeEntry.locationLng && (
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <LocationOnIcon fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {activeEntry.locationLat.toFixed(6)}, {activeEntry.locationLng.toFixed(6)}
              </Typography>
            </Stack>
          )}
        </Box>
      )}

      {isClockIn && gpsPermission === 'denied' && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography variant="body2" color="error.dark">
            {t('timeTracking.gpsPermissionRequired')}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
