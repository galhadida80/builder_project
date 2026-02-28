import { useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { TextField } from '../components/ui/TextField'
import FilterChips from '../components/ui/FilterChips'
import ReportResults from '../components/reports/ReportResults'
import ReportGenerationWizard from '../components/ReportGenerationWizard'
import ReportPreviewDialog from '../components/ReportPreviewDialog'
import { useAiReports } from '../hooks/useAiReports'
import { reportsApi } from '../api/reports'
import { useToast } from '../components/common/ToastProvider'
import { AssessmentIcon, CalendarTodayIcon, DateRangeIcon, CalendarMonthIcon, TuneIcon, DescriptionIcon, DownloadIcon, SearchIcon, AutoAwesomeIcon } from '@/icons'
import { Box, Typography, Skeleton, Alert } from '@/mui'

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

  const {
    wizardOpen,
    setWizardOpen,
    previewOpen,
    setPreviewOpen,
    previewHtml,
    previewTitle,
    handleGenerateAiReport,
    handleDownloadPdf,
  } = useAiReports(projectId)

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

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: '100%', overflow: 'hidden' }}>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
      />

      <Alert severity="info" icon={<AutoAwesomeIcon />} sx={{ mb: 2 }}>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
          {t('reports.aiReportsTitle', 'AI-Powered Reports')}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t('reports.aiReportsDescription', 'Generate comprehensive reports with AI-written narratives, charts, and insights.')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="primary"
            size="small"
            icon={<AutoAwesomeIcon />}
            onClick={() => setWizardOpen(true)}
            sx={{ fontWeight: 600 }}
          >
            {t('reports.generateAiReport', 'Generate AI Report')}
          </Button>
        </Box>
      </Alert>

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
            <FilterChips
              items={reportTypes.map(rt => ({ label: rt.label, value: rt.value }))}
              value={reportType}
              onChange={(v) => { setReportType(v); setReportData(null) }}
            />

            {reportType !== 'rfi-aging' && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TextField
                  fullWidth
                  type="date"
                  label={t('reports.dateFrom')}
                  InputLabelProps={{ shrink: true }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <TextField
                  fullWidth
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
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={100} sx={{ borderRadius: 2 }} />
          </Box>
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
        </Box>
      ) : reportData ? (
        <ReportResults reportType={reportType} reportData={reportData} />
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

      <ReportGenerationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerate={handleGenerateAiReport}
      />

      <ReportPreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        htmlContent={previewHtml}
        reportTitle={previewTitle}
        onDownloadPdf={handleDownloadPdf}
      />
    </Box>
  )
}
