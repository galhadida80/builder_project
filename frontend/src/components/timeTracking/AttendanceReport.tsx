import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { timeTrackingApi } from '../../api/timeTracking'
import type { AttendanceReport as AttendanceReportType, AttendanceReportEntry } from '../../types/timeTracking'
import { useToast } from '../common/ToastProvider'
import { DownloadIcon, AccessTimeIcon } from '@/icons'
import {
  Box,
  Typography,
  Skeleton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from '@/mui'

const today = () => new Date().toISOString().slice(0, 10)
const weekAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().slice(0, 10)
}

export default function AttendanceReport() {
  const { t, i18n } = useTranslation()
  const { projectId } = useParams()
  const { showError, showSuccess } = useToast()
  const dateLocale = getDateLocale(i18n.language)

  const [report, setReport] = useState<AttendanceReportType | null>(null)
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dateFrom, setDateFrom] = useState(weekAgo())
  const [dateTo, setDateTo] = useState(today())

  useEffect(() => {
    if (projectId && dateFrom && dateTo) {
      loadReport()
    }
  }, [projectId, dateFrom, dateTo])

  const loadReport = async () => {
    if (!projectId || !dateFrom || !dateTo) return
    setLoading(true)
    try {
      const data = await timeTrackingApi.getAttendanceReport(projectId, dateFrom, dateTo)
      setReport(data)
    } catch {
      showError(t('timeTracking.loadFailed', { defaultValue: 'Failed to load data' }))
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = async () => {
    if (!projectId || !dateFrom || !dateTo) return
    setExporting(true)
    try {
      const blob = await timeTrackingApi.exportPayroll(projectId, dateFrom, dateTo)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${dateFrom}-${dateTo}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccess(t('timeTracking.exportCsv', { defaultValue: 'Export CSV' }))
    } catch {
      showError(t('timeTracking.loadFailed', { defaultValue: 'Failed to load data' }))
    } finally {
      setExporting(false)
    }
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-'
    return new Date(isoString).toLocaleTimeString(dateLocale, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(dateLocale, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatHours = (hours: number) => {
    return t('timeTracking.hours', { hours: hours.toFixed(2), defaultValue: '{{hours}} hours' })
  }

  if (loading) {
    return (
      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Skeleton variant="text" width={200} height={32} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ flex: 1 }} />
          <Skeleton variant="rounded" height={56} sx={{ width: { xs: '100%', sm: 120 } }} />
        </Box>
        <Skeleton variant="rounded" height={300} />
      </Card>
    )
  }

  const entries = report?.entries || []
  const groupedByDate = entries.reduce((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = []
    acc[entry.date].push(entry)
    return acc
  }, {} as Record<string, AttendanceReportEntry[]>)

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          {t('timeTracking.attendanceReport', { defaultValue: 'Attendance Report' })}
        </Typography>
        {entries.length > 0 && (
          <Button
            variant="secondary"
            size="small"
            icon={<DownloadIcon />}
            onClick={handleExportCsv}
            loading={exporting}
          >
            {t('timeTracking.exportCsv', { defaultValue: 'Export CSV' })}
          </Button>
        )}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
        <TextField
          label={t('timeTracking.dateFrom', { defaultValue: 'Date From' })}
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          label={t('timeTracking.dateTo', { defaultValue: 'Date To' })}
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          size="small"
          fullWidth
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      {entries.length === 0 ? (
        <EmptyState
          icon={<AccessTimeIcon sx={{ fontSize: 64 }} />}
          title={t('timeTracking.noAttendanceData', { defaultValue: 'No attendance data' })}
          description={t('timeTracking.noAttendanceDataDesc', {
            defaultValue: 'Select a date range to view attendance data',
          })}
        />
      ) : (
        <>
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('timeTracking.totalHours', { defaultValue: 'Total Hours' })}:{' '}
              <Typography component="span" variant="body1" fontWeight={600}>
                {formatHours(report?.totalHours || 0)}
              </Typography>
            </Typography>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('timeTracking.date', { defaultValue: 'Date' })}</TableCell>
                    <TableCell>{t('timeTracking.worker', { defaultValue: 'Worker' })}</TableCell>
                    <TableCell>{t('timeTracking.clockInTime', { defaultValue: 'Clock In' })}</TableCell>
                    <TableCell>{t('timeTracking.clockOutTime', { defaultValue: 'Clock Out' })}</TableCell>
                    <TableCell align="right">{t('timeTracking.totalHours', { defaultValue: 'Total Hours' })}</TableCell>
                    <TableCell>{t('timeTracking.status', { defaultValue: 'Status' })}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedDates.map((date) =>
                    groupedByDate[date].map((entry) => (
                      <TableRow key={`${entry.userId}-${entry.date}`} hover>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>{entry.userName}</TableCell>
                        <TableCell>{formatTime(entry.clockInTime)}</TableCell>
                        <TableCell>{formatTime(entry.clockOutTime)}</TableCell>
                        <TableCell align="right">{entry.totalHours.toFixed(2)}</TableCell>
                        <TableCell>
                          <Chip
                            label={
                              entry.status === 'active'
                                ? t('timeTracking.active', { defaultValue: 'Active' })
                                : t('timeTracking.completed', { defaultValue: 'Completed' })
                            }
                            size="small"
                            color={entry.status === 'active' ? 'info' : 'success'}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {sortedDates.map((date) => (
              <Box key={date}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1, color: 'text.secondary' }}>
                  {formatDate(date)}
                </Typography>
                {groupedByDate[date].map((entry) => (
                  <Card
                    key={`${entry.userId}-${entry.date}`}
                    sx={{ p: 2, mb: 1, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1" fontWeight={600}>
                        {entry.userName}
                      </Typography>
                      <Chip
                        label={
                          entry.status === 'active'
                            ? t('timeTracking.active', { defaultValue: 'Active' })
                            : t('timeTracking.completed', { defaultValue: 'Completed' })
                        }
                        size="small"
                        color={entry.status === 'active' ? 'info' : 'success'}
                      />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, fontSize: '0.875rem' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('timeTracking.clockInTime', { defaultValue: 'Clock In' })}
                        </Typography>
                        <Typography variant="body2">{formatTime(entry.clockInTime)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('timeTracking.clockOutTime', { defaultValue: 'Clock Out' })}
                        </Typography>
                        <Typography variant="body2">{formatTime(entry.clockOutTime)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {t('timeTracking.totalHours', { defaultValue: 'Total Hours' })}
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {entry.totalHours.toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            ))}
          </Box>
        </>
      )}
    </Card>
  )
}
