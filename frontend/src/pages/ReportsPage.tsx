import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageHeader } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { reportsApi } from '../api/reports'
import { useToast } from '../components/common/ToastProvider'
import { AssessmentIcon, DownloadIcon, SearchIcon } from '@/icons'
import {
  Box,
  Typography,
  MenuItem,
  TextField as MuiTextField,
  Skeleton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

  const reportTypes = [
    { value: 'inspection-summary', label: t('reports.inspectionSummary') },
    { value: 'approval-status', label: t('reports.approvalStatus') },
    { value: 'rfi-aging', label: t('reports.rfiAging') },
  ]

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
    } catch {
      showError(t('reports.failedToGenerate'))
    } finally {
      setLoading(false)
    }
  }

  const handleExportCsv = () => {
    if (!projectId) return
    const url = reportsApi.getExportUrl(projectId, reportType, dateFrom || undefined, dateTo || undefined)
    window.open(url, '_blank')
  }

  const renderInspectionSummary = (data: Record<string, unknown>) => {
    const statusBreakdown = (data.status_breakdown || {}) as Record<string, number>
    const severityBreakdown = (data.severity_breakdown || {}) as Record<string, number>
    const findings = (data.findings || []) as Array<Record<string, string>>

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('reports.totalInspections')}</Typography>
              <Typography variant="h4" fontWeight={700}>{data.total_inspections as number}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <Chip key={status} label={`${status}: ${count}`} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          </Card>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('reports.totalFindings')}</Typography>
              <Typography variant="h4" fontWeight={700}>{data.total_findings as number}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                {Object.entries(severityBreakdown).map(([severity, count]) => (
                  <Chip key={severity} label={`${severity}: ${count}`} size="small" color={severity === 'critical' ? 'error' : 'default'} variant="outlined" />
                ))}
              </Box>
            </Box>
          </Card>
        </Box>
        {findings.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.finding')}</TableCell>
                  <TableCell>{t('reports.severity')}</TableCell>
                  <TableCell>{t('reports.status')}</TableCell>
                  <TableCell>{t('reports.location')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {findings.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.title}</TableCell>
                    <TableCell><Chip label={f.severity} size="small" color={f.severity === 'critical' ? 'error' : 'default'} /></TableCell>
                    <TableCell>{f.status}</TableCell>
                    <TableCell>{f.location || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    )
  }

  const renderApprovalStatus = (data: Record<string, unknown>) => {
    interface ApprovalItem {
      id: string
      name: string
      status: string
      created_at: string
      type: string
    }
    
    const eqItems = (data.equipment_items || []) as Array<Omit<ApprovalItem, 'type'>>
    const matItems = (data.material_items || []) as Array<Omit<ApprovalItem, 'type'>>
    const allItems: ApprovalItem[] = [...eqItems.map(i => ({ ...i, type: 'Equipment' })), ...matItems.map(i => ({ ...i, type: 'Material' }))]

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('reports.equipmentSubmissions')}</Typography>
              <Typography variant="h4" fontWeight={700}>{data.total_equipment_submissions as number}</Typography>
            </Box>
          </Card>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('reports.materialSubmissions')}</Typography>
              <Typography variant="h4" fontWeight={700}>{data.total_material_submissions as number}</Typography>
            </Box>
          </Card>
        </Box>
        {allItems.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.name')}</TableCell>
                  <TableCell>{t('reports.type')}</TableCell>
                  <TableCell>{t('reports.status')}</TableCell>
                  <TableCell>{t('reports.createdAt')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell><Chip label={item.type} size="small" variant="outlined" /></TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>{item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    )
  }

  const renderRfiAging = (data: Record<string, unknown>) => {
    const items = (data.items || []) as Array<Record<string, unknown>>
    const priorityBreakdown = (data.priority_breakdown || {}) as Record<string, { count: number; avg_age_days: number }>

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
          <Card>
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">{t('reports.totalOpenRfis')}</Typography>
              <Typography variant="h4" fontWeight={700}>{data.total_open_rfis as number}</Typography>
            </Box>
          </Card>
          {Object.entries(priorityBreakdown).map(([priority, info]) => (
            <Card key={priority}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">{priority.toUpperCase()}</Typography>
                <Typography variant="h5" fontWeight={700}>{info.count}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('reports.avgAge')}: {info.avg_age_days} {t('reports.days')}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>
        {items.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('reports.rfiNumber')}</TableCell>
                  <TableCell>{t('reports.subject')}</TableCell>
                  <TableCell>{t('reports.priority')}</TableCell>
                  <TableCell>{t('reports.ageDays')}</TableCell>
                  <TableCell>{t('reports.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id as string}>
                    <TableCell>{item.rfi_number as string}</TableCell>
                    <TableCell>{item.subject as string}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.priority as string}
                        size="small"
                        color={(item.priority === 'urgent' || item.priority === 'high') ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{item.age_days as number}</TableCell>
                    <TableCell>{item.status as string}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
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
        breadcrumbs={[{ label: t('nav.projects'), href: '/projects' }, { label: t('reports.title') }]}
      />

      <Card>
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr auto auto' }, gap: 2, alignItems: 'center', mb: 3 }}>
            <MuiTextField
              select
              fullWidth
              label={t('reports.reportType')}
              value={reportType}
              onChange={(e) => { setReportType(e.target.value); setReportData(null) }}
            >
              {reportTypes.map(rt => <MenuItem key={rt.value} value={rt.value}>{rt.label}</MenuItem>)}
            </MuiTextField>

            {reportType !== 'rfi-aging' && (
              <>
                <MuiTextField
                  fullWidth
                  type="date"
                  label={t('reports.dateFrom')}
                  InputLabelProps={{ shrink: true }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <MuiTextField
                  fullWidth
                  type="date"
                  label={t('reports.dateTo')}
                  InputLabelProps={{ shrink: true }}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </>
            )}

            <Button variant="primary" icon={<SearchIcon />} onClick={handleGenerate}>
              {t('reports.generate')}
            </Button>

            {reportData && (
              <Button variant="secondary" icon={<DownloadIcon />} onClick={handleExportCsv}>
                {t('reports.exportCsv')}
              </Button>
            )}
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="rounded" height={100} />
              <Skeleton variant="rounded" height={200} />
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
        </Box>
      </Card>
    </Box>
  )
}
