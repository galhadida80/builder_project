import { useState, useEffect } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getDateLocale } from '../../utils/dateLocale'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { timeTrackingApi } from '../../api/timeTracking'
import type { LaborCostReport as LaborCostReportType, LaborCostReportEntry } from '../../types/timeTracking'
import { useToast } from '../common/ToastProvider'
import { AttachMoneyIcon, ArrowForwardIcon } from '@/icons'
import {
  Box,
  Typography,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Link,
} from '@/mui'

const fmt = (n: number) =>
  n.toLocaleString(getDateLocale(), { style: 'currency', currency: 'ILS', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const today = () => new Date().toISOString().slice(0, 10)
const monthAgo = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 10)
}

export default function LaborCostReport() {
  const { t, i18n } = useTranslation()
  const { projectId } = useParams()
  const { showError } = useToast()
  const dateLocale = getDateLocale(i18n.language)

  const [report, setReport] = useState<LaborCostReportType | null>(null)
  const [loading, setLoading] = useState(false)
  const [dateFrom, setDateFrom] = useState(monthAgo())
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
      const data = await timeTrackingApi.getLaborCostReport(projectId, dateFrom, dateTo)
      setReport(data)
    } catch {
      showError(t('timeTracking.loadFailed', { defaultValue: 'Failed to load data' }))
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString(dateLocale, {
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
        </Box>
        <Skeleton variant="rounded" height={300} />
      </Card>
    )
  }

  const entries = report?.entries || []

  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          {t('timeTracking.laborCostReport', { defaultValue: 'Labor Cost Report' })}
        </Typography>
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
          icon={<AttachMoneyIcon sx={{ fontSize: 64 }} />}
          title={t('timeTracking.noLaborCostData', { defaultValue: 'No labor cost data' })}
          description={t('timeTracking.noLaborCostDataDesc', {
            defaultValue: 'Select a date range to view labor cost data',
          })}
        />
      ) : (
        <>
          <Box sx={{ mb: 3, p: 2.5, bgcolor: 'background.default', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5, display: 'block' }}>
              {t('timeTracking.period', { defaultValue: 'Period' })}: {formatDate(report?.dateFrom || dateFrom)} - {formatDate(report?.dateTo || dateTo)}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('timeTracking.totalRegularHours', { defaultValue: 'Regular Hours' })}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {formatHours(report?.totalRegularHours || 0)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  {t('timeTracking.totalOvertimeHours', { defaultValue: 'Overtime Hours' })}
                </Typography>
                <Typography variant="h6" fontWeight={700}>
                  {formatHours(report?.totalOvertimeHours || 0)}
                </Typography>
              </Box>
              <Box sx={{ gridColumn: { sm: 'span 2', md: 'auto' } }}>
                <Typography variant="caption" color="text.secondary">
                  {t('timeTracking.totalLaborCost', { defaultValue: 'Total Labor Cost' })}
                </Typography>
                <Typography variant="h5" fontWeight={800} color="primary.main">
                  {fmt(report?.totalCost || 0)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('timeTracking.worker', { defaultValue: 'Worker' })}</TableCell>
                    <TableCell align="right">{t('timeTracking.regularHours', { defaultValue: 'Regular' })}</TableCell>
                    <TableCell align="right">{t('timeTracking.overtimeHours', { defaultValue: 'Overtime' })}</TableCell>
                    <TableCell align="right">{t('timeTracking.regularCost', { defaultValue: 'Regular Cost' })}</TableCell>
                    <TableCell align="right">{t('timeTracking.overtimeCost', { defaultValue: 'Overtime Cost' })}</TableCell>
                    <TableCell align="right">{t('timeTracking.totalCost', { defaultValue: 'Total Cost' })}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {entries
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map((entry) => (
                      <TableRow key={entry.userId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {entry.userName}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{entry.regularHours.toFixed(2)}</TableCell>
                        <TableCell align="right">{entry.overtimeHours.toFixed(2)}</TableCell>
                        <TableCell align="right">{fmt(entry.regularCost)}</TableCell>
                        <TableCell align="right">{fmt(entry.overtimeCost)}</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}>
                            {fmt(entry.totalCost)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  <TableRow sx={{ bgcolor: 'background.default' }}>
                    <TableCell>
                      <Typography variant="body1" fontWeight={700}>
                        {t('budget.total', { defaultValue: 'Total' })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {(report?.totalRegularHours || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {(report?.totalOvertimeHours || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {fmt(report?.totalRegularCost || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700}>
                        {fmt(report?.totalOvertimeCost || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="h6" fontWeight={800} color="primary.main">
                        {fmt(report?.totalCost || 0)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
            {entries
              .sort((a, b) => b.totalCost - a.totalCost)
              .map((entry) => (
                <Card
                  key={entry.userId}
                  sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}
                >
                  <Typography variant="body1" fontWeight={700} sx={{ mb: 2 }}>
                    {entry.userName}
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, fontSize: '0.875rem' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('timeTracking.regularHours', { defaultValue: 'Regular' })}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {entry.regularHours.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('timeTracking.overtimeHours', { defaultValue: 'Overtime' })}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {entry.overtimeHours.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('timeTracking.regularCost', { defaultValue: 'Regular Cost' })}
                      </Typography>
                      <Typography variant="body2">{fmt(entry.regularCost)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        {t('timeTracking.overtimeCost', { defaultValue: 'Overtime Cost' })}
                      </Typography>
                      <Typography variant="body2">{fmt(entry.overtimeCost)}</Typography>
                    </Box>
                    <Box sx={{ gridColumn: 'span 2', pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="caption" color="text.secondary">
                        {t('timeTracking.totalCost', { defaultValue: 'Total Cost' })}
                      </Typography>
                      <Typography variant="h6" fontWeight={700} color="primary.main">
                        {fmt(entry.totalCost)}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              ))}
          </Box>

          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
            <Link
              component={RouterLink}
              to={`/projects/${projectId}/budget`}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, textDecoration: 'none' }}
            >
              {t('timeTracking.viewBudget', { defaultValue: 'View Budget Details' })}
              <ArrowForwardIcon sx={{ fontSize: 16 }} />
            </Link>
          </Box>
        </>
      )}
    </Card>
  )
}
