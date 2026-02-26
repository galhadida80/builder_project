import { useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { reportsApi } from '../api/reports'
import { useToast } from '../components/common/ToastProvider'
import { AssessmentIcon, CalendarTodayIcon, DateRangeIcon, CalendarMonthIcon, TuneIcon, DescriptionIcon, DownloadIcon, SearchIcon } from '@/icons'
import {
  Box,
  Typography,
  MenuItem,
  TextField as MuiTextField,
  Skeleton,
  Chip,
} from '@/mui'

export default function ReportsPage() {
  const { projectId } = useParams()
  const { showError } = useToast()
  const { t } = useTranslation()

  const [reportType, setReportType] = useState('inspection-summary')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(null)
  const [recentReports, setRecentReports] = useState<Array<{ type: string; dateRange: string; generatedAt: string }>>([])
  const reportConfigRef = useRef<HTMLDivElement>(null)

  const reportTypes = [
    { value: 'inspection-summary', label: t('reports.inspectionSummary') },
    { value: 'approval-status', label: t('reports.approvalStatus') },
    { value: 'rfi-aging', label: t('reports.rfiAging') },
  ]

  const formatDate = (d: Date) => d.toISOString().slice(0, 10)

  const addRecentReport = useCallback((type: string, from: string, to: string) => {
    const label = reportTypes.find(r => r.value === type)?.label || type
    setRecentReports(prev => [
      { type: label, dateRange: `${from} — ${to}`, generatedAt: new Date().toISOString() },
      ...prev.slice(0, 9),
    ])
  }, [reportTypes])

  const handleQuickAction = useCallback(async (days: number) => {
    if (!projectId) return
    const now = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - days)
    const fromStr = formatDate(from)
    const toStr = formatDate(now)

    setReportType('inspection-summary')
    setDateFrom(fromStr)
    setDateTo(toStr)
    setReportData(null)
    setLoading(true)

    try {
      const data = await reportsApi.getInspectionSummary(projectId, fromStr, toStr)
      setReportData(data)
      addRecentReport('inspection-summary', fromStr, toStr)

      const blob = await reportsApi.exportCsv(projectId, 'inspection-summary', fromStr, toStr)
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `inspection-summary-${days}d-report.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showError(t('reports.failedToGenerate'))
    } finally {
      setLoading(false)
    }
  }, [projectId, showError, t, addRecentReport])

  const handleCustomAction = useCallback(() => {
    setReportData(null)
    reportConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleGenerate = async () => {
    if (!projectId) return

    if (reportType !== 'rfi-aging' && (!dateFrom || !dateTo)) {
      showError(t('reports.dateRangeRequired'))
      return
    }

    setLoading(true)
    try {
      let data
      if (reportType === 'inspection-summary') {
        data = await reportsApi.getInspectionSummary(projectId, dateFrom, dateTo)
      } else if (reportType === 'approval-status') {
        data = await reportsApi.getApprovalStatus(projectId, dateFrom, dateTo)
      } else {
        data = await reportsApi.getRfiAging(projectId)
      }
      setReportData(data)
      if (dateFrom && dateTo) {
        addRecentReport(reportType, dateFrom, dateTo)
      } else if (reportType === 'rfi-aging') {
        addRecentReport(reportType, '', '')
      }
    } catch {
      showError(t('reports.failedToGenerate'))
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = async () => {
    if (!projectId) return
    try {
      const blob = await reportsApi.exportCsv(projectId, reportType, dateFrom || undefined, dateTo || undefined)
      const url = URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = `${reportType}-report.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showError(t('reports.exportFailed', 'Export failed'))
    }
  }

  const renderInspectionSummary = (data: Record<string, unknown>) => {
    const statusBreakdown = (data.status_breakdown || {}) as Record<string, number>
    const severityBreakdown = (data.severity_breakdown || {}) as Record<string, number>
    const findings = (data.findings || []) as Array<Record<string, string>>

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">{t('reports.totalInspections')}</Typography>
              <Typography variant="h5" fontWeight={700}>{data.total_inspections as number}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <Chip key={status} label={`${status}: ${count}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                ))}
              </Box>
            </Box>
          </Card>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">{t('reports.totalFindings')}</Typography>
              <Typography variant="h5" fontWeight={700}>{data.total_findings as number}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                {Object.entries(severityBreakdown).map(([severity, count]) => (
                  <Chip key={severity} label={`${severity}: ${count}`} size="small" color={severity === 'critical' ? 'error' : 'default'} variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
                ))}
              </Box>
            </Box>
          </Card>
        </Box>
        {findings.length > 0 && findings.map((f) => (
          <Card key={f.id}>
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                <Typography variant="body2" fontWeight={600}>{f.title}</Typography>
                <Chip label={f.severity} size="small" color={f.severity === 'critical' ? 'error' : 'default'} sx={{ height: 20, fontSize: '0.6rem' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">{f.status}</Typography>
                {f.location && <Typography variant="caption" color="text.secondary">{f.location}</Typography>}
              </Box>
            </Box>
          </Card>
        ))}
      </Box>
    )
  }

  const renderApprovalStatus = (data: Record<string, unknown>) => {
    const eqItems = (data.equipment_items || []) as Array<Record<string, string>>
    const matItems = (data.material_items || []) as Array<Record<string, string>>
    const allItems = [
      ...eqItems.map(i => ({ ...i, type: 'Equipment' } as Record<string, string>)),
      ...matItems.map(i => ({ ...i, type: 'Material' } as Record<string, string>)),
    ]

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">{t('reports.equipmentSubmissions')}</Typography>
              <Typography variant="h5" fontWeight={700}>{data.total_equipment_submissions as number}</Typography>
            </Box>
          </Card>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">{t('reports.materialSubmissions')}</Typography>
              <Typography variant="h5" fontWeight={700}>{data.total_material_submissions as number}</Typography>
            </Box>
          </Card>
        </Box>
        {allItems.map((item) => (
          <Card key={item.id}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" fontWeight={600}>{item.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.type} {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString()}` : ''}
                </Typography>
              </Box>
              <Chip label={item.status} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
            </Box>
          </Card>
        ))}
      </Box>
    )
  }

  const renderRfiAging = (data: Record<string, unknown>) => {
    const items = (data.items || []) as Array<Record<string, unknown>>
    const priorityBreakdown = (data.priority_breakdown || {}) as Record<string, { count: number; avg_age_days: number }>

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 0.5 }}>
          <Card sx={{ minWidth: 120, flex: 1 }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">{t('reports.totalOpenRfis')}</Typography>
              <Typography variant="h5" fontWeight={700}>{data.total_open_rfis as number}</Typography>
            </Box>
          </Card>
          {Object.entries(priorityBreakdown).map(([priority, info]) => (
            <Card key={priority} sx={{ minWidth: 120, flex: 1 }}>
              <Box sx={{ p: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 700 }}>{priority}</Typography>
                <Typography variant="h5" fontWeight={700}>{info.count}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  {t('reports.avgAge')}: {info.avg_age_days} {t('reports.days')}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>
        {items.map((item) => {
          const isUrgent = item.priority === 'urgent' || item.priority === 'high'
          return (
            <Card key={item.id as string} sx={{ borderInlineStart: '4px solid', borderInlineStartColor: isUrgent ? 'error.main' : 'info.main' }}>
              <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box>
                    <Chip label={item.rfi_number as string} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, mb: 0.5 }} />
                    <Typography variant="body2" fontWeight={600}>{item.subject as string}</Typography>
                  </Box>
                  <Typography variant="caption" fontWeight={700} color={isUrgent ? 'error.main' : 'text.secondary'}>
                    {item.age_days as number} {t('reports.days')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={item.priority as string} size="small" color={isUrgent ? 'error' : 'default'} sx={{ height: 20, fontSize: '0.6rem' }} />
                  <Typography variant="caption" color="text.secondary">{item.status as string}</Typography>
                </Box>
              </Box>
            </Card>
          )
        })}
      </Box>
    )
  }

  const renderReport = () => {
    if (!reportData) return null
    if (reportType === 'inspection-summary') return renderInspectionSummary(reportData)
    if (reportType === 'approval-status') return renderApprovalStatus(reportData)
    if (reportType === 'rfi-aging') return renderRfiAging(reportData)
    return null
  }

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
        {[
          { icon: <CalendarTodayIcon />, label: t('reports.dailyReport'), sub: t('reports.generateNow'), onClick: () => handleQuickAction(1) },
          { icon: <DateRangeIcon />, label: t('reports.weeklyReport'), sub: t('reports.generateNow'), onClick: () => handleQuickAction(7) },
          { icon: <CalendarMonthIcon />, label: t('reports.monthlyReport'), sub: t('reports.generateNow'), onClick: () => handleQuickAction(30) },
          { icon: <TuneIcon />, label: t('reports.customReport'), sub: t('reports.selectParameters'), onClick: handleCustomAction },
        ].map((item, idx) => (
          <Card key={idx} onClick={item.onClick} sx={{ textAlign: 'center', p: 2.5, cursor: 'pointer', opacity: loading ? 0.6 : 1, pointerEvents: loading ? 'none' : 'auto', '&:hover': { boxShadow: 3 } }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5, color: 'primary.main' }}>
              {item.icon}
            </Box>
            <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
            <Typography variant="caption" color="text.secondary">{item.sub}</Typography>
          </Card>
        ))}
      </Box>

      <Box ref={reportConfigRef} />
      <Card sx={{ mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="body2" fontWeight={700} sx={{ mb: 2, borderInlineStart: '4px solid', borderColor: 'primary.main', ps: 1.5 }}>
            {t('reports.reportType')}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <MuiTextField
              select
              fullWidth
              size="small"
              value={reportType}
              onChange={(e) => { setReportType(e.target.value); setReportData(null) }}
            >
              {reportTypes.map(rt => <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>)}
            </MuiTextField>

            {reportType !== 'rfi-aging' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <MuiTextField
                  fullWidth
                  size="small"
                  type="date"
                  label={t('reports.dateFrom')}
                  InputLabelProps={{ shrink: true }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <MuiTextField
                  fullWidth
                  size="small"
                  type="date"
                  label={t('reports.dateTo')}
                  InputLabelProps={{ shrink: true }}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button variant="primary" icon={<SearchIcon />} onClick={handleGenerate} fullWidth sx={{ boxShadow: 2, py: 1.2, fontWeight: 700 }}>
                {t('reports.generate')}
              </Button>
              {reportData && (
                <Button variant="secondary" icon={<DownloadIcon />} onClick={handleExportCsv} fullWidth>
                  CSV
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </Card>

      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
        </Box>
      ) : reportData ? (
        renderReport()
      ) : (
        <EmptyState
          title={t('reports.noReportGenerated')}
          description={t('reports.selectAndGenerate')}
          icon={<AssessmentIcon sx={{ color: 'text.secondary' }} />}
        />
      )}

      {recentReports.length > 0 && (
        <Card sx={{ mt: 2 }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="body2" fontWeight={700}>{t('reports.recentReports')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentReports.map((report, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'error.light', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DescriptionIcon sx={{ color: 'error.main', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{report.type}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {report.dateRange ? report.dateRange : new Date(report.generatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(report.generatedAt).toLocaleTimeString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Card>
      )}
    </Box>
  )
}
