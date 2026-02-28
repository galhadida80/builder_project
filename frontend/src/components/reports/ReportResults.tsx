import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { Box, Typography, Chip } from '@/mui'
import { getDateLocale } from '../../utils/dateLocale'

interface ReportResultsProps {
  reportType: string
  reportData: Record<string, unknown>
}

function InspectionSummary({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation()
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

function ApprovalStatus({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation()
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
                {item.type} {item.created_at ? ` · ${new Date(item.created_at).toLocaleDateString(getDateLocale())}` : ''}
              </Typography>
            </Box>
            <Chip label={item.status} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />
          </Box>
        </Card>
      ))}
    </Box>
  )
}

function RfiAging({ data }: { data: Record<string, unknown> }) {
  const { t } = useTranslation()
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

export default function ReportResults({ reportType, reportData }: ReportResultsProps) {
  if (reportType === 'inspection-summary') return <InspectionSummary data={reportData} />
  if (reportType === 'approval-status') return <ApprovalStatus data={reportData} />
  if (reportType === 'rfi-aging') return <RfiAging data={reportData} />
  return null
}
