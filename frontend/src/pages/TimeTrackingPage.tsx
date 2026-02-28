import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { PageHeader } from '../components/ui/Breadcrumbs'
import ClockInButton from '../components/timeTracking/ClockInButton'
import AttendanceReport from '../components/timeTracking/AttendanceReport'
import TimesheetApproval from '../components/timeTracking/TimesheetApproval'
import LaborCostReport from '../components/timeTracking/LaborCostReport'
import { timeTrackingApi } from '../api/timeTracking'
import type { TimeEntry, Timesheet } from '../types/timeTracking'
import { useToast } from '../components/common/ToastProvider'
import { getDateLocale } from '../utils/dateLocale'
import { AccessTimeIcon, AssessmentIcon, ApprovalIcon, AttachMoneyIcon } from '@/icons'
import { Box, Typography, Skeleton } from '@/mui'

export default function TimeTrackingPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const { showError } = useToast()

  const [activeTab, setActiveTab] = useState('clock')
  const [loading, setLoading] = useState(true)
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])

  useEffect(() => {
    if (projectId) loadData()
  }, [projectId])

  const loadData = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const [activeEntryData, timesheetsData] = await Promise.all([
        timeTrackingApi.getActiveEntry(projectId).catch(() => null),
        timeTrackingApi.listTimesheets(projectId).catch(() => []),
      ])
      setActiveEntry(activeEntryData)
      setTimesheets(timesheetsData)
    } catch {
      showError(t('timeTracking.loadFailed', { defaultValue: 'Failed to load time tracking data' }))
    } finally {
      setLoading(false)
    }
  }

  const handleClockAction = () => {
    loadData()
  }

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
        <Skeleton variant="text" width={350} height={48} sx={{ mb: 1 }} />
        <Skeleton variant="rounded" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )
  }

  const tabs = [
    {
      value: 'clock',
      label: t('timeTracking.clockInOut', { defaultValue: 'Clock In/Out' }),
      icon: <AccessTimeIcon />,
    },
    {
      value: 'attendance',
      label: t('timeTracking.attendance', { defaultValue: 'Attendance' }),
      icon: <AssessmentIcon />,
    },
    {
      value: 'timesheets',
      label: t('timeTracking.timesheets', { defaultValue: 'Timesheets' }),
      icon: <ApprovalIcon />,
    },
    {
      value: 'laborCosts',
      label: t('timeTracking.laborCosts', { defaultValue: 'Labor Costs' }),
      icon: <AttachMoneyIcon />,
    },
  ]

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('timeTracking.title', { defaultValue: 'Time Tracking & Workforce' })}
        subtitle={t('timeTracking.subtitle', { defaultValue: 'Track work hours, manage timesheets, and monitor labor costs' })}
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={tabs}
        sx={{ mb: 3 }}
      />

      {activeTab === 'clock' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
              {t('timeTracking.clockInOut', { defaultValue: 'Clock In/Out' })}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('timeTracking.clockDescription', { defaultValue: 'Record your work hours with GPS location tracking' })}
            </Typography>
            <ClockInButton projectId={projectId!} onClockAction={handleClockAction} />
          </Card>

          {activeEntry && (
            <Card sx={{ p: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                {t('timeTracking.activeShift', { defaultValue: 'Active Shift' })}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('timeTracking.clockedInAt', { defaultValue: 'Clocked in at' })}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(activeEntry.clockInTime).toLocaleTimeString(getDateLocale(), {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Typography>
                </Box>
                {activeEntry.locationLat && activeEntry.locationLng && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('timeTracking.location', { defaultValue: 'Location' })}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {activeEntry.locationLat.toFixed(6)}, {activeEntry.locationLng.toFixed(6)}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Card>
          )}

          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
              {t('timeTracking.quickStats', { defaultValue: 'Quick Stats' })}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(224, 120, 66, 0.08)',
                  border: '1px solid',
                  borderColor: 'rgba(224, 120, 66, 0.2)',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {t('timeTracking.pendingTimesheets', { defaultValue: 'Pending Timesheets' })}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#e07842' }}>
                  {timesheets.filter(ts => ts.status === 'submitted').length}
                </Typography>
              </Box>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(46, 125, 50, 0.08)',
                  border: '1px solid',
                  borderColor: 'rgba(46, 125, 50, 0.2)',
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  {t('timeTracking.approvedTimesheets', { defaultValue: 'Approved Timesheets' })}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#2e7d32' }}>
                  {timesheets.filter(ts => ts.status === 'approved').length}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      )}

      {activeTab === 'attendance' && (
        <Card sx={{ p: 3 }}>
          <AttendanceReport projectId={projectId!} />
        </Card>
      )}

      {activeTab === 'timesheets' && (
        <Card sx={{ p: 3 }}>
          <TimesheetApproval projectId={projectId!} onUpdate={loadData} />
        </Card>
      )}

      {activeTab === 'laborCosts' && (
        <Card sx={{ p: 3 }}>
          <LaborCostReport projectId={projectId!} />
        </Card>
      )}
    </Box>
  )
}
